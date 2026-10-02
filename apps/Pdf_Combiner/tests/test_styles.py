"""Tests for the global application stylesheet module (pdf_combiner/ui/styles.py).

Guards two properties of the T4 pure-move:
1. Every required selector/state remains present in APP_STYLESHEET
   (deleting any of them fails the corresponding parametrized test).
2. MainWindow._apply_palette applies exactly this constant — the string the
   window actually uses equals APP_STYLESHEET byte-for-byte.

QT_QPA_PLATFORM=offscreen is set BEFORE importing PyQt6 (same pattern as
tests/test_ui_render.py) so the tests run headless.
"""
from __future__ import annotations

import os
import sys

import pytest

# CRITICAL: set offscreen platform before any PyQt6 import
os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

from PyQt6.QtWidgets import QApplication

from pdf_combiner.ui.main_window import MainWindow
from pdf_combiner.ui.styles import APP_STYLESHEET


# Selectors/states that MUST exist in the global stylesheet.
# (#OutputDirLabel is intentionally absent: it is not part of the original
# stylesheet — the task only requires it "if present in the original".)
REQUIRED_SELECTORS = [
    "QMainWindow",
    "QWidget",
    "QGroupBox",
    "QPushButton",
    "QPushButton:hover",
    "QPushButton:disabled",
    "QListWidget",
    "QLineEdit",
    "QComboBox",
    "QStatusBar",
    "QScrollArea",
    "#PreviewPlaceholder",
]


@pytest.fixture(scope="session")
def qapp() -> QApplication:
    """Session-scoped QApplication (Qt allows only one per process)."""
    app = QApplication.instance()
    if app is None:
        app = QApplication(sys.argv)
    yield app


@pytest.mark.parametrize("selector", REQUIRED_SELECTORS)
def test_required_selector_present(selector: str) -> None:
    """Each required selector/state must appear in APP_STYLESHEET."""
    assert selector in APP_STYLESHEET, (
        f"Required selector {selector!r} missing from APP_STYLESHEET"
    )


def test_main_window_applies_exactly_app_stylesheet(qapp: QApplication) -> None:
    """MainWindow's applied sheet is byte-identical to APP_STYLESHEET."""
    window = MainWindow()
    try:
        assert window.styleSheet() == APP_STYLESHEET, (
            "MainWindow.styleSheet() does not equal styles.APP_STYLESHEET"
        )
    finally:
        window.close()
        qapp.processEvents()


def test_apply_palette_is_the_single_application_point(qapp: QApplication) -> None:
    """_apply_palette alone must (re)apply the global sheet without alteration."""
    window = MainWindow()
    try:
        # Simulate a foreign sheet, then confirm _apply_palette restores ours
        window.setStyleSheet("QMainWindow { background-color: #000000; }")
        assert window.styleSheet() != APP_STYLESHEET
        window._apply_palette()
        assert window.styleSheet() == APP_STYLESHEET
    finally:
        window.close()
        qapp.processEvents()
