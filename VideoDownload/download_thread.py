import subprocess
import re
import os
import glob
import signal
import psutil
import shutil
import sys
from PyQt5.QtCore import QThread, pyqtSignal


class DownloadThread(QThread):
    download_progress = pyqtSignal(int)
    download_output = pyqtSignal(str)
    download_complete = pyqtSignal()
    download_location_complete = pyqtSignal(str)

    def __init__(self, urls, output_folder, ffmpeg_path, yt_dlp_path, download_type, resolution, custom_title="", browser_cookies="None"):
        super().__init__()
        self.urls = urls.split("\n") if "\n" in urls else [urls]
        # Store original paths for test compatibility 
        self.output_folder = output_folder
        self.ffmpeg_path = ffmpeg_path 
        self.yt_dlp_path = yt_dlp_path
        
        # Normalized paths for actual use - expand environment variables first
        self._normalized_output_folder = os.path.normpath(os.path.expandvars(output_folder))
        self._normalized_ffmpeg_path = os.path.normpath(os.path.expandvars(ffmpeg_path))
        self._normalized_yt_dlp_path = os.path.normpath(os.path.expandvars(yt_dlp_path))
        self.download_type = download_type
        self.resolution = resolution
        self.custom_title = custom_title
        self.browser_cookies = browser_cookies
        self.running = True

    def run(self):
        for url in self.urls:
            if not self.running:
                return

            command = self.construct_command(url)
            self.execute_command(command, url=url)

        if self.running:
            # Emit final progress update to ensure progress bar reaches 100%
            self.download_progress.emit(100)
            self.download_complete.emit()

    def sanitize_path(self, path):
        """
        Sanitize a file path by replacing invalid characters
        while preserving international characters when possible
        """
        if not path:
            return ""
            
        # First replace the most problematic characters
        path = re.sub(r'[<>:"/\\|?*]', '_', path)
        
        # Replace additional problematic characters (control characters)
        path = re.sub(r'[\x00-\x1f]', '', path)
        
        # Limit the maximum length (Windows has a 255 character path limit)
        max_length = 200  # Conservative limit to account for extensions and folder paths
        if len(path) > max_length:
            path = path[:max_length]
            
        return path

    def construct_command(self, url, force_cookies=False):
        if not url.startswith(('http://', 'https://', 'ftp://')):
            url = f'https://{url}'
        output_path = self._normalized_output_folder
        
        # Clean up any temporary files from previous downloads
        self.cleanup_temp_files(output_path)
        
        # Create sanitized custom title for the output template
        safe_title = self.custom_title
        if safe_title:
            safe_title = self.sanitize_path(safe_title)
            
        output_template = (
            f"{output_path}\\{safe_title}.%(ext)s" 
            if safe_title 
            else f"{output_path}\\%(title)s_%(resolution)s.%(ext)s"
        )
        
        base_command = [
            self._normalized_yt_dlp_path,
            "--no-cache-dir",
            "--no-mtime",
            "--no-check-certificate",
            "--add-metadata",
            "-o", output_template,
            "--ffmpeg-location", self._normalized_ffmpeg_path,
            "--concurrent-fragments", "5",
            "--no-part",
            "--progress",
            "--restrict-filenames",  # Replace problematic characters in filenames
            "--no-continue",         # Don't resume partially downloaded files (prevents 416 errors)
            "--ignore-errors",       # Continue on download errors
            "--retries", "10",       # Retry 10 times on connection errors
            "--retry-sleep", "5",    # Wait 5 seconds between retries
            url
        ]        # Only use browser cookies if necessary or forced
        use_cookies = False
        if force_cookies:
            use_cookies = self.browser_cookies != "None"
        else:
            if self.browser_cookies != "None":
                if "youtube.com" in url.lower() or "private" in url.lower():
                    use_cookies = True
        
        if use_cookies:
            base_command.extend(["--cookies-from-browser", self.browser_cookies.lower()])
            self.download_output.emit(f"🍪 Using cookies from {self.browser_cookies} browser")
        
        # Add specific parameters for different platforms
        if 'youtube.com' in url.lower():
            base_command.append("--live-from-start")
            # Add safer audio handling to avoid "Function not implemented" errors
            base_command.extend([
                "--audio-quality", "0",  # Use highest audio quality
                "--hls-use-mpegts",  # Use MPEG transport stream for better compatibility
                # Specify path for temporary files
                "--paths", f"temp:{self._normalized_output_folder}"  # Specify temp file location
            ])
            if '/live/' in url.lower() or 'livestream' in url.lower():
                self.download_output.emit("🔴 YouTube live stream detected - Using enhanced audio processing")
        elif 'twitch.tv' in url.lower():
            # Common Twitch parameters for both live and VOD
            base_command.extend([
                "--wait-for-video", "5",  # Wait up to 5 seconds for live stream
                "--downloader", "ffmpeg",  # Use ffmpeg directly for downloading
                "--hls-use-mpegts",  # Use MPEG transport stream for better compatibility
                "--audio-quality", "0",  # Use highest audio quality
                # Use paths command for temp files
                "--paths", f"temp:{self._normalized_output_folder}",  # Use output folder for temp files
                "--file-access-retries", "10",  # Retry file access operations up to 10 times
                "--fragment-retries", "10",  # Retry fragment downloads up to 10 times
                "--retry-sleep", "5"  # Wait 5 seconds between retries
            ])
            
            # Special handling for Twitch live vs VOD
            is_vod = '/videos/' in url.lower() or 'twitch.tv/videos/' in url.lower()
            
            if is_vod:
                # This is a VOD (recorded video), explicitly DON'T use live-from-start
                base_command.append("--no-live-from-start")
                self.download_output.emit("📺 Twitch VOD detected - Using VOD-specific settings")
            else:
                # This is likely a live stream
                base_command.append("--live-from-start")
                self.download_output.emit("🔴 Twitch live stream detected - Will record from beginning")
            
            # For Twitch, if we're downloading video with audio, use this specific format
            if self.download_type == "video with audio":
                self.download_output.emit("ℹ️ Using optimized settings for Twitch download (enhanced audio processing)")
                
        if self.download_type == "video with audio":
            format_spec = "bestvideo+bestaudio/best" if self.resolution == "best" else f"bestvideo[height<={self.resolution}]+bestaudio/best"
            base_command.extend(["--format", format_spec])
        elif self.download_type == "audio":
            base_command.extend([
                "--format", "bestaudio/best",
                "--extract-audio",
                "--audio-format", "mp3"
            ])
        else:  # video only
            format_spec = "bestvideo" if self.resolution == "best" else f"bestvideo[height<={self.resolution}]"
            base_command.extend(["--format", format_spec])
        return base_command

    # The following methods are replaced by the construct_command method above but kept for backward compatibility
    def construct_video_command(self, url):
        return self.construct_command(url)

    def construct_audio_command(self, url):
        return self.construct_command(url)

    def construct_video_with_audio_command(self, url):
        return self.construct_command(url)

    def execute_command(self, command, url=None, retry_with_cookies=False):
        try:
            # Set encoding for the subprocess to handle non-ASCII characters
            if os.name == 'nt':  # Windows
                try:
                    if hasattr(sys.stdout, 'reconfigure'):
                        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
                except Exception:
                    pass  # Ignore if sys.stdout does not support reconfigure
                
            self.process = subprocess.Popen(
                command,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                universal_newlines=True,
                creationflags=subprocess.CREATE_NO_WINDOW,
                encoding='utf-8',
                errors='replace'  # Handle encoding errors gracefully
            )
            error_detected = False
            for line in self.process.stdout:
                if not self.running:
                    self.process.terminate()
                    return
                line = line.strip()
                if not line:
                    continue
                # Error detection for age restriction/cookie requirement
                if (
                    'sign in to confirm your age' in line.lower() or
                    'use --cookies-from-browser or --cookies for the authentication' in line.lower()
                ):
                    error_detected = True
                # Error detection for HTTP 416 issues (range errors)
                if 'HTTP Error 416' in line:
                    self.download_output.emit("⚠️ Range request issue detected - Attempting to restart download...")
                    # If we're still running, retry with no-continue flag
                    if self.running and url:
                        self.process.terminate()
                        # Wait for process to terminate properly
                        self.wait_with_timeout(self.process, 2)
                        # Create a fresh command with explicit no-continue flag
                        fresh_command = self.construct_command(url, force_cookies=retry_with_cookies)
                        # Restart with fresh command
                        self.download_output.emit("🔄 Restarting download with fresh connection...")
                        self.execute_command(fresh_command, url=url, retry_with_cookies=retry_with_cookies)
                        return
                
                # Error detection for file not found errors
                if 'The system cannot find the file specified' in line or 'No such file or directory' in line:
                    self.download_output.emit("⚠️ File path issue detected - This is usually caused by special characters in filenames")
                    # Continue with the download process but notify the user of the potential issue
                
                # Error detection for postprocessing errors
                if 'Error opening output files: Function not implemented' in line:
                    self.download_output.emit("⚠️ Processing issue detected - Using alternative method...")
                    # This is a FFmpeg postprocessing error, but we can usually still get the main video
                                
                # Error detection for live-from-start issues
                if '--live-from-start is passed, but there are no formats that can be downloaded from the start' in line:
                    self.download_output.emit("⚠️ Cannot download from start - switching to current time recording")
                    # If we're still running, retry without live-from-start
                    if self.running and url:
                        self.process.terminate()
                        # Wait for process to terminate properly
                        self.wait_with_timeout(self.process, 2)
                        # Modify command to remove live-from-start
                        modified_command = [param for param in command if param != "--live-from-start"]
                        modified_command.append("--no-live-from-start")
                        # Restart with modified command
                        self.download_output.emit("🔄 Restarting download from current position...")
                        self.execute_command(modified_command, url=url, retry_with_cookies=retry_with_cookies)
                        return
                
                # Filter and format different types of messages
                if line.startswith('[download]'):
                    if 'Destination:' in line:
                        self.download_output.emit(f"📥 {line.split('Destination: ')[1]}")
                    elif 'of' in line and 'at' in line and 'ETA' in line:
                        # Only emit progress for non-live streams
                        if '/live/' not in line and 'twitch.tv' not in line:
                            self.download_output.emit(f"⏳ {line}")
                            match = re.search(r'(\d+(\.\d+)?)%', line)
                            if match:
                                percentage = int(float(match.group(1)))
                                self.download_progress.emit(percentage)
                    elif '100% of' in line:
                        self.download_output.emit(f"✅ {line}")
                elif line.startswith('[youtube]'):
                    if 'Live stream detected' in line:
                        self.download_output.emit("🔴 Live stream detected - Recording in progress...")
                    elif 'Extracting URL' in line:
                        self.download_output.emit("🔗 Processing URL...")
                    elif 'Downloading webpage' in line:
                        self.download_output.emit("📄 Loading stream information...")
                    elif 'Downloading m3u8 information' in line:
                        self.download_output.emit("📊 Connecting to live stream...")
                elif line.startswith('[Twitch]') or line.startswith('[twitch:'):
                    if 'Downloading m3u8 information' in line:
                        self.download_output.emit("🎮 Connecting to Twitch stream...")
                    elif 'Opening' in line:
                        self.download_output.emit("🔴 Recording Twitch stream...")
                    elif (
                        'Downloading video access token' in line or 
                        'Downloading stream metadata' in line
                    ):
                        self.download_output.emit("📀 Processing Twitch VOD information...")
                    elif 'Downloading storyboard' in line:
                        self.download_output.emit("📊 Processing Twitch stream preview data...")
                    elif 'Extracting URL' in line:
                        self.download_output.emit("🔗 Processing Twitch stream URL...")
                elif line.startswith('[Merger]'):
                    self.download_output.emit("🔄 Processing recording...")
                elif line.startswith('[Metadata]'):
                    self.download_output.emit("📝 Adding metadata...")
                elif 'Error' in line.lower():
                    self.download_output.emit(f"❌ Error: {line}")
                elif not any(x in line for x in [
                    'hls @', 
                    'Press [q]', 
                    'https @',
                    'Input #',
                    'Opening',
                    'Stream mapping',
                    'Last message repeated',
                    'Program'
                ]):
                    # Filter out technical noise but keep important messages
                    self.download_output.emit(line)
            
            self.process.stdout.close()
            self.process.wait()
            
            # If error detected and not already retried with cookies, retry
            if error_detected and not retry_with_cookies and self.browser_cookies != "None":
                self.download_output.emit("🔄 Retrying with browser cookies due to authentication error...")
                retry_command = self.construct_command(url, force_cookies=True)
                self.execute_command(retry_command, url=url, retry_with_cookies=True)
        
        except Exception as e:
            self.download_output.emit(f"❌ Error: {str(e)}")
        
        finally:
            if hasattr(self, 'process') and self.process:
                try:
                    # Only terminate if still running
                    if self.process.poll() is None:
                        self.process.terminate()
                        self.wait_with_timeout(self.process, 1)  # Short wait
                except Exception:
                    pass  # Ignore errors in cleanup

    def stop(self):
        self.running = False
        if hasattr(self, 'process') and self.process:
            try:
                # Check if process is still running before attempting to kill
                if self.process.poll() is None:
                    # Get the parent process
                    parent = psutil.Process(self.process.pid)
                    
                    # Kill all child processes (including ffmpeg) - Only once
                    for child in parent.children(recursive=True):
                        try:
                            child.kill()
                        except (psutil.NoSuchProcess, Exception):
                            pass  # Child process might already be gone
                    
                    # Try different termination methods to ensure process stops
                    try:
                        self.process.terminate()
                        self.process.kill()
                    except Exception:
                        pass
                        
                    # Force kill using platform specific commands if still running
                    if self.process.poll() is None:
                        try:
                            if os.name == 'nt':  # Windows
                                subprocess.call(['taskkill', '/F', '/T', '/PID', str(self.process.pid)])
                            else:  # Unix/Linux
                                os.killpg(os.getpgid(self.process.pid), signal.SIGKILL)
                        except Exception:
                            pass
                
                # Final check - wait for process to terminate
                try:
                    self.process.wait(timeout=2)  # Wait with timeout to avoid hanging
                except (subprocess.TimeoutExpired, Exception):
                    pass
                    
                self.download_output.emit("✅ Download process terminated")
                    
            except (psutil.NoSuchProcess, Exception) as e:
                self.download_output.emit(f"❌ Error stopping process: {str(e)}")

    def wait_with_timeout(self, process, timeout=5):
        """Wait for a process to terminate with timeout to prevent hanging"""
        import time
        start_time = time.time()
        while process.poll() is None:
            if time.time() - start_time > timeout:
                return False  # Timeout expired
            time.sleep(0.1)
        return True  # Process terminated

    def cleanup_temp_files(self, directory):
        """Clean up temporary files that might cause issues with new downloads"""
        try:
            # Look for temporary files (*.part, *.temp, etc.) that might interfere
            for pattern in ["*.part", "*.temp", "*.tmp"]:
                pattern_path = os.path.join(directory, pattern)
                for file in glob.glob(pattern_path):
                    try:
                        os.remove(file)
                    except (PermissionError, OSError):
                        pass  # Ignore errors if we can't delete a file
        except Exception:
            pass  # Silently fail if cleanup encounters issues
