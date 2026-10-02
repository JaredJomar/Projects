"""Global application stylesheet for PDF Toolkit.

This module is the single source of truth for the app-wide Qt (QSS) stylesheet.
``MainWindow._apply_palette`` applies ``APP_STYLESHEET`` verbatim; no other
module defines or loads styles. The rules below were moved character-for-
character from the former inline literal inside ``MainWindow._apply_palette``
(task T4, pure move) — do not reorder or edit values here without re-capturing
the UI baseline. The string is split across concatenated literals purely so it
can be grouped with short Python comments; the concatenation is byte-identical
to the original literal (see tests/test_styles.py).
"""

# The rules are grouped by widget. NOTE: these are Python comments between
# implicitly concatenated string literals — they do NOT alter the string value.
APP_STYLESHEET = (
    # -- Base: window background & global text color --
    """
            QMainWindow { background-color: #101423; color: #f5f6fb; }
            QWidget { color: #f5f6fb; }"""
    # -- Group boxes --
    """
            QGroupBox {
                border: 1px solid #29324a;
                border-radius: 8px;
                margin-top: 12px;
                padding: 12px;
                font-weight: 600;
            }
            QGroupBox::title { subcontrol-origin: margin; left: 12px; padding: 0 4px; }"""
    # -- Push buttons: default / hover / disabled --
    """
            QPushButton {
                background-color: #2f6fed;
                border: none;
                border-radius: 6px;
                padding: 8px 14px;
                color: #f5f6fb;
                font-weight: 500;
            }
            QPushButton:hover { background-color: #245bd1; }
            QPushButton:disabled { background-color: #1f2940; color: #9aa3c0; }"""
    # -- File list --
    """
            QListWidget {
                background-color: #141a2d;
                border: 1px solid #1f2940;
                border-radius: 6px;
            }"""
    # -- Text inputs & combo boxes --
    """
            QLineEdit, QComboBox {
                background-color: #141a2d;
                border: 1px solid #1f2940;
                border-radius: 6px;
                padding: 6px;
                min-height: 28px;
            }"""
    # -- Status bar --
    """
            QStatusBar {
                background-color: #141a2d;
                border-top: 1px solid #1f2940;
            }"""
    # -- Scroll areas --
    """
            QScrollArea { border: 1px solid #1f2940; border-radius: 6px; }"""
    # -- Preview placeholder label --
    """
            QLabel#PreviewPlaceholder { color: #9aa3c0; }
            """
)
