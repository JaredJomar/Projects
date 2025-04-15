# VideoDownload Test Suite

This directory contains tests for the VideoDownload application. The tests are organized into unit tests and integration tests.

## Test Structure

```
tests/
├── conftest.py             # Common test fixtures and configuration
├── run_tests.py            # Python script for running tests
├── integration_tests/      # Tests that verify components working together
│   ├── test_end_to_end.py  # Tests for full application flow with real downloads
│   └── test_integration.py # Tests for component integration
├── sample_urls/            # Sample URL files for testing batch downloads
│   └── test_urls.txt       # Sample URLs for testing
└── unit_tests/             # Tests for individual components
    ├── test_constants.py   # Tests for constants and color scheme
    ├── test_download_thread.py  # Tests for download thread functionality
    ├── test_main_window.py      # Tests for main window UI
    └── test_settings_window.py  # Tests for settings window
```

## Running Tests

### Using the Batch File (Windows)

Run all non-slow tests:
```
run_tests.bat
```

Run only unit tests:
```
run_tests.bat unit
```

Run only integration tests:
```
run_tests.bat integration
```

Run all tests including slow ones:
```
run_tests.bat all
```

### Using Python Directly

Run all non-slow tests:
```
python -m tests.run_tests
```

Run only unit tests:
```
python -m tests.run_tests --unit
```

Run only integration tests:
```
python -m tests.run_tests --integration
```

Run all tests including slow ones:
```
python -m tests.run_tests --all
```

## Test Categories

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test how components work together
- **Slow Tests**: Tests that involve real downloads (marked with `@pytest.mark.slow`)

## Requirements

To run the tests, you need:

1. Python 3.6+
2. pytest
3. PyQt5
4. FFmpeg and yt-dlp installed (for integration tests)

Install test dependencies:
```
pip install pytest pytest-qt
```