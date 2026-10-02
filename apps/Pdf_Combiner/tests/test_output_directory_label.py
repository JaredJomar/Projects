"""Deterministic offscreen tests for the output-directory label (task T6).

The long output path must never wrap: the label stays on a single line, its
visible text is elided with a centered ellipsis to the width the layout gives
it, the tooltip and ``output_directory`` keep the full path, and the text
recomputes on folder selection/restoration and on label width changes without
touching operation state.

QT_QPA_PLATFORM=offscreen is set BEFORE importing PyQt6 (same pattern as
tests/test_ui_render.py) so the tests run headless.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

# CRITICAL: Set offscreen platform BEFORE importing PyQt6
os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

from PyQt6.QtCore import QSettings
from PyQt6.QtWidgets import QApplication

from pdf_combiner.ui.main_window import MainWindow

# OneDrive-like nested Windows path, as in the user's screenshot
LONG_PATH = (
    r"C:\Users\Jared\OneDrive - Contoso Corporation\Documents\Projects"
    r"\ProjectsHub\apps\Pdf_Combiner\output\merged\final\deliverables"
)
SHORT_PATH = r"C:\Out"


@pytest.fixture(scope="session")
def qapp() -> QApplication:
    """Session-scoped QApplication (Qt allows only one per process)."""
    app = QApplication.instance()
    if app is None:
        app = QApplication(sys.argv)
    yield app


@pytest.fixture
def isolated_output_setting():
    """Remove any persisted output folder for the duration of one test.

    MainWindow restores ``paths/output_dir`` from QSettings in ``_load_state``
    and persists it in ``closeEvent``; isolating the key keeps every test
    deterministic and restores the developer's real value afterwards.
    """
    settings = QSettings("PdfCombiner", "PdfToolkit")
    had_key = settings.contains("paths/output_dir")
    saved = settings.value("paths/output_dir") if had_key else None
    settings.remove("paths/output_dir")
    yield
    settings.remove("paths/output_dir")
    if had_key and saved is not None:
        settings.setValue("paths/output_dir", saved)


def _show(window: MainWindow, qapp: QApplication) -> None:
    window.resize(1080, 720)
    window.show()
    qapp.processEvents()
    qapp.processEvents()


def test_empty_state_has_no_path_tooltip(qapp, isolated_output_setting) -> None:
    window = MainWindow()
    _show(window, qapp)
    label = window.output_dir_label

    assert window.output_directory is None
    assert label.text() == "No folder selected"
    assert label.toolTip() == ""
    assert not label.wordWrap()

    window.close()
    qapp.processEvents()


def test_short_path_shown_unmodified_with_full_tooltip(qapp, isolated_output_setting) -> None:
    window = MainWindow()
    _show(window, qapp)
    label = window.output_dir_label

    window._set_output_directory(SHORT_PATH)
    qapp.processEvents()

    assert window.output_directory == str(Path(SHORT_PATH))
    assert label.text() == window._format_dir_label(window.output_directory)
    assert "…" not in label.text()
    assert label.toolTip() == window.output_directory

    window.close()
    qapp.processEvents()


def test_long_path_elided_single_line_with_full_tooltip(qapp, isolated_output_setting) -> None:
    window = MainWindow()
    _show(window, qapp)
    label = window.output_dir_label
    height_before = label.height()

    window._set_output_directory(LONG_PATH)
    qapp.processEvents()

    # Full path preserved for operations; only the label text is shortened
    assert window.output_directory == str(Path(LONG_PATH))
    assert label.toolTip() == str(Path(LONG_PATH))

    # One visible line with a centered ellipsis
    assert not label.wordWrap()
    assert "…" in label.text()
    full = window._format_dir_label(window.output_directory)
    assert len(label.text()) < len(full)
    metrics = label.fontMetrics()
    assert metrics.horizontalAdvance(label.text()) <= label.width()
    assert label.height() <= height_before + 1

    # The row stays inside its group box (header not pushed wider/taller)
    container = label.parentWidget()
    assert label.x() + label.width() <= container.width() + 1

    window.close()
    qapp.processEvents()


def test_label_width_change_recomputes_text_without_touching_state(qapp, isolated_output_setting) -> None:
    window = MainWindow()
    _show(window, qapp)
    label = window.output_dir_label
    window._set_output_directory(LONG_PATH)
    qapp.processEvents()

    wide_text = label.text()
    metrics = label.fontMetrics()

    # Narrower geometry -> the label's Resize event re-elides synchronously
    label.resize(240, label.height())
    narrow_text = label.text()
    assert narrow_text != wide_text
    assert "…" in narrow_text
    assert metrics.horizontalAdvance(narrow_text) <= label.width()
    assert len(narrow_text) < len(wide_text)

    # Layout pass restores the real geometry -> text elides back to it
    qapp.processEvents()
    restored_text = label.text()
    assert metrics.horizontalAdvance(restored_text) <= label.width()
    assert len(restored_text) > len(narrow_text)

    # State untouched throughout
    assert window.output_directory == str(Path(LONG_PATH))
    assert label.toolTip() == str(Path(LONG_PATH))

    window.close()
    qapp.processEvents()


def test_restored_long_path_elides_and_keeps_window_width(qapp, isolated_output_setting) -> None:
    settings = QSettings("PdfCombiner", "PdfToolkit")
    settings.setValue("paths/output_dir", LONG_PATH)

    window = MainWindow()
    _show(window, qapp)
    label = window.output_dir_label

    assert window.output_directory == str(Path(LONG_PATH))
    assert label.toolTip() == str(Path(LONG_PATH))
    assert "…" in label.text()
    assert not label.wordWrap()
    assert label.height() <= label.fontMetrics().height() + 2
    restored_width = window.width()

    window.close()
    qapp.processEvents()

    # A window without a restored folder must resolve to the same width:
    # the long path may not inflate the window's minimum size.
    settings.remove("paths/output_dir")
    control = MainWindow()
    _show(control, qapp)
    assert control.output_directory is None
    control_width = control.width()
    control.close()
    qapp.processEvents()

    assert control_width == restored_width


def test_set_output_directory_and_close_persist_full_path(qapp, isolated_output_setting) -> None:
    settings = QSettings("PdfCombiner", "PdfToolkit")
    window = MainWindow()
    _show(window, qapp)

    window._set_output_directory(LONG_PATH)
    qapp.processEvents()
    stored_before_close = window.output_directory
    window.close()
    qapp.processEvents()

    # closeEvent must persist the FULL path, never the elided label text
    assert stored_before_close == str(Path(LONG_PATH))
    assert settings.value("paths/output_dir") == str(Path(LONG_PATH))


def test_capture_t6_output_directory(qapp, isolated_output_setting, render_t6, t6_path, save_render_image) -> None:
    """Render the long-path state to the fixed T6 evidence PNG when asked."""
    if not render_t6:
        pytest.skip("T6 render only runs with --render-t6")

    window = MainWindow()
    _show(window, qapp)
    window._set_output_directory(LONG_PATH)
    qapp.processEvents()
    qapp.processEvents()

    label = window.output_dir_label
    assert "…" in label.text(), "long path must be visibly elided in the capture"
    assert label.height() <= label.fontMetrics().height() + 2, "label must stay one line"

    pixmap = window.grab()
    image = pixmap.toImage()
    assert not image.isNull(), "Failed to grab window - image is null"
    assert image.width() > 0 and image.height() > 0

    save_render_image(image, t6_path)
    print(f"Saved T6 UI render to: {t6_path}")

    window.close()
    qapp.processEvents()
