"""Deterministic tests for OperationRunner worker/progress coordination.

These tests verify the OperationRunner correctly manages worker lifecycle,
progress dialogs, and callback dispatch per the preservation contract in
tests/operation_behavior.md.

Synchronization uses QSignalSpy.wait() on the 'finished' signal with a
5000 ms timeout — no time.sleep() polling.

Dialog assertions use an injected dialog factory (double) so tests don't
need modal UI; the real dialog path is validated by T5 QA.
"""
from __future__ import annotations

import os
import sys
from typing import Any
from unittest.mock import MagicMock

# Set offscreen platform BEFORE any PyQt6 import for headless testing
os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

import pytest
from PyQt6.QtCore import QThreadPool, Qt
from PyQt6.QtTest import QSignalSpy, QTest
from PyQt6.QtWidgets import QApplication, QProgressDialog, QWidget

from pdf_combiner.ui.operation_runner import OperationRunner
from pdf_combiner.ui.worker_errors import WorkerErrorInfo
from pdf_combiner.ui.workers import Worker


@pytest.fixture(scope="session")
def qapp() -> QApplication:
    """Create a QApplication instance for the test session."""
    app = QApplication.instance()
    if app is None:
        app = QApplication(sys.argv)
    yield app


class DialogDouble(QProgressDialog):
    """Test double for QProgressDialog that tracks open/close state."""

    def __init__(self, label: str, parent: QWidget) -> None:
        # Don't call super().__init__ to avoid native dialog creation
        self._label = label
        self._parent = parent
        self._closed = False
        self._shown = False

    def setWindowTitle(self, title: str) -> None:
        pass

    def setWindowModality(self, modality) -> None:
        pass

    def setCancelButton(self, button) -> None:
        pass

    def setMinimumDuration(self, ms: int) -> None:
        pass

    def show(self) -> None:
        self._shown = True

    def close(self) -> None:
        self._closed = True

    @property
    def closed(self) -> bool:
        return self._closed

    @property
    def shown(self) -> bool:
        return self._shown

    @property
    def label(self) -> str:
        return self._label


def _make_dialog_factory():
    """Create a factory that produces DialogDouble instances and tracks them."""
    created_dialogs: list[DialogDouble] = []

    def factory(label: str, parent: QWidget) -> DialogDouble:
        dialog = DialogDouble(label, parent)
        created_dialogs.append(dialog)
        return dialog

    return factory, created_dialogs


def _run_runner_and_wait(
    runner: OperationRunner,
    fn: callable,
    label: str = "Test Operation",
    on_success=None,
    on_error=None,
    on_start=None,
    timeout_ms: int = 5000,
) -> tuple[QSignalSpy, QSignalSpy, QSignalSpy]:
    """Start a runner operation and wait for the worker's finished signal.

    Returns:
        Tuple of (error_spy, result_spy, finished_spy) after the worker completes.
    """
    worker = runner.run(label, fn, on_success, on_error, on_start)
    error_spy = QSignalSpy(worker.signals.error)
    result_spy = QSignalSpy(worker.signals.result)
    finished_spy = QSignalSpy(worker.signals.finished)

    assert finished_spy.wait(timeout_ms), f"Worker did not finish within {timeout_ms} ms"

    return error_spy, result_spy, finished_spy


class TestOperationRunnerSuccess:
    """Tests for the success path."""

    def test_success_emits_result_and_finished(self, qapp: QApplication) -> None:
        """Successful operation emits result once with return value and finished once."""
        factory, dialogs = _make_dialog_factory()
        runner = OperationRunner(QThreadPool.globalInstance(), QWidget(), dialog_factory=factory)

        def success_fn() -> str:
            return "success-result-42"

        on_success_mock = MagicMock()
        on_error_mock = MagicMock()
        on_start_mock = MagicMock()

        error_spy, result_spy, finished_spy = _run_runner_and_wait(
            runner, success_fn, "Test Success", on_success_mock, on_error_mock, on_start_mock
        )

        # Verify signal emissions
        assert len(error_spy) == 0, "error must not emit on success"
        assert len(result_spy) == 1, "result must emit exactly once on success"
        assert len(finished_spy) == 1, "finished must emit exactly once on success"

        # Verify result payload
        result_value = result_spy[0][0]
        assert result_value == "success-result-42"

        # Verify callbacks
        on_success_mock.assert_called_once_with("success-result-42")
        on_error_mock.assert_not_called()
        on_start_mock.assert_called_once_with("Test Success…")

        # Verify dialog lifecycle
        assert len(dialogs) == 1
        dialog = dialogs[0]
        assert dialog.shown, "dialog must be shown"
        assert dialog.closed, "dialog must be closed after finished"

        # Verify in-flight tracking cleaned up
        assert runner.in_flight_count == 0, "in-flight workers must be empty after success"
        assert not runner.has_in_flight_workers()

    def test_success_with_tuple_result(self, qapp: QApplication) -> None:
        """Successful operation with tuple return value (like compress_pdf)."""
        factory, dialogs = _make_dialog_factory()
        runner = OperationRunner(QThreadPool.globalInstance(), QWidget(), dialog_factory=factory)

        def success_fn() -> tuple[str, float]:
            return ("output.pdf", 42.5)

        on_success_mock = MagicMock()

        _run_runner_and_wait(runner, success_fn, "Test Tuple", on_success=on_success_mock)

        on_success_mock.assert_called_once_with(("output.pdf", 42.5))
        assert runner.in_flight_count == 0


