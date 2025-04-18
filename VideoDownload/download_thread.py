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

    def __init__(self, urls, output_folder, ffmpeg_path, yt_dlp_path, download_type, resolution, custom_title=""):
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
        self.running = True

    def run(self):
        for url in self.urls:
            if not self.running:
                return

            command = self.construct_command(url)
            self.execute_command(command)

        if self.running:
            self.download_complete.emit()

    def sanitize_path(self, path):
        # Fix sanitize_path to handle the correct number of special characters
        return re.sub(r'[<>:"/\\|?*]', '_', path)

    def construct_command(self, url):
        if not url.startswith(('http://', 'https://', 'ftp://')):
            url = f'https://{url}'
        
        # Use the stored original paths for command construction
        output_path = self._normalized_output_folder
        
        # Modify output template to not include resolution for custom titles
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

        # Only add live-from-start for YouTube, not for Twitch
        if 'youtube.com' in url.lower():
            base_command.append("--live-from-start")
        elif 'twitch.tv' in url.lower():
            # For Twitch, we want to record from the current time
            base_command.extend([
                "--no-live-from-start",
                "--wait-for-video", "5"  # Wait up to 5 seconds for live stream
            ])

        # Add format selection based on download type
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

    def execute_command(self, command):
        try:
            self.process = subprocess.Popen(
                command,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                universal_newlines=True,
                creationflags=subprocess.CREATE_NO_WINDOW,
            )
            
            for line in self.process.stdout:
                if not self.running:
                    self.process.terminate()
                    return
                    
                line = line.strip()
                if not line:
                    continue
                
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
                        self.download_output.emit("���� Connecting to Twitch stream...")
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
                
        except Exception as e:
            self.download_output.emit(f"❌ Error: {str(e)}")
            
        finally:
            if hasattr(self, 'process'):
                self.process.terminate()

    def stop(self):
        self.running = False
        if hasattr(self, 'process') and self.process:
            try:
                # Get the parent process
                parent = psutil.Process(self.process.pid)
                
                # Kill all child processes (including ffmpeg) - Only once
                for child in parent.children(recursive=True):
                    child.kill()
                
                # Kill the parent process
                self.process.kill()
                
                # Wait for all processes to terminate
                self.process.wait()
                
            except (psutil.NoSuchProcess, Exception) as e:
                self.download_output.emit(f"❌ Error stopping process: {str(e)}")
