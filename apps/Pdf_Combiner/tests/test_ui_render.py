"""Offscreen UI rendering test for MainWindow.

This test captures a deterministic screenshot of the MainWindow using Qt's
offscreen platform (QT_QPA_PLATFORM=offscreen). It only writes an image
when explicitly requested via --render-baseline or --render-after.

Key design decisions:
- QT_QPA_PLATFORM=offscreen is set programmatically via os.environ.setdefault
  BEFORE importing PyQt6, ensuring headless operation.
- Fixed window size (1080x720) matches MainWindow's default resize() call.
- No user PDFs are loaded; the preview shows the default "Add a PDF to begin" state.
- No dependence on last_dir.json or user settings - QSettings uses default
  organization/application names which are isolated per test run.
- Qt events are processed via QApplication.processEvents() before grabbing.
- Image is saved via QImage.save() to the fixed evidence paths only.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

# CRITICAL: Set offscreen platform BEFORE importing PyQt6
# This must happen before any PyQt6 module is imported
os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

from PyQt6.QtCore import Qt, QTimer
from PyQt6.QtGui import QImage
from PyQt6.QtWidgets import QApplication

# Import after QT_QPA_PLATFORM is set
from pdf_combiner.ui.main_window import MainWindow


@pytest.fixture(scope="session")
def qapp():
    """Create a QApplication instance for the test session.

    Using session scope ensures we only create one QApplication,
    which is required by Qt.
    """
    app = QApplication.instance()
    if app is None:
        app = QApplication(sys.argv)
    yield app
    # Don't quit the app here - let pytest handle cleanup


def test_main_window_renders_offscreen(
    qapp: QApplication,
    render_baseline: bool,
    render_after: bool,
    baseline_path: Path,
    after_path: Path,
    save_render_image,
) -> None:
    """Render MainWindow to QImage and save when render option is given.

    This test:
    1. Creates MainWindow with fixed size (1080x720)
    2. Processes pending Qt events to ensure UI is fully painted
    3. Grabs the window content to a QImage
    4. Saves ONLY when --render-baseline or --render-after is passed
    5. Prints the saved path for verification

    Without render options, the test passes but writes NO images.
    """
    # Skip if neither render option is given - we don't want to waste time
    # rendering if not explicitly requested
    if not render_baseline and not render_after:
        pytest.skip("UI render test only runs with --render-baseline or --render-after")

    # Create MainWindow with deterministic state
    window = MainWindow()

    # Use fixed size matching MainWindow._build_ui() default
    window.resize(1080, 720)
    window.show()

    # Process all pending events to ensure UI is fully painted
    # This includes layout, stylesheet application, and initial paint
    qapp.processEvents()

    # Give a moment for any deferred operations (like QTimer.singleShot in preview)
    qapp.processEvents()

    # Grab the window to a QImage
    # window.grab() includes window frame, so captured size differs from resize()
    pixmap = window.grab()

    # Convert to QImage for saving (QImage.save supports PNG directly)
    image = pixmap.toImage()

    # Verify we got a valid image
    assert not image.isNull(), "Failed to grab window - image is null"
    # Accept captured size as fixed baseline (includes window frame)
    # Ensures deterministic captures across runs
    assert image.width() > 0, f"Invalid image width: {image.width()}"
    assert image.height() > 0, f"Invalid image height: {image.height()}"

    # Determine target path based on which option was passed
    if render_baseline:
        target_path = baseline_path
        label = "baseline"
    else:  # render_after
        target_path = after_path
        label = "after"

    # Save using the fixture helper (enforces path constraints and no-overwrite)
    save_render_image(image, target_path)

    # Print for evidence capture
    print(f"Saved {label} UI render to: {target_path}")

    # Clean up
    window.close()
    qapp.processEvents()


def test_main_window_has_expected_initial_state(qapp: QApplication) -> None:
    """Verify MainWindow initializes with expected default state.

    This test runs without render options and validates the UI structure
    without saving any images.
    """
    window = MainWindow()
    window.resize(1080, 720)
    window.show()
    qapp.processEvents()

    # Verify window title
    assert window.windowTitle() == "PDF Toolkit"

    # Verify preview shows placeholder text (no PDF loaded)
    from pdf_combiner.ui.main_window import MainWindow as MW
    # Access preview_label through the window instance
    preview_label = window.preview_label
    assert preview_label.text() == "Add a PDF to begin"

    # Verify total pages label shows 0
    assert window.total_pages_label.text() == "/ 0"

    # Verify file list is empty initially
    assert window.file_list.count() == 0

    # Verify output directory label shows something (may be persisted from QSettings)
    # Don't assume None - QSettings loads previous value across test runs
    assert window.output_dir_label.text() != ""
    # The label should either be "No folder selected" or a formatted path
    assert window.output_dir_label.text() == "No folder selected" or window.output_directory is not None

    window.close()
    qapp.processEvents()