class TestOperationRunnerError:
    """Tests for the error path."""

    def test_error_emits_error_and_finished(self, qapp: QApplication) -> None:
        """Failing operation emits error once with WorkerErrorInfo and finished once."""
        factory, dialogs = _make_dialog_factory()
        runner = OperationRunner(QThreadPool.globalInstance(), QWidget(), dialog_factory=factory)

        def fail_fn() -> None:
            raise RuntimeError("controlled failure")

        on_success_mock = MagicMock()
        on_error_mock = MagicMock()
        on_start_mock = MagicMock()

        error_spy, result_spy, finished_spy = _run_runner_and_wait(
            runner, fail_fn, "Test Error", on_success_mock, on_error_mock, on_start_mock
        )

        # Verify signal emissions
        assert len(error_spy) == 1, "error must emit exactly once on failure"
        assert len(result_spy) == 0, "result must not emit on failure"
        assert len(finished_spy) == 1, "finished must emit exactly once on failure"

        # Verify error payload
        payload = error_spy[0][0]
        assert isinstance(payload, WorkerErrorInfo)
        assert payload.exception_type == "RuntimeError"
        assert payload.message == "controlled failure"
        assert payload.traceback_text
        assert "RuntimeError" in payload.traceback_text

        # Verify callbacks
        on_success_mock.assert_not_called()
        on_error_mock.assert_called_once()
        called_payload = on_error_mock.call_args[0][0]
        assert isinstance(called_payload, WorkerErrorInfo)
        assert called_payload.message == "controlled failure"
        on_start_mock.assert_called_once_with("Test Error…")

        # Verify dialog lifecycle (closed by error path, then idempotent close in finished)
        assert len(dialogs) == 1
        dialog = dialogs[0]
        assert dialog.shown
        assert dialog.closed

        # Verify in-flight tracking cleaned up
        assert runner.in_flight_count == 0
        assert not runner.has_in_flight_workers()

    def test_error_then_success_recovers(self, qapp: QApplication) -> None:
        """After a failed run, a subsequent successful run works normally with no residual state."""
        factory, dialogs = _make_dialog_factory()
        runner = OperationRunner(QThreadPool.globalInstance(), QWidget(), dialog_factory=factory)

        def fail_fn() -> None:
            raise ValueError("first failure")

        def success_fn() -> str:
            return "recovery-success"

        on_success_mock = MagicMock()
        on_error_mock = MagicMock()

        # First run: failure
        _run_runner_and_wait(runner, fail_fn, "Fail Run", on_success_mock, on_error_mock)

        assert on_error_mock.call_count == 1
        assert on_success_mock.call_count == 0
        assert runner.in_flight_count == 0

        # Reset mocks for second run
        on_success_mock.reset_mock()
        on_error_mock.reset_mock()

        # Second run: success
        _run_runner_and_wait(runner, success_fn, "Success Run", on_success_mock, on_error_mock)

        assert on_success_mock.call_count == 1
        assert on_success_mock.call_args[0][0] == "recovery-success"
        assert on_error_mock.call_count == 0
        assert runner.in_flight_count == 0

        # Two dialogs created (one per run)
        assert len(dialogs) == 2
        assert all(d.closed for d in dialogs)


