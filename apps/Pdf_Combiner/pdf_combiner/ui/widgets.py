from __future__ import annotations

from typing import Iterable

from PyQt6.QtCore import Qt, pyqtSignal
from PyQt6.QtWidgets import QListWidget


class FileListWidget(QListWidget):
    """QListWidget that accepts PDF files dropped from the OS."""

    filesDropped = pyqtSignal(list)

    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self.setAcceptDrops(True)

    def dragEnterEvent(self, event):  # noqa: D401 - Qt override
        if self._event_has_pdf_urls(event.mimeData()):
            event.acceptProposedAction()
            return
        super().dragEnterEvent(event)

    def dragMoveEvent(self, event):  # noqa: D401 - Qt override
        if self._event_has_pdf_urls(event.mimeData()):
            event.acceptProposedAction()
            return
        super().dragMoveEvent(event)

    def dropEvent(self, event):  # noqa: D401 - Qt override
        if event.mimeData().hasUrls():
            paths = [
                url.toLocalFile()
                for url in event.mimeData().urls()
                if url.isLocalFile()
            ]
            pdf_paths = [path for path in paths if path.lower().endswith('.pdf')]
            if pdf_paths:
                event.acceptProposedAction()
                self.filesDropped.emit(pdf_paths)
                return
        super().dropEvent(event)

    @staticmethod
    def _event_has_pdf_urls(mime_data) -> bool:
        if not mime_data.hasUrls():
            return False
        for url in mime_data.urls():
            if url.isLocalFile() and url.toLocalFile().lower().endswith('.pdf'):
                return True
        return False
