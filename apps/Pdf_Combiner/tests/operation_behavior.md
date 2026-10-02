# Operation Behavior Matrix

This document records the exact behavior of the six operation handlers in
`pdf_combiner/ui/main_window.py` (lines ~650-801). This matrix serves as the
**preservation contract** for all subsequent refactoring tasks (T2-T5).

Each handler follows the same pattern:
1. Validate preconditions / gather input
2. Call `_ensure_output_directory()` if output is needed
3. Define a `work()` callable that invokes a `pdf_ops` function
4. Define an `on_success(result)` callback
5. Call `_run_background(label, work, on_success)`

The `_run_background` method (lines 777-792) sets up a `QProgressDialog`,
creates a `Worker`, connects signals, and starts the worker on the global
`QThreadPool`.

---

## 1. `_extract_pages` (lines 650-672)

**Handler name**: `_extract_pages`
**Line range**: 650-672
**pdf_ops function**: `pdf_ops.extract_pages`

### Preconditions / Invalid Input Handling
- **Target selection** (line 651): Uses `_current_item_path()` OR first checked path (`_checked_paths()[:1][0]`). If neither exists, shows status bar message "Select a PDF to extract from." (4000ms) and returns.
- **Page range parsing** (lines 655-659): Calls `pdf_ops.parse_page_ranges(self.pages_input.text())`. On `PdfOperationError`, shows error message in status bar (5000ms) and returns.
- **Empty pages** (lines 660-662): If parsed pages list is empty, shows "Enter at least one page." (4000ms) and returns.
- **Output directory** (lines 663-664): Calls `_ensure_output_directory()`. If user cancels, returns early.

### Background Work Callable
```python
def work() -> str:
    return pdf_ops.extract_pages(target, pages, self.output_directory)
```
- **Input**: `target` (str path), `pages` (List[int]), `self.output_directory` (str)
- **Returns**: Output file path (str)

### Progress Dialog Setup (`_run_background`)
- **Label**: "Extracting pages…"
- **Window title**: "PDF Toolkit"
- **Modality**: `Qt.WindowModality.ApplicationModal`
- **Cancel button**: None (set to `None`)
- **Minimum duration**: 0 (shows immediately)
- **Status bar**: Shows "Extracting pages…" immediately

### Success Callback (`on_success`)
```python
def on_success(result: str) -> None:
    self.status_bar.showMessage(f"Extracted pages to {Path(result).name}", 6000)
```
- Shows success message with output filename for 6000ms

### Failure Presentation
- Worker error signal → `_show_error("Extracting pages", message, progress)`
- `_show_error` (lines 798-801):
  1. Closes progress dialog if provided
  2. Shows `QMessageBox.critical(self, title, message)`
  3. Shows error message in status bar (6000ms)
- **No "Ready" status** after error (the error message persists)

### Cleanup
- `worker.signals.finished.connect(lambda: self._finish_progress(progress))`
- `_finish_progress` (lines 794-796): Closes dialog, then `QTimer.singleShot(0, lambda: self.status_bar.showMessage("Ready", 2000))`
- **Note**: On error path, `_show_error` closes dialog first, then `_finish_progress` runs and would show "Ready" after 2000ms — but `_show_error` sets a 6000ms status message which overrides this.

---

## 2. `_merge_checked` (lines 674-693)

**Handler name**: `_merge_checked`
**Line range**: 674-693
**pdf_ops function**: `pdf_ops.merge_pdfs`

### Preconditions / Invalid Input Handling
- **Paths selection** (lines 675-677): Uses `_checked_paths()`. If empty, falls back to `_all_paths()`.
- **Minimum count** (lines 678-680): Requires at least 2 paths. If fewer, shows "Select at least two PDFs to merge." (5000ms) and returns.
- **Output directory** (lines 681-682): Calls `_ensure_output_directory()`. If user cancels, returns early.

### Background Work Callable
```python
def work() -> str:
    return pdf_ops.merge_pdfs(paths, self.output_directory, prefix="merged_selection")
```
- **Input**: `paths` (List[str]), `self.output_directory` (str), `prefix="merged_selection"`
- **Returns**: Output file path (str)

### Progress Dialog Setup
- **Label**: "Merging PDFs…"
- **Window title**: "PDF Toolkit"
- **Modality**: `ApplicationModal`
- **Cancel button**: None
- **Minimum duration**: 0
- **Status bar**: Shows "Merging PDFs…" immediately

### Success Callback
```python
def on_success(result: str) -> None:
    self.status_bar.showMessage(
        f"Merged {len(paths)} files to {Path(result).name}",
        6000,
    )
```
- Shows success message with count and output filename for 6000ms

### Failure Presentation
- Same as `_extract_pages`: `_show_error("Merging PDFs", message, progress)`
- `QMessageBox.critical` with title "Merging PDFs"
- Status bar shows error for 6000ms

### Cleanup
- Same `_finish_progress` behavior

---

## 3. `_split_current` (lines 695-713)