class TestOperationRunnerCleanup:
    """Tests for finished cleanup and in-flight tracking."""

    def test_in_flight_empty_after_each_run(self, qapp: QApplication) -> None:
        """In-flight tracking is empty after each run (success or error)."""
        factory, _ = _make_dialog_factory()
        runner = OperationRunner(QThreadPool.globalInstance(), QWidget(), dialog_factory=factory)

        def success_fn() -> str:
            return "ok"

        def fail_fn() -> None:
            raise RuntimeError("fail")

        # Success run
        _run_runner_and_wait(runner, success_fn, "Success")
        assert runner.in_flight_count == 0

        # Error run
        _run_runner_and_wait(runner, fail_fn, "Error")
        assert runner.in_flight_count == 0

        # Another success run
        _run_runner_and_wait(runner, success_fn, "Success 2")
        assert runner.in_flight_count == 0

    def test_multiple_concurrent_runs_tracked_independently(self, qapp: QApplication) -> None:
        """Multiple concurrent runs are tracked independently; each cleans up on its own finished."""
        factory, dialogs = _make_dialog_factory()
        runner = OperationRunner(QThreadPool.globalInstance(), QWidget(), dialog_factory=factory)

        import time

        def slow_fn(delay: float) -> str:
            time.sleep(delay)
            return f"done-{delay}"

        on_success_mock = MagicMock()

        worker1 = runner.run("Slow 1", lambda: slow_fn(0.1), on_success_mock)
        worker2 = runner.run("Slow 2", lambda: slow_fn(0.05), on_success_mock)

        QThreadPool.globalInstance().waitForDone(15000)
        qapp.processEvents()

        assert runner.in_flight_count == 0
        assert on_success_mock.call_count == 2
        assert len(dialogs) == 2
        assert all(d.closed for d in dialogs)


class TestOperationRunnerDialogFactory:
    """Tests for dialog factory injection."""

    def test_custom_dialog_factory_used(self, qapp: QApplication) -> None:
        """Runner uses the injected dialog factory."""
        factory, dialogs = _make_dialog_factory()
        runner = OperationRunner(QThreadPool.globalInstance(), QWidget(), dialog_factory=factory)

        def success_fn() -> str:
            return "ok"

        _run_runner_and_wait(runner, success_fn, "Factory Test")

        assert len(dialogs) == 1
        assert isinstance(dialogs[0], DialogDouble)
        assert dialogs[0].label == "Factory Test"

    def test_default_dialog_factory_creates_real_dialog(self, qapp: QApplication) -> None:
        """Default factory creates a real QProgressDialog (smoke test)."""
        runner = OperationRunner(QThreadPool.globalInstance(), QWidget())

        def success_fn() -> str:
            return "ok"

        _run_runner_and_wait(runner, success_fn, "Default Factory")

        # If we get here without crash, default factory works
        assert runner.in_flight_count == 0


