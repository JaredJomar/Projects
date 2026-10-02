"""Deterministic tests for Worker and WorkerSignals error/result contract.

These tests verify the structured error payload (WorkerErrorInfo) crosses the
thread boundary correctly and that the UI presentation layer receives exactly
the user-visible message (payload.message) without any traceback leakage.

Synchronization uses QSignalSpy.wait() on the 'finished' signal with a
5000 ms timeout — no time.sleep() polling.
"""
from __future__ import annotations

import sys
from typing import Any

import pytest
from PyQt6.QtCore import QThreadPool, Qt
from PyQt6.QtTest import QSignalSpy
from PyQt6.QtWidgets import QApplication

from pdf_combiner.ui.worker_errors import WorkerErrorInfo
from pdf_combiner.ui.workers import Worker


@pytest.fixture(scope="session")
def qapp() -> QApplication:
    """Create a QApplication instance for the test session."""
    app = QApplication.instance()
    if app is None:
        app = QApplication(sys.argv)
    yield app


def _run_worker_and_wait(worker: Worker, timeout_ms: int = 5000) -> tuple[QSignalSpy, QSignalSpy, QSignalSpy]:
    """Start a worker and wait for its finished signal.

    Returns:
        Tuple of (error_spy, result_spy, finished_spy) after the worker completes.
    """
    error_spy = QSignalSpy(worker.signals.error)
    result_spy = QSignalSpy(worker.signals.result)
    finished_spy = QSignalSpy(worker.signals.finished)

    QThreadPool.globalInstance().start(worker)

    # Wait for finished signal — this is the synchronization point
    assert finished_spy.wait(timeout_ms), f"Worker did not finish within {timeout_ms} ms"

    return error_spy, result_spy, finished_spy


def test_error_payload(qapp: QApplication) -> None:
    """Worker raising RuntimeError emits exactly one error with correct WorkerErrorInfo payload.

    Verifies:
    - error signal emits exactly once
    - payload is a WorkerErrorInfo instance (NOT a live exception)
    - exception_type == "RuntimeError"
    - message == "controlled failure"
    - traceback_text is non-empty and contains "RuntimeError"
    """

    def fail_fn() -> None:
        raise RuntimeError("controlled failure")

    worker = Worker(fail_fn)
    error_spy, result_spy, finished_spy = _run_worker_and_wait(worker)

    # Exactly one error emission
    assert len(error_spy) == 1, f"Expected 1 error emission, got {len(error_spy)}"

    # No result emission on failure
    assert len(result_spy) == 0, f"Expected 0 result emissions on failure, got {len(result_spy)}"

    # Exactly one finished emission
    assert len(finished_spy) == 1, f"Expected 1 finished emission, got {len(finished_spy)}"

    # Unwrap the payload
    payload = error_spy[0][0]
    assert isinstance(payload, WorkerErrorInfo), f"Payload must be WorkerErrorInfo, got {type(payload)}"
    assert not isinstance(payload, BaseException), "Payload must NOT be a live exception object"

    assert payload.exception_type == "RuntimeError"
    assert payload.message == "controlled failure"
    assert payload.traceback_text, "traceback_text must be non-empty"
    assert "RuntimeError" in payload.traceback_text, "traceback_text must contain exception type"
    assert "controlled failure" in payload.traceback_text, "traceback_text must contain exception message"


def test_user_message(qapp: QApplication) -> None:
    """Presentation layer receives payload.message and never traceback_text.

    This test simulates the exact unwrap logic used in main_window.py:
    `lambda payload: _show_error(label, payload.message, progress)`

    Verifies that the presented text equals the original str(exc) and
    contains no traceback markers.
    """

    def fail_fn() -> None:
        raise ValueError("user-visible error with path: C:\\Users\\test\\file.pdf")

    worker = Worker(fail_fn)
    error_spy, _, _ = _run_worker_and_wait(worker)

    assert len(error_spy) == 1
    payload = error_spy[0][0]
    assert isinstance(payload, WorkerErrorInfo)

    # Simulate the presentation unwrap: payload.message
    presented_message = payload.message

    # Must equal the original str(exc)
    assert presented_message == "user-visible error with path: C:\\Users\\test\\file.pdf"

    # Must NOT contain any traceback markers
    assert "Traceback" not in presented_message
    assert "File " not in presented_message
    assert "line " not in presented_message
    assert "raise " not in presented_message

    # traceback_text is diagnostic-only and never shown
    assert payload.traceback_text != presented_message
    assert "Traceback" in payload.traceback_text  # but it IS in the diagnostic field


def test_finished_after_error(qapp: QApplication) -> None:
    """Failing worker emits error exactly once AND finished exactly once.

    Verifies the worker lifecycle on error path:
    error (1x) -> finished (1x), with no result emission.
    """

    def fail_fn() -> None:
        raise KeyError("missing key")

    worker = Worker(fail_fn)
    error_spy, result_spy, finished_spy = _run_worker_and_wait(worker)

    assert len(error_spy) == 1, "error must emit exactly once on failure"
    assert len(result_spy) == 0, "result must not emit on failure"
    assert len(finished_spy) == 1, "finished must emit exactly once on failure"


def test_happy_path(qapp: QApplication) -> None:
    """Successful worker emits result with return value AND finished exactly once.

    Verifies the worker lifecycle on success path:
    result (1x, with return value) -> finished (1x), with zero error emissions.
    """

    def success_fn() -> str:
        return "success-result-42"

    worker = Worker(success_fn)
    error_spy, result_spy, finished_spy = _run_worker_and_wait(worker)

    assert len(error_spy) == 0, "error must not emit on success"
    assert len(result_spy) == 1, "result must emit exactly once on success"
    assert len(finished_spy) == 1, "finished must emit exactly once on success"

    # Verify the result payload
    result_value = result_spy[0][0]
    assert result_value == "success-result-42"