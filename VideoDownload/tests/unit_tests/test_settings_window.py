import pytest
from unittest.mock import MagicMock, patch
import os
import sys
from PyQt5.QtWidgets import QApplication, QMessageBox
from settings_window import SettingsWindow

# Required for Qt tests
app = QApplication(sys.argv)

class TestSettingsWindow:
    
    def test_initialization(self):
        """Test proper initialization of SettingsWindow class"""
        # Arrange & Act
        window = SettingsWindow()
        
        # Assert
        assert window.windowTitle() == "Settings"
        assert window.ffmpeg_input is not None
        assert window.yt_dlp_input is not None
        assert window.ffmpeg_status is not None
        assert window.ytdlp_status is not None
        assert window.aria2_status is not None
    
    @patch('shutil.which')
    def test_check_installations_ffmpeg_installed(self, mock_which):
        """Test check_installations when FFmpeg is installed"""
        # Arrange
        window = SettingsWindow()
        mock_which.side_effect = lambda cmd: '/usr/bin/ffmpeg' if cmd == 'ffmpeg' else None
        
        # Act
        window.check_installations()
        
        # Assert
        assert "✅ Installed" in window.ffmpeg_status.text()
        assert "❌ Not Installed" in window.ytdlp_status.text()
    
    @patch('shutil.which')
    def test_check_installations_ytdlp_installed(self, mock_which):
        """Test check_installations when yt-dlp is installed"""
        # Arrange
        window = SettingsWindow()
        mock_which.side_effect = lambda cmd: '/usr/bin/yt-dlp' if cmd == 'yt-dlp' else None
        
        # Act
        window.check_installations()
        
        # Assert
        assert "❌ Not Installed" in window.ffmpeg_status.text()
        assert "✅ Installed" in window.ytdlp_status.text()
    
    @patch('shutil.which')
    def test_check_installations_all_installed(self, mock_which):
        """Test check_installations when all tools are installed"""
        # Arrange
        window = SettingsWindow()
        mock_which.side_effect = lambda cmd: {
            'ffmpeg': '/usr/bin/ffmpeg',
            'yt-dlp': '/usr/bin/yt-dlp',
            'aria2c': '/usr/bin/aria2c'
        }.get(cmd)
        
        # Act
        window.check_installations()
        
        # Assert
        assert "✅ Installed" in window.ffmpeg_status.text()
        assert "✅ Installed" in window.ytdlp_status.text()
        assert "✅ Installed" in window.aria2_status.text()
    
    def test_save_settings(self):
        """Test that settings are properly saved"""
        # Arrange
        window = SettingsWindow()
        window.ffmpeg_input.setText("/path/to/ffmpeg")
        window.yt_dlp_input.setText("/path/to/yt-dlp")
        
        # Setup signal spy
        signal_received = False
        def on_signal():
            nonlocal signal_received
            signal_received = True
        window.settings_saved.connect(on_signal)
        
        # Act
        window.save_settings()
        
        # Assert
        assert signal_received
        assert window.settings.value("ffmpeg_path") == "/path/to/ffmpeg"
        assert window.settings.value("yt_dlp_path") == "/path/to/yt-dlp"
    
    @patch('subprocess.run')
    @patch('shutil.which')
    @patch('PyQt5.QtWidgets.QMessageBox.information')
    def test_install_ffmpeg_already_installed(self, mock_messagebox, mock_which, mock_run):
        """Test installing FFmpeg when it's already installed"""
        # Arrange
        window = SettingsWindow()
        mock_which.return_value = "/usr/bin/ffmpeg"
        
        # Act
        window.install_ffmpeg()
        
        # Assert
        mock_messagebox.assert_called_once()
        mock_run.assert_not_called()
        assert window.ffmpeg_input.text() == "/usr/bin/ffmpeg"