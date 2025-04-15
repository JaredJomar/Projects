import pytest
import os
import sys
import tempfile
import shutil

# Add the parent directory to sys.path to make imports work
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

def pytest_configure(config):
    """Register custom markers to avoid warnings."""
    config.addinivalue_line("markers", "slow: marks tests as slow (deselected by default)")
    config.addinivalue_line("markers", "unit: marks tests as unit tests")
    config.addinivalue_line("markers", "integration: marks tests as integration tests")

@pytest.fixture
def temp_download_dir():
    """Create a temporary directory for downloads during tests"""
    temp_dir = tempfile.mkdtemp()
    yield temp_dir
    # Clean up after tests
    shutil.rmtree(temp_dir, ignore_errors=True)

@pytest.fixture
def sample_urls():
    """Provide sample URLs for testing"""
    return {
        "youtube": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "vimeo": "https://vimeo.com/148751763",
        "twitch": "https://www.twitch.tv/videos/1234567890",
        "invalid": "https://example.com/invalid_video"
    }