**Handler name**: `_split_current`
**Line range**: 695-713
**pdf_ops function**: `pdf_ops.split_pdf`

### Preconditions / Invalid Input Handling
- **Target selection** (line 696): Uses `_current_item_path()` OR first checked path. If neither, shows "Select a PDF to split." (4000ms) and returns.
- **Output directory** (lines 700-701): Calls `_ensure_output_directory()`. If user cancels, returns early.

### Background Work Callable
```python
def work() -> str:
    return pdf_ops.split_pdf(target, self.output_directory)
```
- **Input**: `target` (str path), `self.output_directory` (str)
- **Returns**: Output directory path (str) — the folder containing split pages

### Progress Dialog Setup
- **Label**: "Splitting PDF…"
- **Window title**: "PDF Toolkit"
- **Modality**: `ApplicationModal`
- **Cancel button**: None
- **Minimum duration**: 0
- **Status bar**: Shows "Splitting PDF…" immediately

### Success Callback
```python
def on_success(result: str) -> None:
    folder = Path(result)
    self.status_bar.showMessage(
        f"Split into {len(list(folder.glob('*.pdf')))} files in {folder.name}",
        6000,
    )
```
- Counts generated PDF files in output directory
- Shows success message with file count and folder name for 6000ms

### Failure Presentation
- `_show_error("Splitting PDF", message, progress)`
- `QMessageBox.critical` with title "Splitting PDF"
- Status bar shows error for 6000ms

### Cleanup
- Same `_finish_progress` behavior

---

## 4. `_rotate_current` (lines 715-734)

**Handler name**: `_rotate_current`
**Line range**: 715-734
**pdf_ops function**: `pdf_ops.rotate_pdf`

### Preconditions / Invalid Input Handling
- **Target selection** (line 716): Uses `_current_item_path()` OR first checked path. If neither, shows "Select a PDF to rotate." (4000ms) and returns.
- **Rotation value parsing** (lines 720-724): Parses `self.rotation_combo.currentText()` as int. On `ValueError`, shows "Enter a rotation value (e.g. 90)." (5000ms) and returns.
- **Output directory** (lines 725-726): Calls `_ensure_output_directory()`. If user cancels, returns early.

### Background Work Callable
```python
def work() -> str:
    return pdf_ops.rotate_pdf(target, self.output_directory, rotation)
```
- **Input**: `target` (str path), `self.output_directory` (str), `rotation` (int)
- **Returns**: Output file path (str)

### Progress Dialog Setup
- **Label**: "Rotating PDF…"
- **Window title**: "PDF Toolkit"
- **Modality**: `ApplicationModal`
- **Cancel button**: None
- **Minimum duration**: 0
- **Status bar**: Shows "Rotating PDF…" immediately

### Success Callback
```python
def on_success(result: str) -> None:
    self.status_bar.showMessage(f"Rotated PDF saved as {Path(result).name}", 6000)
```
- Shows success message with output filename for 6000ms

### Failure Presentation
- `_show_error("Rotating PDF", message, progress)`
- `QMessageBox.critical` with title "Rotating PDF"
- Status bar shows error for 6000ms

### Cleanup
- Same `_finish_progress` behavior

---

## 5. `_compress_current` (lines 736-754)

**Handler name**: `_compress_current`
**Line range**: 736-754
**pdf_ops function**: `pdf_ops.compress_pdf`

### Preconditions / Invalid Input Handling
- **Target selection** (line 737): Uses `_current_item_path()` OR first checked path. If neither, shows "Select a PDF to compress." (4000ms) and returns.
- **Output directory** (lines 741-742): Calls `_ensure_output_directory()`. If user cancels, returns early.

### Background Work Callable
```python
def work() -> tuple[str, float]:
    return pdf_ops.compress_pdf(target, self.output_directory)
```
- **Input**: `target` (str path), `self.output_directory` (str)
- **Returns**: Tuple of (output_path: str, ratio: float) — ratio is percentage reduction

### Progress Dialog Setup
- **Label**: "Compressing PDF…"
- **Window title**: "PDF Toolkit"
- **Modality**: `ApplicationModal`
- **Cancel button**: None
- **Minimum duration**: 0
- **Status bar**: Shows "Compressing PDF…" immediately

### Success Callback
```python
def on_success(result: tuple[str, float]) -> None:
    output_path, ratio = result
    self.status_bar.showMessage(
        f"Compressed to {Path(output_path).name} (saved {ratio:.1f}%).",
        6000,
    )
```
- Unpacks tuple, shows success message with filename and compression ratio for 6000ms

### Failure Presentation
- `_show_error("Compressing PDF", message, progress)`
- `QMessageBox.critical` with title "Compressing PDF"
- Status bar shows error for 6000ms

### Cleanup
- Same `_finish_progress` behavior

---

## 6. `_convert_current` (lines 756-774)

**Handler name**: `_convert_current`
**Line range**: 756-774
**pdf_ops function**: `pdf_ops.convert_pdf`

