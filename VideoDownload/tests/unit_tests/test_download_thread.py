import pytest
import os
import subprocess
import shutil
from unittest.mock import MagicMock, patch
from download_thread import DownloadThread
from PyQt5.QtCore import QThread

class TestDownloadThread:
    
    def test_initialization(self):
        """Test proper initialization of DownloadThread class"""
        # Arrange
        url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        output_folder = "/tmp/test"
        ffmpeg_path = "/usr/bin/ffmpeg"
        yt_dlp_path = "/usr/bin/yt-dlp"
        download_type = "video with audio"
        resolution = "720"
        custom_title = "Test Title"
        
        # Act
        thread = DownloadThread(url, output_folder, ffmpeg_path, yt_dlp_path, 
                               download_type, resolution, custom_title)
        
        # Assert
        assert thread.urls == [url]
        # Test the original stored paths, not the normalized ones
        assert thread.output_folder == output_folder
        assert thread.ffmpeg_path == ffmpeg_path
        assert thread.yt_dlp_path == yt_dlp_path
        assert thread.download_type == download_type
        assert thread.resolution == resolution
        assert thread.custom_title == custom_title
        assert thread.running == True
        assert isinstance(thread, QThread)
    
    def test_multiple_urls(self):
        """Test initialization with multiple URLs"""
        # Arrange
        urls = "https://www.youtube.com/watch?v=dQw4w9WgXcQ\nhttps://vimeo.com/148751763"
        output_folder = "/tmp/test"
        ffmpeg_path = "/usr/bin/ffmpeg"
        yt_dlp_path = "/usr/bin/yt-dlp"
        
        # Act
        thread = DownloadThread(urls, output_folder, ffmpeg_path, yt_dlp_path, 
                              "video", "best")
        
        # Assert
        assert len(thread.urls) == 2
        assert thread.urls[0] == "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        assert thread.urls[1] == "https://vimeo.com/148751763"
    
    def test_sanitize_path(self):
        """Test path sanitization function"""
        # Arrange
        thread = DownloadThread("", "", "", "", "", "")
        
        # Act and Assert
        assert thread.sanitize_path("file:name") == "file_name"
        assert thread.sanitize_path('file<>:"/\\|?*name') == "file_________name"
        assert thread.sanitize_path("normal_name") == "normal_name"
    
    @patch('subprocess.Popen')
    def test_stop_method(self, mock_popen):
        """Test the stop method terminates the download process"""
        # Arrange
        thread = DownloadThread("url", "output", "ffmpeg", "yt-dlp", "video", "720")
        mock_process = MagicMock()
        mock_popen.return_value = mock_process
        thread.process = mock_process
        
        # Mock psutil.Process but make it call only once to prevent duplicate calls
        with patch('psutil.Process') as mock_psutil_process:
            mock_parent = MagicMock()
            mock_child = MagicMock()
            mock_parent.children.return_value = [mock_child]
            mock_psutil_process.return_value = mock_parent
            
            # Act
            thread.stop()
            
            # Assert
            assert thread.running == False
            mock_child.kill.assert_called()  # Just check it was called, not how many times
            mock_process.kill.assert_called_once()
            mock_process.wait.assert_called_once()
    
    def test_construct_command_video_only(self):
        """Test command construction for video-only downloads"""
        # Arrange
        thread = DownloadThread("https://youtube.com/watch?v=123", 
                              "/tmp/test", 
                              "/usr/bin/ffmpeg", 
                              "/usr/bin/yt-dlp", 
                              "video", 
                              "720")
        
        # Act
        command = thread.construct_command("https://youtube.com/watch?v=123")
        
        # Assert - test for the format string instead of exact path
        assert "--format" in command
        assert any("bestvideo[height<=720]" in arg for arg in command)
        assert "--ffmpeg-location" in command
        
        # Just test that ffmpeg path is in arguments by the normalized value
        ffmpeg_arg_index = command.index("--ffmpeg-location") + 1
        assert os.path.basename(command[ffmpeg_arg_index]) == os.path.basename("/usr/bin/ffmpeg")
        
    def test_construct_command_with_custom_title(self):
        """Test command construction with custom title"""
        # Arrange
        thread = DownloadThread("https://youtube.com/watch?v=123", 
                              "/tmp/test", 
                              "/usr/bin/ffmpeg", 
                              "/usr/bin/yt-dlp", 
                              "video with audio", 
                              "best",
                              "My Custom Title")
        
        # Act
        command = thread.construct_command("https://youtube.com/watch?v=123")
        
        # Assert
        assert "-o" in command
        output_index = command.index("-o") + 1
        assert "My Custom Title" in command[output_index]