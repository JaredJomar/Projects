from __future__ import annotations

from typing import Tuple

import fitz  # PyMuPDF
from PyQt6.QtCore import QSize, Qt
from PyQt6.QtGui import QImage, QPixmap

__all__ = ["PreviewError", "render_pdf_page"]


class PreviewError(Exception):
    """Raised when the PDF preview cannot be generated."""


def _to_qimage(pix: fitz.Pixmap) -> QImage:
    if pix.alpha:
        fmt = QImage.Format.Format_RGBA8888
    else:
        fmt = QImage.Format.Format_RGB888
    image = QImage(pix.samples, pix.width, pix.height, pix.stride, fmt)
    copied = image.copy()
    if pix.alpha:
        copied = copied.convertToFormat(QImage.Format.Format_RGBA8888)
    return copied


def render_pdf_page(
    pdf_path: str,
    page_index: int = 0,
    target_size: QSize | None = None,
    zoom: float = 2.0,
) -> Tuple[QPixmap, int]:
    """Render a PDF page into a QPixmap and return it with the total page count."""
    try:
        with fitz.open(pdf_path) as document:
            if document.page_count == 0:
                raise PreviewError("Selected PDF has no pages")

            clamped_index = max(0, min(page_index, document.page_count - 1))
            page = document[clamped_index]
            matrix = fitz.Matrix(zoom, zoom)
            pix = page.get_pixmap(matrix=matrix)
            page_count = document.page_count
    except PreviewError:
        raise
    except Exception as exc:
        raise PreviewError(f"Unable to render PDF preview: {exc}") from exc

    image = _to_qimage(pix)
    qt_pixmap = QPixmap.fromImage(image)

    if target_size and not target_size.isEmpty():
        qt_pixmap = qt_pixmap.scaled(
            target_size,
            Qt.AspectRatioMode.KeepAspectRatio,
            Qt.TransformationMode.SmoothTransformation,
        )

    return qt_pixmap, page_count
