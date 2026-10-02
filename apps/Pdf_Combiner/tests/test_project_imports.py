"""Bootstrap test to ensure the project imports correctly.

This test exists so that `pytest -q` never reports "no tests collected".
It verifies that the pdf_combiner package and its main entry point are importable.
"""
from __future__ import annotations

import pdf_combiner
from pdf_combiner.main import main


def test_pdf_combiner_package_imports() -> None:
    """Verify the pdf_combiner package can be imported."""
    assert pdf_combiner is not None
    assert hasattr(pdf_combiner, "__all__")
    assert "main" in pdf_combiner.__all__


def test_main_function_is_callable() -> None:
    """Verify the main entry point is a callable function."""
    assert callable(main), "pdf_combiner.main.main should be callable"
    # We don't call it here because it starts the Qt event loop
    # This test only verifies the symbol exists and is callable