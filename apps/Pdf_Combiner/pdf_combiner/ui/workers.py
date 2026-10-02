from __future__ import annotations

import traceback
from typing import Any, Callable

from PyQt6.QtCore import QObject, QRunnable, pyqtSignal

from pdf_combiner.ui.worker_errors import WorkerErrorInfo


class WorkerSignals(QObject):
    """Signals used to communicate worker progress back to the UI thread."""

    finished = pyqtSignal()
    error = pyqtSignal(object)
    result = pyqtSignal(object)


class Worker(QRunnable):
    """Generic QRunnable wrapper around a callable."""

    def __init__(self, fn: Callable[..., Any], *args: Any, **kwargs: Any) -> None:
        super().__init__()
        self.fn = fn
        self.args = args
        self.kwargs = kwargs
        self.signals = WorkerSignals()

    def run(self) -> None:  # pragma: no cover - executed on background threads
        try:
            result = self.fn(*self.args, **self.kwargs)
        except Exception as exc:  # noqa: BLE001 - surface all errors
            traceback.print_exc()
            self.signals.error.emit(
                WorkerErrorInfo(
                    exception_type=type(exc).__name__,
                    message=str(exc),
                    traceback_text=traceback.format_exc(),
                )
            )
        else:
            self.signals.result.emit(result)
        finally:
            self.signals.finished.emit()
