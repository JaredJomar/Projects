"""Pytest configuration for PDF Toolkit tests.

Defines custom command-line options for UI rendering:
- --render-baseline: captures the initial UI baseline image
- --render-after: captures the post-change UI image (requires baseline to exist)
- --render-t6: captures the long-output-path UI image (T6)

All options are mutually exclusive and write ONLY to their fixed evidence paths.
Without any option, pytest writes NO images.
"""
from __future__ import annotations

import os
from pathlib import Path

import pytest


# Fixed evidence paths - these are the ONLY paths the render helper writes to
BASELINE_PATH = Path(".omo/evidence/task-1-ui-baseline.png")
AFTER_PATH = Path(".omo/evidence/task-4-ui-after.png")
T6_PATH = Path(".omo/evidence/task-6-output-directory.png")


def pytest_addoption(parser: pytest.Parser) -> None:
    """Add custom command-line options for UI rendering."""
    group = parser.getgroup("pdf-combiner-render")
    group.addoption(
        "--render-baseline",
        action="store_true",
        default=False,
        help="Capture UI baseline image to .omo/evidence/task-1-ui-baseline.png (fails if file exists)",
    )
    group.addoption(
        "--render-after",
        action="store_true",
        default=False,
        help="Capture UI after-change image to .omo/evidence/task-4-ui-after.png (requires baseline to exist)",
    )
    group.addoption(
        "--render-t6",
        action="store_true",
        default=False,
        help="Capture long-output-path UI image to .omo/evidence/task-6-output-directory.png (fails if file exists)",
    )


def pytest_configure(config: pytest.Config) -> None:
    """Validate mutually exclusive options and path constraints."""
    render_options = {
        "--render-baseline": config.getoption("--render-baseline"),
        "--render-after": config.getoption("--render-after"),
        "--render-t6": config.getoption("--render-t6"),
    }
    active = [name for name, enabled in render_options.items() if enabled]

    if len(active) > 1:
        raise pytest.UsageError(
            f"Options {', '.join(active)} are mutually exclusive. "
            "Use only one at a time."
        )

    if render_options["--render-baseline"]:
        if BASELINE_PATH.exists():
            raise pytest.UsageError(
                f"Baseline image already exists at {BASELINE_PATH}. "
                "Refusing to overwrite. Remove it manually if you need to re-capture."
            )
        # Ensure parent directory exists
        BASELINE_PATH.parent.mkdir(parents=True, exist_ok=True)

    if render_options["--render-after"]:
        if not BASELINE_PATH.exists():
            raise pytest.UsageError(
                f"Baseline image not found at {BASELINE_PATH}. "
                "Run with --render-baseline first to establish the baseline."
            )
        if AFTER_PATH.exists():
            raise pytest.UsageError(
                f"After image already exists at {AFTER_PATH}. "
                "Refusing to overwrite. Remove it manually if you need to re-capture."
            )
        AFTER_PATH.parent.mkdir(parents=True, exist_ok=True)

    if render_options["--render-t6"]:
        if T6_PATH.exists():
            raise pytest.UsageError(
                f"T6 image already exists at {T6_PATH}. "
                "Refusing to overwrite. Remove it manually if you need to re-capture."
            )
        T6_PATH.parent.mkdir(parents=True, exist_ok=True)


@pytest.fixture
def render_baseline(request: pytest.FixtureRequest) -> bool:
    """Fixture indicating whether --render-baseline was passed."""
    return request.config.getoption("--render-baseline")


@pytest.fixture
def render_after(request: pytest.FixtureRequest) -> bool:
    """Fixture indicating whether --render-after was passed."""
    return request.config.getoption("--render-after")


@pytest.fixture
def render_t6(request: pytest.FixtureRequest) -> bool:
    """Fixture indicating whether --render-t6 was passed."""
    return request.config.getoption("--render-t6")


@pytest.fixture
def baseline_path() -> Path:
    """Return the fixed baseline evidence path."""
    return BASELINE_PATH


@pytest.fixture
def after_path() -> Path:
    """Return the fixed after-change evidence path."""
    return AFTER_PATH


@pytest.fixture
def t6_path() -> Path:
    """Return the fixed T6 evidence path."""
    return T6_PATH


def _save_render_image(image, path: Path) -> None:
    """Save a QImage to the given path, refusing to overwrite.

    Args:
        image: QImage to save
        path: Target path (must be BASELINE_PATH, AFTER_PATH, or T6_PATH)

    Raises:
        ValueError: If path is not one of the fixed evidence paths
        FileExistsError: If the target file already exists
    """
    # Only allow the fixed evidence paths
    allowed_paths = {BASELINE_PATH.resolve(), AFTER_PATH.resolve(), T6_PATH.resolve()}
    target = path.resolve()
    if target not in allowed_paths:
        raise ValueError(
            f"Render helper only writes to fixed evidence paths: "
            f"{BASELINE_PATH}, {AFTER_PATH} or {T6_PATH}. Got: {path}"
        )

    if target.exists():
        raise FileExistsError(f"Refusing to overwrite existing file: {target}")

    # Save the image
    if not image.save(str(target)):
        raise RuntimeError(f"Failed to save image to {target}")


@pytest.fixture
def save_render_image():
    """Fixture providing the render image saver function.

    Usage in tests:
        def test_ui_render(save_render_image, baseline_path):
            if not render_baseline:
                pytest.skip("Only runs with --render-baseline")
            # ... create QImage ...
            save_render_image(image, baseline_path)
    """
    return _save_render_image