import pytest
from constants import (
    WINDOW_BACKGROUND_COLOR,
    TAB_BACKGROUND_COLOR,
    BUTTON_BACKGROUND_COLOR,
    BUTTON_TEXT_COLOR,
    INPUT_BACKGROUND_COLOR,
    INPUT_TEXT_COLOR,
    PROGRESS_BAR_BACKGROUND_COLOR,
    PROGRESS_BAR_CHUNK_COLOR,
    PROGRESS_TEXT_BACKGROUND_COLOR,
    PROGRESS_TEXT_COLOR,
    DONE_LABEL_COLOR
)

class TestConstants:
    
    def test_constants_exist(self):
        """Verify all required constants exist and have correct types"""
        # Assert all constants exist
        assert WINDOW_BACKGROUND_COLOR is not None
        assert TAB_BACKGROUND_COLOR is not None
        assert BUTTON_BACKGROUND_COLOR is not None
        assert BUTTON_TEXT_COLOR is not None
        assert INPUT_BACKGROUND_COLOR is not None
        assert INPUT_TEXT_COLOR is not None
        assert PROGRESS_BAR_BACKGROUND_COLOR is not None
        assert PROGRESS_BAR_CHUNK_COLOR is not None
        assert PROGRESS_TEXT_BACKGROUND_COLOR is not None
        assert PROGRESS_TEXT_COLOR is not None
        assert DONE_LABEL_COLOR is not None
        
    def test_constants_format(self):
        """Test that color constants use correct format"""
        # Test hex color format
        hex_colors = [
            WINDOW_BACKGROUND_COLOR,
            TAB_BACKGROUND_COLOR,
            BUTTON_BACKGROUND_COLOR,
            INPUT_BACKGROUND_COLOR,
            PROGRESS_BAR_BACKGROUND_COLOR,
            PROGRESS_BAR_CHUNK_COLOR,
            PROGRESS_TEXT_BACKGROUND_COLOR
        ]
        
        for color in hex_colors:
            assert color.startswith('#'), f"Color {color} should start with #"
            assert len(color) in [4, 7], f"Color {color} should be in #RGB or #RRGGBB format"
            
        # Test named colors
        named_colors = [
            BUTTON_TEXT_COLOR,
            INPUT_TEXT_COLOR,
            PROGRESS_TEXT_COLOR,
            DONE_LABEL_COLOR
        ]
        
        for color in named_colors:
            assert isinstance(color, str), f"Color {color} should be a string"
            assert len(color) > 0, f"Color {color} should not be empty"
    
    def test_color_scheme_consistency(self):
        """Test for consistent color scheme"""
        # Background colors should be consistent
        assert WINDOW_BACKGROUND_COLOR == "#000128", "Window background should be dark blue"
        assert TAB_BACKGROUND_COLOR == "#06283D", "Tab background should be dark blue"
        
        # Button colors should be consistent
        assert BUTTON_BACKGROUND_COLOR == "#1363DF", "Button background should be blue"
        assert BUTTON_TEXT_COLOR == "white", "Button text should be white"
        
        # Progress colors should be consistent
        assert PROGRESS_BAR_CHUNK_COLOR == "#47B5FF", "Progress bar chunks should be light blue"
        
        # Text colors should be appropriate for readability
        assert PROGRESS_TEXT_COLOR == "green", "Progress text should be green"
        assert DONE_LABEL_COLOR == "green", "Done label should be green"