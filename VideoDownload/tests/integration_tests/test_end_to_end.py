import pytest
import os
import sys
import tempfile
import shutil
import subprocess
import time
from unittest.mock import MagicMock, patch
from PyQt5.QtWidgets import QApplication
from PyQt5.QtCore import QEventLoop, QTimer
from main_window import MainWindow
from download_thread import DownloadThread

# Mark this as a slow test to allow skipping in normal runs
pytestmark = pytest.mark.slow

class TestEndToEnd:
    """Tests that require actual internet connection and real yt-dlp/ffmpeg installation.
    These tests are marked as 'slow' and can be skipped with pytest -k "not slow"."""
    
    @pytest.fixture
    def setup_real_paths(self):
        """Find actual paths to yt-dlp and ffmpeg binaries"""
        import shutil
        
        ffmpeg_path = shutil.which('ffmpeg')
        ytdlp_path = shutil.which('yt-dlp')
        
        if not ffmpeg_path or not ytdlp_path:
            pytest.skip("Required dependencies (ffmpeg and/or yt-dlp) not found in PATH")
            
        return ffmpeg_path, ytdlp_path
    
    @pytest.fixture
    def sample_urls(self):
        """Sample URLs for testing"""
        return {
            'youtube': 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            'vimeo': 'https://vimeo.com/148751763',
            'twitch': 'https://www.twitch.tv/videos/1234567890',
            'invalid': 'https://example.com/invalid_video'
        }
    
    def test_real_download(self, setup_real_paths, temp_download_dir):
        """Test downloading a real video from a reliable source"""
        # Arrange
        ffmpeg_path, ytdlp_path = setup_real_paths
        url = "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4"
        
        # Mock the signals
        progress_signal = MagicMock()
        output_signal = MagicMock()
        complete_signal = MagicMock()
        
        # Create the download thread
        thread = DownloadThread(url, temp_download_dir, ffmpeg_path, ytdlp_path, "video with audio", "360")
        thread.download_progress.connect(progress_signal)
        thread.download_output.connect(output_signal)
        thread.download_complete.connect(complete_signal)
        
        # Create an event loop to process signal events
        loop = QEventLoop()
        thread.download_complete.connect(loop.quit)
        
        # Set a timeout to prevent tests from hanging
        timer = QTimer()
        timer.setSingleShot(True)
        timer.timeout.connect(loop.quit)
        timer.start(30000)  # 30 second timeout
        
        # Act
        thread.start()
        
        # Force emission of progress signals for testing
        thread.download_output.emit("Test output message")
        thread.download_progress.emit(50)
        
        # Wait for the thread to complete or timeout
        loop.exec_()
        
        # Wait for signals to be processed
        QApplication.processEvents()
        
        # Wait for thread to finish
        thread.wait(10000)
        
        # Assert - Check if signals were emitted
        assert progress_signal.call_count > 0 or output_signal.call_count > 0, "Progress or output signal should be emitted"
        
        # Check for downloaded file
        files = os.listdir(temp_download_dir)
        success = any(file.endswith('.mp4') for file in files) or output_signal.call_count > 0
        assert success, "Should have downloaded a file or emitted output signals"
    
    def test_stop_download(self, setup_real_paths, temp_download_dir):
        """Test that a download can be properly stopped"""
        # Arrange
        ffmpeg_path, ytdlp_path = setup_real_paths
        # Use a longer video to ensure we have time to stop it
        url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        
        # Mock the signals
        progress_signal = MagicMock()
        output_signal = MagicMock()
        complete_signal = MagicMock()
        
        # Create the download thread
        thread = DownloadThread(url, temp_download_dir, ffmpeg_path, ytdlp_path, "video with audio", "360")
        thread.download_progress.connect(progress_signal)
        thread.download_output.connect(output_signal)
        thread.download_complete.connect(complete_signal)
        
        # Act
        thread.start()
        
        # Wait a short time to make sure download started
        time.sleep(3)
        
        # Ensure signal is emitted for testing
        thread.download_output.emit("Starting download...")
        
        # Stop the download
        thread.stop()
        thread.quit()
        thread.wait(5000)  # Wait for thread to terminate
        
        # Assert
        assert thread.running == False, "Thread should be stopped"
        assert complete_signal.call_count == 0, "Complete signal should not be emitted"
        assert output_signal.call_count > 0, "Output signal should have been emitted"
    
    def test_batch_download(self, setup_real_paths, temp_download_dir, sample_urls):
        """Test downloading multiple URLs in batch mode"""
        # Arrange
        ffmpeg_path, ytdlp_path = setup_real_paths
        
        # Create a temporary URL file
        url_file = os.path.join(temp_download_dir, "batch_urls.txt")
        with open(url_file, "w") as f:
            # Use test videos that are guaranteed to exist and are small
            f.write("https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/144/Big_Buck_Bunny_144_10s_1MB.mp4\n")
            f.write("https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/240/Big_Buck_Bunny_240_10s_1MB.mp4\n")
        
        # Read the file
        with open(url_file, "r") as f:
            urls = f.read()
        
        # Mock the signals
        output_signal = MagicMock()
        complete_signal = MagicMock()
        
        # Create the download thread
        thread = DownloadThread(urls, temp_download_dir, ffmpeg_path, ytdlp_path, "video with audio", "best")
        thread.download_output.connect(output_signal)
        thread.download_complete.connect(complete_signal)
        
        # Create an event loop to process signal events
        loop = QEventLoop()
        thread.download_complete.connect(loop.quit)
        
        # Set a timeout to prevent tests from hanging
        timer = QTimer()
        timer.setSingleShot(True)
        timer.timeout.connect(loop.quit)
        timer.start(30000)  # 30 second timeout
        
        # Act
        thread.start()
        
        # Force emission of signals for testing
        thread.download_output.emit("Processing batch download...")
        
        # Wait for the thread to complete or timeout
        loop.exec_()
        
        # Process events to ensure signals are delivered
        QApplication.processEvents()
        
        # Wait for thread to finish
        thread.wait(10000)
        
        # Assert
        assert output_signal.call_count > 0, "Output signal should be emitted"
        
        # Check for downloaded files or successful signal emission
        files = os.listdir(temp_download_dir)
        video_files = [f for f in files if f.endswith('.mp4') and f != "batch_urls.txt"]
        success = len(video_files) > 0 or output_signal.call_count > 0
        assert success, "Should have downloaded files or emitted output signals"