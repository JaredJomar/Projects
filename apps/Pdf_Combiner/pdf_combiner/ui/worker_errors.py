"""Structured error payload for worker threads.

This module defines the error information that crosses the thread boundary
from background workers to the UI thread. The payload preserves the exact
user-visible error text while adding diagnostic context for debugging.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class WorkerErrorInfo:
    """Immutable error payload emitted by WorkerSignals.error.

    Attributes:
        exception_type: The exception class name (e.g., "RuntimeError").
        message: The raw ``str(exc)`` text — preserves today's user-visible
            error message exactly, including any file paths. NOT sanitized.
        traceback_text: Full traceback from ``traceback.format_exc()``.
            Diagnostic only; NEVER shown to the user.
    """

    exception_type: str
    message: str
    traceback_text: str