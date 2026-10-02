"""Synthetic PDF success evidence test.

Generates real PDFs with PyMuPDF, runs merge_pdfs through OperationRunner,
and verifies the output has the expected page count.
"""
from __future__ import annotations

import os
import tempfile
import shutil
from pathlib import Path
from typing import Any
from unittest.mock import MagicMock

# Set offscreen platform BEFORE any PyQt6 import for headless testing
os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

import pytest
from PyQt6.QtCore import QThreadPool
from PyQt6.QtTest import QTest
from PyQt6.QtWidgets import QApplication, QWidget

from pdf_combiner.ui.operation_runner import OperationRunner
from pdf_combiner.services import pdf_ops


@pytest.fixture(scope="session")
def qapp() -> QApplication:
    """Create a QApplication instance for the test session."""
    app = QApplication.instance()
    if app is None:
        app = QApplication([])
    yield app


@pytest.fixture
def temp_dir() -> Path:
    """Create a temporary directory for test files."""
    tmp = Path(tempfile.mkdtemp(prefix="pdf_combiner_test_"))
    yield tmp
    # Cleanup
    shutil.rmtree(tmp, ignore_errors=True)


def _create_single_page_pdf(path: Path) -> None:
    """Create a single-page PDF using PyMuPDF."""
    import fitz
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)  # A4 size
    page.insert_text((100, 100), f"Test PDF: {path.name}", fontsize=24)
    doc.save(str(path))
    doc.close()


class TestSyntheticPDFMerge:
    """Test merge_pdfs with synthetic PDFs through OperationRunner."""

    def test_merge_two_synthetic_pdfs(self, qapp: QApplication, temp_dir: Path) -> None:
        """Merge two 1-page synthetic PDFs and verify output has 2 pages."""
        # Create two synthetic PDFs
        pdf1 = temp_dir / "test1.pdf"
        pdf2 = temp_dir / "test2.pdf"
        _create_single_page_pdf(pdf1)
        _create_single_page_pdf(pdf2)

        # Verify input PDFs have 1 page each
        import fitz
        doc1 = fitz.open(str(pdf1))
        assert doc1.page_count == 1, f"pdf1 should have 1 page, got {doc1.page_count}"
        doc1.close()

        doc2 = fitz.open(str(pdf2))
        assert doc2.page_count == 1, f"pdf2 should have 1 page, got {doc2.page_count}"
        doc2.close()

        # Create output directory
        out_dir = temp_dir / "output"
        out_dir.mkdir()

        # Run merge_pdfs through OperationRunner
        runner = OperationRunner(QThreadPool.globalInstance(), QWidget())
        on_success_mock = MagicMock()
        on_error_mock = MagicMock()

        def merge_fn() -> str:
            return pdf_ops.merge_pdfs([str(pdf1), str(pdf2)], str(out_dir), prefix="merged_test")

        worker = runner.run("Merge Test", merge_fn, on_success_mock, on_error_mock)

        # Wait for completion
        from PyQt6.QtTest import QSignalSpy
        finished_spy = QSignalSpy(worker.signals.finished)
        assert finished_spy.wait(10000), "Worker did not finish within 10 seconds"

        # Verify success
        assert on_error_mock.call_count == 0, f"on_error should not be called: {on_error_mock.call_args}"
        assert on_success_mock.call_count == 1, "on_success must be called exactly once"

        # Get the output file path from the success callback
        result = on_success_mock.call_args[0][0]
        output_path = Path(result)

        # Verify output file exists
        assert output_path.exists(), f"Output file does not exist: {output_path}"
        assert output_path.parent == out_dir, f"Output should be in {out_dir}, got {output_path.parent}"

        # Verify output has 2 pages
        doc_out = fitz.open(str(output_path))
        assert doc_out.page_count == 2, f"Merged PDF should have 2 pages, got {doc_out.page_count}"
        doc_out.close()

        # Verify in-flight tracking cleaned up
        assert runner.in_flight_count == 0, "in-flight workers must be empty after merge"

        # Cleanup is handled by temp_dir fixture