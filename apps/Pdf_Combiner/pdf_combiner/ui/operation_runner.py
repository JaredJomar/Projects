"""OperationRunner — centralized worker/progress coordination for background operations.

This module extracts the repeated QProgressDialog + Worker + QThreadPool coordination
from MainWindow into a focused, testable class. MainWindow retains all widget
construction, operation handlers, preconditions, callbacks, and presentation;
OperationRunner owns ONLY:
  - Worker lifecycle (creation, signal connections, thread-pool submission)
  - Progress dialog creation and display
  - Callback dispatch (result → on_success, error → on_error, finished → cleanup)
  - In-flight worker tracking to prevent GC of running QRunnables

Thread pool: The runner NEVER creates its own QThreadPool. The caller passes
QThreadPool.globalInstance() (or a shared pool) at construction time.
"""

from __future__ import annotations

from typing import Any, Callable, Optional

from PyQt6.QtCore import QObject, QThreadPool, Qt
from PyQt6.QtWidgets import QProgressDialog, QWidget

from pdf_combiner.ui.worker_errors import WorkerErrorInfo
from pdf_combiner.ui.workers import Worker


# Type aliases for clarity
SuccessCallback = Callable[[Any], None]
ErrorCallback = Callable[[WorkerErrorInfo], None]
StartCallback = Callable[[str], None]
DialogFactory = Callable[[str, QWidget], QProgressDialog]


def _default_dialog_factory(label: str, parent: QWidget) -> QProgressDialog:
    """Create a progress dialog with the exact properties used by MainWindow."""
    progress = QProgressDialog(f"{label}…", None, 0, 0, parent)
    progress.setWindowTitle("PDF Toolkit")
    progress.setWindowModality(Qt.WindowModality.ApplicationModal)
    progress.setCancelButton(None)
    progress.setMinimumDuration(0)
    return progress


class OperationRunner(QObject):
    """Coordinates background workers with progress dialogs and callback dispatch.

    This class is intentionally narrow: it knows nothing about PDF operations,
    preconditions, or UI presentation beyond the progress dialog. It exists to
    eliminate the duplicated coordination logic that previously lived in
    MainWindow._run_background.

    Attributes:
        _thread_pool: Shared QThreadPool (global instance) for worker execution.
        _parent: Parent widget for dialog ownership.
        _dialog_factory: Callable to create progress dialogs (injectable for tests).
        _in_flight: Set of active Worker instances, retained until finished.
    """

    def __init__(
        self,
        thread_pool: QThreadPool,
        parent: QWidget,
        *,
        dialog_factory: Optional[DialogFactory] = None,
    ) -> None:
        """Initialize the runner.

        Args:
            thread_pool: The QThreadPool to use for worker execution. Must be
                a shared/global instance (e.g., QThreadPool.globalInstance()).
                The runner does NOT create its own pool.
            parent: Parent widget for progress dialog ownership (typically the MainWindow).
            dialog_factory: Optional factory for creating progress dialogs.
                Defaults to _default_dialog_factory which replicates MainWindow's
                exact dialog properties. Injected for unit testing with doubles.
        """
        super().__init__(parent)
        self._thread_pool = thread_pool
        self._parent = parent
        self._dialog_factory = dialog_factory or _default_dialog_factory
        self._in_flight: set[Worker] = set()

    def run(
        self,
        label: str,
        fn: Callable[[], Any],
        on_success: Optional[SuccessCallback] = None,
        on_error: Optional[ErrorCallback] = None,
        on_start: Optional[StartCallback] = None,
    ) -> Worker:
        """Run a background operation with progress dialog and callback dispatch.

        This method creates a Worker for the given callable, sets up a progress
        dialog, connects all signals, and starts the worker on the thread pool.
        The runner retains the worker in _in_flight until the finished signal.

        Args:
            label: Human-readable label for the operation (e.g., "Extracting pages").
                Used for progress dialog text ("{label}…") and status bar messages.
            fn: Zero-argument callable to execute on a background thread.
                Must be thread-safe (no direct UI access).
            on_success: Optional callback invoked with the worker's return value
                when the operation succeeds. Called before finished cleanup.
            on_error: Optional callback invoked with a WorkerErrorInfo payload
                when the operation fails. Called before finished cleanup.
                The payload contains exception_type, message (user-visible),
                and traceback_text (diagnostic only).
            on_start: Optional callback invoked immediately with the label text
                (e.g., to show "{label}…" in the status bar). Called before
                the worker starts.

        Signal ordering (per operation_behavior.md preservation contract):
            SUCCESS: result → on_success → finished → close dialog + release worker → "Ready" status
            ERROR:   error → CLOSE dialog BEFORE on_error → on_error → finished → cleanup (idempotent) → error status (6000ms)
        """
        # Create the progress dialog for this run
        progress = self._dialog_factory(label, self._parent)

        # Create and configure the worker
        worker = Worker(fn)
        self._in_flight.add(worker)

        # Connect result signal
        if on_success is not None:
            worker.signals.result.connect(on_success)

        # Connect error signal with internal dispatcher that closes dialog FIRST
        if on_error is not None:
            def _dispatch_error(payload: WorkerErrorInfo) -> None:
                # Close progress dialog BEFORE any modal presentation (on_error)
                progress.close()
                on_error(payload)

            worker.signals.error.connect(_dispatch_error)

        # Connect finished signal for cleanup
        def _cleanup() -> None:
            # Idempotent: close dialog whether already closed by error path or not
            progress.close()
            # Release worker reference
            self._in_flight.discard(worker)

        worker.signals.finished.connect(_cleanup)

        # Notify start (status bar message)
        if on_start is not None:
            on_start(f"{label}…")

        # Show dialog and start worker
        progress.show()
        self._thread_pool.start(worker)
        return worker

    @property
    def in_flight_count(self) -> int:
        """Return the number of currently running workers."""
        return len(self._in_flight)

    def has_in_flight_workers(self) -> bool:
        """Return True if any workers are still running."""
        return bool(self._in_flight)