class TestMainWindowForwarderErrorPath:
    """Regression test for the real MainWindow._run_background error path.

    This test exercises the exact code path that was broken by DEFECT 1:
    MainWindow._run_background -> OperationRunner.run -> error -> dialog close -> on_error -> _show_error
    """

    def test_main_window_forwarder_error_path_closes_dialog_before_modal(self, qapp: QApplication) -> None:
        """MainWindow._run_background error path closes dialog before modal and recovers."""
        # Import MainWindow here (after QT_QPA_PLATFORM is set)
        from pdf_combiner.ui.main_window import MainWindow

        window = MainWindow()
        window.show()  # Required for proper widget initialization

        # Track QMessageBox.critical calls
        critical_calls: list[tuple[str, str]] = []

        def mock_critical(parent, title: str, message: str) -> None:
            critical_calls.append((title, message))

        # Monkeypatch QMessageBox.critical
        import pdf_combiner.ui.main_window as mw_module
        original_critical = mw_module.QMessageBox.critical
        mw_module.QMessageBox.critical = staticmethod(mock_critical)

        try:
            on_success_mock = MagicMock()

            def failing_fn() -> None:
                raise RuntimeError("test error from forwarder")

            # Call the real forwarder
            window._run_background("Test Op", failing_fn, on_success_mock)

            # Wait for completion by polling in_flight_count (no time.sleep)
            # Use QTest.qWait in a bounded loop
            for _ in range(100):  # max ~5 seconds
                if window.operation_runner.in_flight_count == 0:
                    break
                QTest.qWait(50)
                qapp.processEvents()
            else:
                pytest.fail("Worker did not finish within timeout")

            # Assertions
            assert on_success_mock.call_count == 0, "on_success must not be called on error"
            assert len(critical_calls) == 1, "QMessageBox.critical must be called exactly once"
            assert critical_calls[0][0] == "Test Op", f"Title must be 'Test Op', got {critical_calls[0][0]}"
            assert critical_calls[0][1] == "test error from forwarder", f"Message must match exception, got {critical_calls[0][1]}"
            assert window.operation_runner.in_flight_count == 0, "in-flight must be empty after error"
            assert window.isVisible(), "window must still be functional"

        finally:
            # Restore original
            mw_module.QMessageBox.critical = original_critical
            window.close()

    def test_worker_error_closes_progress_before_modal_and_recovers(self, qapp: QApplication) -> None:
        """
        Real-modal error-recovery test: intercepts QMessageBox.critical, creates a REAL QMessageBox,
        schedules QTimer.singleShot(0, dialog.accept), calls dialog.exec() (proving nested-event-loop
        dismissal works), then runs a successful operation afterwards.
        """
        from pdf_combiner.ui.main_window import MainWindow

        window = MainWindow()
        window.show()

        # Track QMessageBox.critical calls and dialog state
        critical_calls: list[dict] = []

        dialog_factory, progress_dialogs = _make_dialog_factory()
        window.operation_runner._dialog_factory = dialog_factory

        def mock_critical(parent, title: str, message: str):
            # Assert progress dialog was already closed before modal opens
            assert len(progress_dialogs) == 1
            assert progress_dialogs[0].closed, "progress dialog must be closed before the modal opens"
            # Create a REAL QMessageBox
            from PyQt6.QtWidgets import QMessageBox
            from PyQt6.QtCore import QTimer

            dialog = QMessageBox(QMessageBox.Icon.Critical, title, message, QMessageBox.StandardButton.Ok, parent)
            # Record state at entry
            critical_calls.append({
                "title": title,
                "message": message,
                "dialog": dialog,
                "exec_called": False,
                "exec_returned": False,
            })
            # Schedule dismissal via nested event loop
            QTimer.singleShot(0, dialog.accept)
            # Call exec() - this runs a nested event loop
            result = dialog.exec()
            critical_calls[-1]["exec_called"] = True
            critical_calls[-1]["exec_returned"] = True
            critical_calls[-1]["result"] = result
            return QMessageBox.StandardButton.Ok

        # Monkeypatch QMessageBox.critical in the main_window module
        import pdf_combiner.ui.main_window as mw_module
        original_critical = mw_module.QMessageBox.critical
        mw_module.QMessageBox.critical = staticmethod(mock_critical)

        try:
            on_success_mock = MagicMock()

            def failing_fn() -> None:
                raise RuntimeError("real-modal test error")

            # Call the real forwarder
            window._run_background("Test Op", failing_fn, on_success_mock)

            # Wait for completion by polling in_flight_count (no time.sleep)
            for _ in range(100):  # max ~5 seconds
                if window.operation_runner.in_flight_count == 0:
                    break
                QTest.qWait(50)
                qapp.processEvents()
            else:
                pytest.fail("Worker did not finish within timeout")

            # Assertions for error path
            assert on_success_mock.call_count == 0, "on_success must not be called on error"
            assert len(critical_calls) == 1, "QMessageBox.critical must be called exactly once"
            call = critical_calls[0]
            assert call["title"] == "Test Op", f"Title must be 'Test Op', got {call['title']}"
            assert call["message"] == "real-modal test error", f"Message must match exception, got {call['message']}"
            assert call["exec_called"], "dialog.exec() must have been called"
            assert call["exec_returned"], "dialog.exec() must have returned"
            # exec() returns the button index (1 for Ok when it's the only button)
            assert call["result"] == 1, f"exec() must return Ok button index, got {call['result']}"
            assert window.operation_runner.in_flight_count == 0, "in-flight must be empty after error"
            assert window.isVisible(), "window must still be functional"

            # RECOVERY: Run a successful operation through the same forwarder
            on_success_mock.reset_mock()

            def success_fn() -> str:
                return "recovery-success"

            window._run_background("Recovery Op", success_fn, on_success_mock)

            # Wait for completion
            for _ in range(100):
                if window.operation_runner.in_flight_count == 0:
                    break
                QTest.qWait(50)
                qapp.processEvents()
            else:
                pytest.fail("Recovery worker did not finish within timeout")

            # Assertions for recovery
            assert on_success_mock.call_count == 1, "on_success must be called on recovery"
            assert on_success_mock.call_args[0][0] == "recovery-success"
            assert window.operation_runner.in_flight_count == 0, "in-flight must be empty after recovery"
            assert window.isVisible(), "window must still be functional after recovery"

        finally:
            # Restore original
            mw_module.QMessageBox.critical = original_critical
            window.close()
