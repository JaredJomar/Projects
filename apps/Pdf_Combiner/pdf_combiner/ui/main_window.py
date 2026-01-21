from __future__ import annotations

from pathlib import Path
from typing import Iterable, List

from PyQt6.QtCore import QEvent, QSettings, Qt, QThreadPool, QTimer
from PyQt6.QtGui import QFont
from PyQt6.QtWidgets import (
    QAbstractItemView,
    QComboBox,
    QFileDialog,
    QGridLayout,
    QGroupBox,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QListWidgetItem,
    QMainWindow,
    QMessageBox,
    QPushButton,
    QProgressDialog,
    QScrollArea,
    QSplitter,
    QStatusBar,
    QVBoxLayout,
    QWidget,
)

from pdf_combiner.services import pdf_ops
from pdf_combiner.ui.widgets import FileListWidget
from pdf_combiner.ui.preview import PreviewError, render_pdf_page
from pdf_combiner.ui.workers import Worker


class MainWindow(QMainWindow):
    """Main window for the PDF Toolkit application."""

    def __init__(self) -> None:
        super().__init__()
        self.settings = QSettings("PdfCombiner", "PdfToolkit")
        self.thread_pool = QThreadPool.globalInstance()

        self.output_directory: str | None = None
        self.last_directory: str = self.settings.value("paths/last_directory", str(Path.home()))
        self.current_pdf_path: str | None = None
        self.current_page: int = 0
        self.total_pages: int = 0
        self.page_by_file: dict[str, int] = {}

        self._build_ui()
        self._load_state()
        self._connect_signals()
        self._update_preview(clear=True)

    # ------------------------------------------------------------------ UI setup
    def _build_ui(self) -> None:
        self.setWindowTitle("PDF Toolkit")
        self.resize(1080, 720)
        self._apply_palette()

        central = QWidget()
        self.setCentralWidget(central)

        main_layout = QHBoxLayout(central)
        main_layout.setContentsMargins(18, 18, 18, 18)
        main_layout.setSpacing(16)

        splitter = QSplitter(Qt.Orientation.Horizontal)
        splitter.setChildrenCollapsible(False)

        left_panel = self._build_left_panel()
        right_panel = self._build_preview_panel()

        splitter.addWidget(left_panel)
        splitter.addWidget(right_panel)
        splitter.setStretchFactor(0, 0)
        splitter.setStretchFactor(1, 1)
        splitter.setSizes([420, 640])

        main_layout.addWidget(splitter)

        self.status_bar = QStatusBar()
        self.setStatusBar(self.status_bar)
        self.status_bar.showMessage("Ready")

        self.preview_area.viewport().installEventFilter(self)

    def _apply_palette(self) -> None:
        base_font = self.font()
        base_font.setPointSize(10)
        self.setFont(base_font)
        self.setStyleSheet(
            """
            QMainWindow { background-color: #101423; color: #f5f6fb; }
            QWidget { color: #f5f6fb; }
            QGroupBox {
                border: 1px solid #29324a;
                border-radius: 8px;
                margin-top: 12px;
                padding: 12px;
                font-weight: 600;
            }
            QGroupBox::title { subcontrol-origin: margin; left: 12px; padding: 0 4px; }
            QPushButton {
                background-color: #2f6fed;
                border: none;
                border-radius: 6px;
                padding: 8px 14px;
                color: #f5f6fb;
                font-weight: 500;
            }
            QPushButton:hover { background-color: #245bd1; }
            QPushButton:disabled { background-color: #1f2940; color: #9aa3c0; }
            QListWidget {
                background-color: #141a2d;
                border: 1px solid #1f2940;
                border-radius: 6px;
            }
            QLineEdit, QComboBox {
                background-color: #141a2d;
                border: 1px solid #1f2940;
                border-radius: 6px;
                padding: 6px;
                min-height: 28px;
            }
            QStatusBar {
                background-color: #141a2d;
                border-top: 1px solid #1f2940;
            }
            QScrollArea { border: 1px solid #1f2940; border-radius: 6px; }
            QLabel#PreviewPlaceholder { color: #9aa3c0; }
            """
        )

    def _build_left_panel(self) -> QWidget:
        panel = QWidget()
        layout = QVBoxLayout(panel)
        layout.setSpacing(12)
        layout.setContentsMargins(0, 0, 0, 0)

        title = QLabel("PDF Toolkit")
        title_font = QFont(self.font())
        title_font.setPointSize(20)
        title_font.setBold(True)
        title.setFont(title_font)
        layout.addWidget(title)

        layout.addWidget(self._build_file_group())
        layout.addWidget(self._build_operations_group())
        layout.addStretch()
        return panel

    def _build_file_group(self) -> QGroupBox:
        group = QGroupBox("File Selection")
        v_layout = QVBoxLayout(group)
        v_layout.setSpacing(10)

        button_row = QHBoxLayout()
        self.add_files_button = QPushButton("Add PDF Files…")
        self.remove_files_button = QPushButton("Remove Selected")
        self.clear_files_button = QPushButton("Clear List")
        button_row.addWidget(self.add_files_button)
        button_row.addWidget(self.remove_files_button)
        button_row.addWidget(self.clear_files_button)
        v_layout.addLayout(button_row)

        self.file_list = FileListWidget()
        self.file_list.setSelectionMode(QAbstractItemView.SelectionMode.ExtendedSelection)
        self.file_list.setDragDropMode(QAbstractItemView.DragDropMode.InternalMove)
        self.file_list.setAlternatingRowColors(True)
        self.file_list.setMinimumHeight(160)
        v_layout.addWidget(self.file_list)

        order_row = QHBoxLayout()
        self.move_up_button = QPushButton("Move Up")
        self.move_down_button = QPushButton("Move Down")
        self.toggle_checks_button = QPushButton("Check/Uncheck All")
        order_row.addWidget(self.move_up_button)
        order_row.addWidget(self.move_down_button)
        order_row.addWidget(self.toggle_checks_button)
        order_row.addStretch()
        v_layout.addLayout(order_row)

        output_row = QHBoxLayout()
        self.output_dir_button = QPushButton("Choose Output Folder…")
        self.output_dir_label = QLabel("No folder selected")
        self.output_dir_label.setObjectName("OutputDirLabel")
        self.output_dir_label.setWordWrap(True)
        self.output_dir_label.setTextInteractionFlags(Qt.TextInteractionFlag.TextSelectableByMouse)
        output_row.addWidget(self.output_dir_button)
        output_row.addWidget(self.output_dir_label, 1)
        v_layout.addLayout(output_row)

        helper = QLabel("Tip: reorder files with drag and drop or the move buttons.")
        helper.setStyleSheet("color: #9aa3c0;")
        v_layout.addWidget(helper)

        return group

    def _build_operations_group(self) -> QGroupBox:
        group = QGroupBox("Operations")
        grid = QGridLayout(group)
        grid.setHorizontalSpacing(12)
        grid.setVerticalSpacing(10)

        pages_label = QLabel("Pages to extract (e.g. 1,3,5-7):")
        self.pages_input = QLineEdit()
        self.pages_input.setPlaceholderText("1-3, 5")
        self.extract_button = QPushButton("Extract Pages")
        grid.addWidget(pages_label, 0, 0)
        grid.addWidget(self.pages_input, 0, 1)
        grid.addWidget(self.extract_button, 0, 2)

        self.merge_button = QPushButton("Merge Checked PDFs")
        grid.addWidget(self.merge_button, 1, 0, 1, 3)

        split_label = QLabel("Split the current PDF into individual files:")
        self.split_button = QPushButton("Split PDF")
        grid.addWidget(split_label, 2, 0, 1, 2)
        grid.addWidget(self.split_button, 2, 2)

        rotate_label = QLabel("Rotate current PDF (degrees):")
        self.rotation_combo = QComboBox()
        self.rotation_combo.setEditable(True)
        self.rotation_combo.addItems(["90", "180", "270"])
        self.rotate_button = QPushButton("Rotate PDF")
        grid.addWidget(rotate_label, 3, 0)
        grid.addWidget(self.rotation_combo, 3, 1)
        grid.addWidget(self.rotate_button, 3, 2)

        self.compress_button = QPushButton("Compress PDF")
        grid.addWidget(self.compress_button, 4, 0, 1, 3)

        convert_label = QLabel("Convert current PDF to:")
        self.format_combo = QComboBox()
        self.format_combo.addItems(["Word", "Excel", "PowerPoint", "Text"])
        self.convert_button = QPushButton("Convert PDF")
        grid.addWidget(convert_label, 5, 0)
        grid.addWidget(self.format_combo, 5, 1)
        grid.addWidget(self.convert_button, 5, 2)

        return group

    def _build_preview_panel(self) -> QWidget:
        container = QWidget()
        layout = QVBoxLayout(container)
        layout.setSpacing(12)
        layout.setContentsMargins(0, 0, 0, 0)

        self.preview_group = QGroupBox("Preview")
        preview_layout = QVBoxLayout(self.preview_group)
        preview_layout.setSpacing(10)

        self.preview_area = QScrollArea()
        self.preview_area.setWidgetResizable(True)
        self.preview_area.setStyleSheet("background-color: #141a2d;")

        self.preview_label = QLabel("Add a PDF to begin")
        self.preview_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.preview_label.setWordWrap(True)
        self.preview_label.setObjectName("PreviewPlaceholder")
        self.preview_label.setMinimumSize(420, 520)
        self.preview_area.setWidget(self.preview_label)

        preview_layout.addWidget(self.preview_area)

        nav_row = QHBoxLayout()
        self.prev_button = QPushButton("Previous")
        self.page_input = QLineEdit()
        self.page_input.setFixedWidth(60)
        self.page_input.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.page_input.setPlaceholderText("Page")
        self.total_pages_label = QLabel("/ 0")
        self.next_button = QPushButton("Next")

        nav_row.addWidget(self.prev_button)
        nav_row.addStretch()
        nav_row.addWidget(self.page_input)
        nav_row.addWidget(self.total_pages_label)
        nav_row.addStretch()
        nav_row.addWidget(self.next_button)
        preview_layout.addLayout(nav_row)

        layout.addWidget(self.preview_group)
        return container

    def _connect_signals(self) -> None:
        self.add_files_button.clicked.connect(self._add_files)
        self.remove_files_button.clicked.connect(self._remove_selected_files)
        self.clear_files_button.clicked.connect(self._clear_files)
        self.toggle_checks_button.clicked.connect(self._toggle_all_checks)
        self.move_up_button.clicked.connect(self._move_selected_up)
        self.move_down_button.clicked.connect(self._move_selected_down)
        self.output_dir_button.clicked.connect(self._choose_output_directory)

        self.file_list.currentItemChanged.connect(lambda *_: self._on_current_item_changed())
        self.file_list.itemSelectionChanged.connect(self._on_selection_changed)
        self.file_list.itemChanged.connect(self._on_item_changed)
        self.file_list.filesDropped.connect(self._add_files_from_drop)
        self.file_list.model().rowsMoved.connect(self._on_rows_moved)

        self.prev_button.clicked.connect(self._show_previous_page)
        self.next_button.clicked.connect(self._show_next_page)
        self.page_input.returnPressed.connect(self._jump_to_page)

        self.extract_button.clicked.connect(self._extract_pages)
        self.merge_button.clicked.connect(self._merge_checked)
        self.split_button.clicked.connect(self._split_current)
        self.rotate_button.clicked.connect(self._rotate_current)
        self.compress_button.clicked.connect(self._compress_current)
        self.convert_button.clicked.connect(self._convert_current)

    # ------------------------------------------------------------------ state
    def _load_state(self) -> None:
        geometry = self.settings.value("window/geometry")
        if geometry is not None:
            self.restoreGeometry(geometry)

        state = self.settings.value("window/state")
        if state is not None:
            self.restoreState(state)

        output_dir = self.settings.value("paths/output_dir")
        if isinstance(output_dir, str) and output_dir:
            self._set_output_directory(output_dir)

    def closeEvent(self, event) -> None:  # noqa: D401 - Qt override
        self.settings.setValue("window/geometry", self.saveGeometry())
        self.settings.setValue("window/state", self.saveState())
        if self.output_directory:
            self.settings.setValue("paths/output_dir", self.output_directory)
        self.settings.setValue("paths/last_directory", self.last_directory)
        super().closeEvent(event)

    # ------------------------------------------------------------------ helpers
    def eventFilter(self, source, event):  # noqa: D401 - Qt override
        if source is self.preview_area.viewport() and event.type() == QEvent.Type.Resize:
            if self.current_pdf_path:
                QTimer.singleShot(50, self._update_preview)
        return super().eventFilter(source, event)

    def _format_dir_label(self, directory: str) -> str:
        path = Path(directory)
        home = Path.home()
        try:
            text = str(path.relative_to(home))
            return f"~/" + text.replace("\\", "/")
        except ValueError:
            return str(path)

    def _add_files(self) -> None:
        files, _ = QFileDialog.getOpenFileNames(
            self,
            "Select PDF files",
            self.last_directory,
            "PDF Files (*.pdf)",
        )
        if not files:
            return

        added, skipped, last_added = self._add_file_paths(files)
        if added:
            if last_added:
                self.last_directory = str(Path(last_added).parent)
            self.status_bar.showMessage(f"Added {added} PDF file(s)", 4000)
            self._update_preview()
        elif skipped:
            self.status_bar.showMessage(
                "No new PDFs added (duplicates or invalid entries).",
                4000,
            )
    def _add_file_paths(self, file_paths: Iterable[str]) -> tuple[int, int, str | None]:
        added = 0
        skipped = 0
        last_added: str | None = None
        start_row = self.file_list.count()

        self.file_list.blockSignals(True)
        try:
            for raw_path in file_paths:
                if not raw_path:
                    skipped += 1
                    continue
                try:
                    path = Path(raw_path).expanduser().resolve()
                except (OSError, RuntimeError):
                    skipped += 1
                    continue
                if not path.exists() or path.is_dir() or path.suffix.lower() != '.pdf':
                    skipped += 1
                    continue
                normalized = str(path)
                if self._contains_file(normalized):
                    skipped += 1
                    continue
                item = QListWidgetItem(path.name)
                item.setData(Qt.ItemDataRole.UserRole, normalized)
                item.setFlags(
                    item.flags()
                    | Qt.ItemFlag.ItemIsUserCheckable
                    | Qt.ItemFlag.ItemIsDragEnabled
                    | Qt.ItemFlag.ItemIsDropEnabled
                )
                item.setCheckState(Qt.CheckState.Checked)
                self.file_list.addItem(item)
                added += 1
                last_added = normalized
        finally:
            self.file_list.blockSignals(False)

        if added and self.file_list.currentRow() < 0:
            self.file_list.setCurrentRow(start_row)

        return added, skipped, last_added

    def _add_files_from_drop(self, paths: List[str]) -> None:
        added, skipped, last_added = self._add_file_paths(paths)
        if added:
            if last_added:
                self.last_directory = str(Path(last_added).parent)
            self.status_bar.showMessage(
                f"Added {added} PDF file(s) via drag and drop",
                4000,
            )
            self._update_preview()
        elif skipped:
            self.status_bar.showMessage(
                "Dropped files were already listed or not PDFs.",
                4000,
            )

    def _remove_selected_files(self) -> None:
        rows = sorted({index.row() for index in self.file_list.selectedIndexes()}, reverse=True)
        if not rows:
            self.status_bar.showMessage("Select files to remove.", 3000)
            return
        for row in rows:
            item = self.file_list.takeItem(row)
            if item:
                path = item.data(Qt.ItemDataRole.UserRole)
                self.page_by_file.pop(str(path), None)
        self.status_bar.showMessage(f"Removed {len(rows)} file(s)", 4000)
        self._update_preview()

    def _clear_files(self) -> None:
        if self.file_list.count() == 0:
            return
        confirm = QMessageBox.question(
            self,
            "Clear file list",
            "Remove all files from the list?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
            QMessageBox.StandardButton.No,
        )
        if confirm == QMessageBox.StandardButton.Yes:
            self.file_list.clear()
            self.page_by_file.clear()
            self.current_pdf_path = None
            self.current_page = 0
            self.total_pages = 0
            self._update_preview(clear=True)
            self.status_bar.showMessage("File list cleared", 3000)

    def _toggle_all_checks(self) -> None:
        if self.file_list.count() == 0:
            return
        all_checked = all(
            self.file_list.item(i).checkState() == Qt.CheckState.Checked
            for i in range(self.file_list.count())
        )
        new_state = Qt.CheckState.Unchecked if all_checked else Qt.CheckState.Checked
        self.file_list.blockSignals(True)
        for i in range(self.file_list.count()):
            self.file_list.item(i).setCheckState(new_state)
        self.file_list.blockSignals(False)
        action = "Unchecked" if all_checked else "Checked"
        self.status_bar.showMessage(f"{action} all files", 3000)

    def _move_selected_up(self) -> None:
        row = self.file_list.currentRow()
        if row <= 0:
            return
        item = self.file_list.takeItem(row)
        self.file_list.insertItem(row - 1, item)
        self.file_list.setCurrentRow(row - 1)

    def _move_selected_down(self) -> None:
        row = self.file_list.currentRow()
        if row < 0 or row >= self.file_list.count() - 1:
            return
        item = self.file_list.takeItem(row)
        self.file_list.insertItem(row + 1, item)
        self.file_list.setCurrentRow(row + 1)

    def _choose_output_directory(self) -> None:
        selected = QFileDialog.getExistingDirectory(
            self,
            "Select output folder",
            self.output_directory or self.last_directory,
        )
        if selected:
            self._set_output_directory(selected)
            self.status_bar.showMessage(f"Output folder set to {selected}", 4000)

    def _set_output_directory(self, directory: str) -> None:
        self.output_directory = str(Path(directory))
        self.output_dir_label.setText(self._format_dir_label(self.output_directory))
        self.last_directory = self.output_directory

    def _contains_file(self, path: str) -> bool:
        try:
            target = str(Path(path).resolve())
        except (OSError, RuntimeError):
            target = path
        for i in range(self.file_list.count()):
            item = self.file_list.item(i)
            if not item:
                continue
            stored = item.data(Qt.ItemDataRole.UserRole)
            if not stored:
                continue
            try:
                stored_path = str(Path(str(stored)).resolve())
            except (OSError, RuntimeError):
                stored_path = str(stored)
            if stored_path == target:
                return True
        return False
    def _checked_paths(self) -> List[str]:
        paths: List[str] = []
        for i in range(self.file_list.count()):
            item = self.file_list.item(i)
            if item and item.checkState() == Qt.CheckState.Checked:
                path = item.data(Qt.ItemDataRole.UserRole)
                if path:
                    paths.append(str(path))
        return paths

    def _all_paths(self) -> List[str]:
        paths: List[str] = []
        for i in range(self.file_list.count()):
            item = self.file_list.item(i)
            if item:
                path = item.data(Qt.ItemDataRole.UserRole)
                if path:
                    paths.append(str(path))
        return paths

    def _current_item_path(self) -> str | None:
        item = self.file_list.currentItem()
        if item:
            path = item.data(Qt.ItemDataRole.UserRole)
            if path:
                return str(path)
        return None

    def _ensure_output_directory(self) -> bool:
        if self.output_directory:
            return True
        reply = QMessageBox.question(
            self,
            "Output folder required",
            "Select an output folder before running this operation?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
            QMessageBox.StandardButton.Yes,
        )
        if reply == QMessageBox.StandardButton.Yes:
            self._choose_output_directory()
        return self.output_directory is not None

    def _on_current_item_changed(self) -> None:
        path = self._current_item_path()
        if path:
            self.current_pdf_path = path
            self.current_page = self.page_by_file.get(path, 0)
            self._update_preview()
        else:
            self.current_pdf_path = None
            self.current_page = 0
            self.total_pages = 0
            self._update_preview(clear=True)

    def _on_selection_changed(self) -> None:
        count = len(self.file_list.selectedIndexes())
        self.status_bar.showMessage(f"{count} item(s) selected", 3000)

    def _on_item_changed(self, item: QListWidgetItem) -> None:
        state = "Checked" if item.checkState() == Qt.CheckState.Checked else "Unchecked"
        name = item.text()
        self.status_bar.showMessage(f"{state} {name}", 3000)

    def _on_rows_moved(self, *_args) -> None:
        self.status_bar.showMessage("File order updated", 3000)

    # ------------------------------------------------------------------ preview
    def _update_preview(self, clear: bool = False) -> None:
        if clear or not self.current_pdf_path:
            self.preview_label.clear()
            self.preview_label.setText("Add a PDF to begin")
            self.total_pages_label.setText("/ 0")
            self.page_input.clear()
            return

        target_size = self.preview_area.viewport().size()
        try:
            pixmap, total = render_pdf_page(
                self.current_pdf_path,
                page_index=self.current_page,
                target_size=target_size,
            )
        except PreviewError as exc:
            self.preview_label.clear()
            self.preview_label.setText(str(exc))
            self.total_pages = 0
            self.total_pages_label.setText("/ 0")
            return

        self.total_pages = total
        self.page_by_file[self.current_pdf_path] = self.current_page
        self.total_pages_label.setText(f"/ {self.total_pages}")
        self.page_input.setText(str(self.current_page + 1))
        self.preview_label.setPixmap(pixmap)
        self.preview_label.setText("")

    def _jump_to_page(self) -> None:
        if not self.total_pages:
            return
        try:
            page = int(self.page_input.text()) - 1
        except ValueError:
            self.status_bar.showMessage("Enter a valid page number.", 4000)
            return
        if page < 0 or page >= self.total_pages:
            self.status_bar.showMessage(f"Page must be between 1 and {self.total_pages}.", 4000)
            return
        self.current_page = page
        self._update_preview()

    def _show_previous_page(self) -> None:
        if self.current_page > 0:
            self.current_page -= 1
            self._update_preview()

    def _show_next_page(self) -> None:
        if self.total_pages and self.current_page < self.total_pages - 1:
            self.current_page += 1
            self._update_preview()

    # ------------------------------------------------------------------ operations
    def _extract_pages(self) -> None:
        target = self._current_item_path() or (self._checked_paths()[:1][0] if self._checked_paths() else None)
        if not target:
            self.status_bar.showMessage("Select a PDF to extract from.", 4000)
            return
        try:
            pages = pdf_ops.parse_page_ranges(self.pages_input.text())
        except pdf_ops.PdfOperationError as exc:
            self.status_bar.showMessage(str(exc), 5000)
            return
        if not pages:
            self.status_bar.showMessage("Enter at least one page.", 4000)
            return
        if not self._ensure_output_directory():
            return

        def work() -> str:
            return pdf_ops.extract_pages(target, pages, self.output_directory)

        def on_success(result: str) -> None:
            self.status_bar.showMessage(f"Extracted pages to {Path(result).name}", 6000)

        self._run_background("Extracting pages", work, on_success)

    def _merge_checked(self) -> None:
        paths = self._checked_paths()
        if not paths:
            paths = self._all_paths()
        if len(paths) < 2:
            self.status_bar.showMessage("Select at least two PDFs to merge.", 5000)
            return
        if not self._ensure_output_directory():
            return

        def work() -> str:
            return pdf_ops.merge_pdfs(paths, self.output_directory, prefix="merged_selection")

        def on_success(result: str) -> None:
            self.status_bar.showMessage(
                f"Merged {len(paths)} files to {Path(result).name}",
                6000,
            )

        self._run_background("Merging PDFs", work, on_success)

    def _split_current(self) -> None:
        target = self._current_item_path() or (self._checked_paths()[:1][0] if self._checked_paths() else None)
        if not target:
            self.status_bar.showMessage("Select a PDF to split.", 4000)
            return
        if not self._ensure_output_directory():
            return

        def work() -> str:
            return pdf_ops.split_pdf(target, self.output_directory)

        def on_success(result: str) -> None:
            folder = Path(result)
            self.status_bar.showMessage(
                f"Split into {len(list(folder.glob('*.pdf')))} files in {folder.name}",
                6000,
            )

        self._run_background("Splitting PDF", work, on_success)

    def _rotate_current(self) -> None:
        target = self._current_item_path() or (self._checked_paths()[:1][0] if self._checked_paths() else None)
        if not target:
            self.status_bar.showMessage("Select a PDF to rotate.", 4000)
            return
        try:
            rotation = int(self.rotation_combo.currentText())
        except ValueError:
            self.status_bar.showMessage("Enter a rotation value (e.g. 90).", 5000)
            return
        if not self._ensure_output_directory():
            return

        def work() -> str:
            return pdf_ops.rotate_pdf(target, self.output_directory, rotation)

        def on_success(result: str) -> None:
            self.status_bar.showMessage(f"Rotated PDF saved as {Path(result).name}", 6000)

        self._run_background("Rotating PDF", work, on_success)

    def _compress_current(self) -> None:
        target = self._current_item_path() or (self._checked_paths()[:1][0] if self._checked_paths() else None)
        if not target:
            self.status_bar.showMessage("Select a PDF to compress.", 4000)
            return
        if not self._ensure_output_directory():
            return

        def work() -> tuple[str, float]:
            return pdf_ops.compress_pdf(target, self.output_directory)

        def on_success(result: tuple[str, float]) -> None:
            output_path, ratio = result
            self.status_bar.showMessage(
                f"Compressed to {Path(output_path).name} (saved {ratio:.1f}%).",
                6000,
            )

        self._run_background("Compressing PDF", work, on_success)

    def _convert_current(self) -> None:
        target = self._current_item_path() or (self._checked_paths()[:1][0] if self._checked_paths() else None)
        if not target:
            self.status_bar.showMessage("Select a PDF to convert.", 4000)
            return
        if not self._ensure_output_directory():
            return
        format_choice = self.format_combo.currentText().lower()

        def work() -> str:
            return pdf_ops.convert_pdf(target, self.output_directory, format_choice)

        def on_success(result: str) -> None:
            self.status_bar.showMessage(
                f"Converted to {Path(result).name}",
                6000,
            )

        self._run_background(f"Converting to {format_choice.title()}", work, on_success)

    # ------------------------------------------------------------------ async helpers
    def _run_background(self, label: str, function, on_success=None) -> None:
        progress = QProgressDialog(f"{label}…", None, 0, 0, self)
        progress.setWindowTitle("PDF Toolkit")
        progress.setWindowModality(Qt.WindowModality.ApplicationModal)
        progress.setCancelButton(None)
        progress.setMinimumDuration(0)

        worker = Worker(function)

        if on_success:
            worker.signals.result.connect(on_success)
        worker.signals.error.connect(lambda message: self._show_error(label, message, progress))
        worker.signals.finished.connect(lambda: self._finish_progress(progress))

        self.status_bar.showMessage(f"{label}…")
        self.thread_pool.start(worker)

    def _finish_progress(self, dialog: QProgressDialog) -> None:
        dialog.close()
        QTimer.singleShot(0, lambda: self.status_bar.showMessage("Ready", 2000))

    def _show_error(self, title: str, message: str, dialog: QProgressDialog | None = None) -> None:
        if dialog is not None:
            dialog.close()
        QMessageBox.critical(self, title, message)
        self.status_bar.showMessage(message, 6000)