### Preconditions / Invalid Input Handling
- **Target selection** (line 757): Uses `_current_item_path()` OR first checked path. If neither, shows "Select a PDF to convert." (4000ms) and returns.
- **Output directory** (lines 761-762): Calls `_ensure_output_directory()`. If user cancels, returns early.
- **Format selection** (line 763): Gets `self.format_combo.currentText().lower()` — one of "word", "excel", "powerpoint", "text"

### Background Work Callable
```python
def work() -> str:
    return pdf_ops.convert_pdf(target, self.output_directory, format_choice)
```
- **Input**: `target` (str path), `self.output_directory` (str), `format_choice` (str)
- **Returns**: Output file path (str)

### Progress Dialog Setup
- **Label**: f"Converting to {format_choice.title()}…" (e.g., "Converting to Word…")
- **Window title**: "PDF Toolkit"
- **Modality**: `ApplicationModal`
- **Cancel button**: None
- **Minimum duration**: 0
- **Status bar**: Shows "Converting to {Format}…" immediately

### Success Callback
```python
def on_success(result: str) -> None:
    self.status_bar.showMessage(
        f"Converted to {Path(result).name}",
        6000,
    )
```
- Shows success message with output filename for 6000ms

### Failure Presentation
- `_show_error(f"Converting to {format_choice.title()}", message, progress)`
- `QMessageBox.critical` with dynamic title (e.g., "Converting to Word")
- Status bar shows error for 6000ms

### Cleanup
- Same `_finish_progress` behavior

---

## Shared Infrastructure: `_run_background` (lines 777-792)

```python
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
```

### Key Properties
- **Progress dialog**: Indeterminate (min=0, max=0), no cancel button, application-modal
- **Worker**: `pdf_combiner.ui.workers.Worker` wrapping the callable
- **Signal connections**:
  - `result` → `on_success` (if provided)
  - `error` → `_show_error(label, message, progress)`
  - `finished` → `_finish_progress(progress)`
- **Thread pool**: `QThreadPool.globalInstance()` (shared, not created per operation)
- **Status bar**: Shows label immediately on start

### `_finish_progress` (lines 794-796)
```python
def _finish_progress(self, dialog: QProgressDialog) -> None:
    dialog.close()
    QTimer.singleShot(0, lambda: self.status_bar.showMessage("Ready", 2000))
```
- Closes progress dialog
- Schedules "Ready" status for next event loop iteration (2000ms display)

### `_show_error` (lines 798-801)
```python
def _show_error(self, title: str, message: str, dialog: QProgressDialog | None = None) -> None:
    if dialog is not None:
        dialog.close()
    QMessageBox.critical(self, title, message)
    self.status_bar.showMessage(message, 6000)
```
- Closes progress dialog first (if provided)
- Shows modal critical message box
- Sets status bar error message (6000ms)
- **Important**: The "Ready" timer from `_finish_progress` may fire after this, but the 6000ms error message will override it.

---

## Summary Table

| Handler | pdf_ops Function | Preconditions | Progress Label | Success Message | Error Title |
|---------|------------------|---------------|----------------|-----------------|-------------|
| `_extract_pages` | `extract_pages` | Target PDF + valid page range + output dir | "Extracting pages" | "Extracted pages to {filename}" | "Extracting pages" |
| `_merge_checked` | `merge_pdfs` | ≥2 PDFs (checked or all) + output dir | "Merging PDFs" | "Merged {N} files to {filename}" | "Merging PDFs" |
| `_split_current` | `split_pdf` | Target PDF + output dir | "Splitting PDF" | "Split into {N} files in {folder}" | "Splitting PDF" |
| `_rotate_current` | `rotate_pdf` | Target PDF + valid rotation + output dir | "Rotating PDF" | "Rotated PDF saved as {filename}" | "Rotating PDF" |
| `_compress_current` | `compress_pdf` | Target PDF + output dir | "Compressing PDF" | "Compressed to {filename} (saved {ratio}%)" | "Compressing PDF" |
| `_convert_current` | `convert_pdf` | Target PDF + output dir + format | "Converting to {Format}" | "Converted to {filename}" | "Converting to {Format}" |

---

## Critical Preservation Notes

1. **Precondition order**: Target selection → Input validation → Output directory → Background work
2. **Progress dialog**: Always indeterminate, application-modal, no cancel, shows immediately
3. **Error handling**: Progress dialog closes BEFORE `QMessageBox.critical` shows
4. **Status bar timing**: Error messages 6000ms, success messages 6000ms, "Ready" 2000ms
5. **Worker lifecycle**: `result` → `on_success` → `finished` → `_finish_progress`; `error` → `_show_error` → `finished` → `_finish_progress`
6. **Thread pool**: Always `QThreadPool.globalInstance()`, never a new pool
7. **No percentage progress**: All operations use indeterminate progress (0, 0)
8. **Return types**: `extract_pages`, `merge_pdfs`, `split_pdf`, `rotate_pdf`, `convert_pdf` return `str`; `compress_pdf` returns `tuple[str, float]`