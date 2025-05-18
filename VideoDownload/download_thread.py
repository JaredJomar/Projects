import subprocess
import re
import os
import signal
import psutil
import shutil
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
        # Normalized paths for actual use
        self._normalized_output_folder = os.path.normpath(output_folder)
        self._normalized_ffmpeg_path = os.path.normpath(ffmpeg_path)
        self._normalized_yt_dlp_path = os.path.normpath(yt_dlp_path)
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
            self.download_complete.emit()

    def sanitize_path(self, path):
        # Fix sanitize_path to handle the correct number of special characters
        return re.sub(r'[<>:"/\\|?*]', '_', path)

    def construct_command(self, url, force_cookies=False):
        if not url.startswith(('http://', 'https://', 'ftp://')):
            url = f'https://{url}'
        output_path = self._normalized_output_folder
        output_template = (
            f"{output_path}\\{self.custom_title}.%(ext)s" 
            if self.custom_title 
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
            url
        ]
        # Only use browser cookies if necessary or forced
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
        elif 'twitch.tv' in url.lower():
            # For Twitch, use special parameters to improve audio quality and fix choppy playback
            base_command.extend([
                "--no-live-from-start",
                "--wait-for-video", "5",  # Wait up to 5 seconds for live stream
                "--downloader", "ffmpeg",  # Use ffmpeg directly for downloading
                "--hls-use-mpegts",  # Use MPEG transport stream for better compatibility
                "--audio-quality", "0",  # Use highest audio quality
                "--postprocessor-args", "ffmpeg:-af aresample=async=1:min_hard_comp=0.100000:first_pts=0",  # Fix audio sync issues
                "--file-access-retries", "10",  # Retry file access operations up to 10 times
                "--fragment-retries", "10",  # Retry fragment downloads up to 10 times
                "--retry-sleep", "5"  # Wait 5 seconds between retries
            ])
            
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
            self.process = subprocess.Popen(
                command,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                universal_newlines=True,
                creationflags=subprocess.CREATE_NO_WINDOW,
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
                elif line.startswith('[Twitch]'):
                    if 'Downloading m3u8 information' in line:
                        self.download_output.emit("🎮 Connecting to Twitch stream...")
                    elif 'Opening' in line:
                        self.download_output.emit("🔴 Recording Twitch stream...")
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
