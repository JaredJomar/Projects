import subprocess
import re
import os
import glob
import signal
import psutil
import shutil
import sys
from datetime import datetime, timezone
from math import inf
from urllib.parse import urlparse, parse_qs
try:
    import yt_dlp  # type: ignore
except Exception:  # Module may not be available; fall back to CLI-only path
    yt_dlp = None  # noqa: N816

from .helpers import ensure_python_module
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
        self.is_paused = False  # Add pause state tracking

    def run(self):
        for url in self.urls:
            if not self.running:
                return

            # Announce per-URL processing start
            self.download_output.emit(f"🔎 Preparing: {url}")

            # Try to enumerate playlist and apply numbering if applicable
            try:
                self.download_output.emit("🧭 Pre-extracting playlist metadata (fast)…")
                # If YouTube watch URL contains list=, prefer the actual playlist URL for extraction
                playlist_probe_url = self._prefer_playlist_url(url)
                if playlist_probe_url != url:
                    self.download_output.emit(f"📃 Using playlist URL for detection: {playlist_probe_url}")
                info = self._extract_info(playlist_probe_url)
                self.download_output.emit("🧭 Pre-extraction complete")
            except Exception as e:
                info = None
                self.download_output.emit(f"ℹ️ Could not pre-extract info for sorting/numbering: {e}")

            # Allow disabling numbering via environment and only treat as playlist when entries > 1
            numbering_disabled = os.environ.get("VD_DISABLE_PLAYLIST_NUMBERING") == "1"
            has_entries = isinstance(info, dict) and bool(info.get("entries"))
            entries_list = self._make_entries_list(info)
            # Consider it a playlist if entries > 1, or yt_dlp reports playlist_count > 1, or URL has list= param
            is_youtube_list_url = ("list=" in url.lower())
            playlist_count = 0
            if isinstance(info, dict):
                try:
                    playlist_count = int(info.get('playlist_count') or 0)
                except Exception:
                    playlist_count = 0
            is_playlist = (len(entries_list) > 1) or (playlist_count > 1) or is_youtube_list_url

            if not numbering_disabled and is_playlist:
                # Playlist handling with numbering
                try:
                    entries = entries_list
                    # Ensure we have a flat list of entry dicts
                    flat_entries = []
                    for idx, entry in enumerate(entries):
                        if isinstance(entry, dict):
                            entry["_orig_pos"] = idx
                            flat_entries.append(entry)
                    sorted_entries = self._sort_entries_by_date(flat_entries)

                    # Determine next number and pad width
                    next_number = self._determine_next_number(self._normalized_output_folder)
                    pad = self._decide_zero_pad(next_number, len(sorted_entries))

                    self.download_output.emit(
                        f"📚 Playlist detected: {len(sorted_entries)} items. Numbering will start at {next_number:0{pad}d}"
                    )

                    current = next_number
                    for entry in sorted_entries:
                        if not self.running:
                            return
                        # Find a free prefix (avoid collisions)
                        number_to_use = self._find_free_number(self._normalized_output_folder, current, pad)
                        prefix = f"{number_to_use:0{pad}d}_"

                        # Choose a concrete URL for the item
                        entry_url = (
                            entry.get("webpage_url")
                            or entry.get("original_url")
                            or entry.get("url")
                            or url  # fallback
                        )

                        # Build outtmpl with our prefix
                        outtmpl = os.path.join(self._normalized_output_folder, f"{prefix}%(title)s.%(ext)s")
                        command = self.construct_command(entry_url, outtmpl_override=outtmpl)
                        self.download_output.emit(f"⬇️ Downloading as {prefix}%(title)s.%(ext)s")
                        self.execute_command(command, url=entry_url)

                        # Move to next number for next item
                        current = number_to_use + 1

                except Exception as e:
                    self.download_output.emit(f"❌ Playlist processing failed, falling back to single download: {e}")
                    command = self.construct_command(url)
                    self.execute_command(command, url=url)
            else:
                # Single URL (non-playlist) — keep existing naming
                self.download_output.emit("➡️ No playlist detected; starting single download")
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

    def construct_command(self, url, force_cookies=False, outtmpl_override: str | None = None):
        if not url.startswith(('http://', 'https://', 'ftp://')):
            url = f'https://{url}'
        output_path = self._normalized_output_folder
        
        # Clean up any temporary files from previous downloads
        self.cleanup_temp_files(output_path)
        
        # Create sanitized custom title for the output template
        safe_title = self.custom_title
        if safe_title:
            safe_title = self.sanitize_path(safe_title)
            
        if outtmpl_override:
            output_template = outtmpl_override
        else:
            output_template = (
                f"{output_path}\\{safe_title}.%(ext)s" 
                if safe_title 
                else f"{output_path}\\%(title)s_%(resolution)s.%(ext)s"
            )
        
        base_command = [
            self._normalized_yt_dlp_path,    # Path to yt-dlp executable
            "--no-cache-dir",                # Don't cache downloaded data (saves disk space)
            "--no-check-certificate",        # Skip SSL certificate verification for problematic sites
            "--add-metadata",                # Embed metadata into downloaded files
            "-o", output_template,           # Set output filename template
            "--ffmpeg-location", self._normalized_ffmpeg_path,  # Path to ffmpeg for video processing
            "--concurrent-fragments", "15",  # More parallel fragments for HLS/DASH
            "--http-chunk-size", "10M",      # Range requests chunking for direct HTTP
            "--no-part",                     # Don't create .part files during download
            "--progress",                    # Show download progress information
            "--restrict-filenames",          # Replace problematic characters in filenames
            "--no-continue",                 # Don't resume partially downloaded files (prevents HTTP 416 errors)
            "--ignore-errors",               # Continue downloading other videos if one fails
            "--retries", "10",               # Retry failed downloads up to 10 times
            "--retry-sleep", "5",            # Wait 5 seconds between retry attempts
            "--no-overwrites",               # Never overwrite existing files
            url                              # The video URL to download
        ]        # Only use browser cookies if necessary or forced
        use_cookies = False
        if force_cookies:
            use_cookies = self.browser_cookies != "None"
        else:
            if self.browser_cookies != "None":
                if "youtube.com" in url.lower() or "private" in url.lower():
                    use_cookies = True
        
        if use_cookies:
            browser = self.browser_cookies.lower() if self.browser_cookies and self.browser_cookies != "None" else ""
            if browser:
                base_command.extend(["--cookies-from-browser", browser])
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

        # Prefer aria2 as external downloader when available (supports multi-connection HTTP)
        try:
            aria2_path = shutil.which('aria2') or shutil.which('aria2c')
            if aria2_path:
                # Use external downloader path to support custom names; apply args for aria2c
                base_command.extend([
                    "--external-downloader", aria2_path,
                    "--downloader-args", "aria2c:-x16 -s16 -k1M --file-allocation=none --summary-interval=0"
                ])
                self.download_output.emit(f"⚡ Using aria2 external downloader: {aria2_path}")
            else:
                # Improve ffmpeg resilience when aria2 isn't used (for HLS/DASH)
                base_command.extend([
                    "--downloader-args", "ffmpeg:-reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 2"
                ])
        except Exception:
            pass
        return base_command

    # --- Playlist numbering helpers ---
    def _extract_info(self, url: str) -> dict | None:
        """Use yt_dlp Python API to extract info without downloading."""
        if yt_dlp is None:
            # Try to auto-install the module on demand
            ok = ensure_python_module("yt_dlp", "yt-dlp", on_log=self.download_output.emit)
            if ok:
                try:
                    import importlib
                    importlib.invalidate_caches()
                    import yt_dlp as _yt  # type: ignore
                    globals()['yt_dlp'] = _yt
                except Exception as e:
                    self.download_output.emit(f"❌ Could not load yt_dlp after install: {e}")
                    return None
            else:
                self.download_output.emit("ℹ️ Skipping playlist pre-extraction (yt_dlp module not available)")
                return None
        ydl_opts = {
            'quiet': True,
            'skip_download': True,
            'nocheckcertificate': True,
            'socket_timeout': 8,
            'retries': 1,
            'extractor_retries': 1,
            'ignoreerrors': True,
            'noplaylist': False,  # allow playlist extraction even for watch?v URLs with list= param
            'extract_flat': 'in_playlist',  # faster to just get entries list
        }
        if yt_dlp is None:
            return None
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:  # type: ignore[attr-defined]
            return ydl.extract_info(url, download=False)

    def _prefer_playlist_url(self, url: str) -> str:
        """If URL is a YouTube watch link with a list= param, return the playlist URL."""
        try:
            parsed = urlparse(url)
            if parsed.netloc.lower().endswith("youtube.com"):
                qs = parse_qs(parsed.query)
                list_ids = qs.get('list') or []
                if list_ids:
                    list_id = list_ids[0]
                    return f"https://www.youtube.com/playlist?list={list_id}"
        except Exception:
            pass
        return url

    def _make_entries_list(self, info: dict | None) -> list[dict]:
        """Normalize info['entries'] to a list of dicts; return [] if unavailable."""
        if not isinstance(info, dict):
            return []
        entries = info.get('entries')
        if entries is None:
            return []
        if isinstance(entries, list):
            return entries
        try:
            return list(entries)
        except Exception:
            return []

    def _normalize_date_value(self, entry: dict) -> int | float:
        """Return YYYYMMDD as int; fallback to +inf if unavailable."""
        # Highest precedence: upload_date as YYYYMMDD string
        upload_date = entry.get('upload_date') or entry.get('playlist_uploader_date')
        if upload_date:
            try:
                return int(str(upload_date)[:8])  # guard against malformed
            except Exception:
                pass
        # Next: timestamp or release_timestamp (unix seconds)
        ts = entry.get('timestamp') or entry.get('release_timestamp')
        if ts:
            try:
                dt = datetime.fromtimestamp(int(ts), tz=timezone.utc)
                return int(dt.strftime('%Y%m%d'))
            except Exception:
                pass
        return inf

    def _sort_entries_by_date(self, entries: list[dict]) -> list[dict]:
        """Sort from oldest to newest using date, then playlist_index; stable fallback to original order."""
        def key(e: dict):
            date_val = self._normalize_date_value(e)
            pidx = e.get('playlist_index')
            try:
                pidx = int(pidx) if pidx is not None else inf
            except Exception:
                pidx = inf
            orig = e.get('_orig_pos', 0)
            return (date_val, pidx, orig)

        # Python's sort is stable; this preserves original order when keys tie
        return sorted(entries, key=key)

    def _determine_next_number(self, folder: str) -> int:
        """Scan destination folder for existing leading numbers and return next."""
        try:
            files = os.listdir(folder)
        except Exception:
            return 1
        nums = []
        pattern = re.compile(r'^(\d{2,})\s*[_\-\s]')
        for name in files:
            m = pattern.match(name)
            if m:
                try:
                    nums.append(int(m.group(1)))
                except Exception:
                    pass
        return (max(nums) + 1) if nums else 1

    def _decide_zero_pad(self, next_number: int, count: int) -> int:
        last_planned = max(next_number + max(count - 1, 0), next_number)
        return max(2, len(str(last_planned)))

    def _prefix_in_use(self, folder: str, prefix: str) -> bool:
        """Return True if any file in folder starts with the given prefix."""
        try:
            for name in os.listdir(folder):
                if name.startswith(prefix):
                    return True
        except Exception:
            pass
        return False

    def _find_free_number(self, folder: str, start_number: int, pad: int) -> int:
        n = start_number
        while True:
            prefix = f"{n:0{pad}d}_"
            if not self._prefix_in_use(folder, prefix):
                return n
            n += 1

    # The following methods are replaced by the construct_command method above but kept for backward compatibility
    def construct_video_command(self, url):
        return self.construct_command(url)

    def construct_audio_command(self, url):
        return self.construct_command(url)

    def construct_video_with_audio_command(self, url):
        return self.construct_command(url)

    def execute_command(self, command, url=None, retry_with_cookies=False):
        try:
            # Launch process and stream output
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
            stream = self.process.stdout
            for line in (stream or []):
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
            
            if stream:
                try:
                    stream.close()
                except Exception:
                    pass
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
        self.is_paused = False  # Reset pause state when stopping
        if hasattr(self, 'process') and self.process:
            try:
                # Check if process is still running before attempting to kill
                if self.process.poll() is None:
                    # If process was paused, resume it first before killing
                    if self.is_paused:
                        try:
                            self.resume()
                        except Exception:
                            pass  # Ignore errors when resuming before killing
                    
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
                # Emit download complete signal even when terminated to ensure UI cleanup
                self.download_complete.emit()
                    
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

    def pause(self):
        """Pause the download by suspending the process"""
        self.is_paused = True
        if hasattr(self, 'process') and self.process:
            try:
                # On Windows, suspend the process
                if os.name == 'nt':
                    import psutil
                    parent = psutil.Process(self.process.pid)
                    parent.suspend()
                    # Also suspend child processes (ffmpeg, etc.)
                    for child in parent.children(recursive=True):
                        try:
                            child.suspend()
                        except (psutil.NoSuchProcess, psutil.AccessDenied):
                            pass
                else:
                    # On Unix-like systems, send SIGSTOP
                    os.kill(self.process.pid, signal.SIGSTOP)
                    # Also suspend child processes
                    try:
                        import psutil
                        parent = psutil.Process(self.process.pid)
                        for child in parent.children(recursive=True):
                            try:
                                os.kill(child.pid, signal.SIGSTOP)
                            except (OSError, psutil.NoSuchProcess):
                                pass
                    except ImportError:
                        pass
                
                self.download_output.emit("⏸️ Download process paused")
            except Exception as e:
                self.download_output.emit(f"❌ Error pausing download: {str(e)}")

    def resume(self):
        """Resume the paused download"""
        self.is_paused = False
        if hasattr(self, 'process') and self.process:
            try:
                # On Windows, resume the process
                if os.name == 'nt':
                    import psutil
                    parent = psutil.Process(self.process.pid)
                    parent.resume()
                    # Also resume child processes (ffmpeg, etc.)
                    for child in parent.children(recursive=True):
                        try:
                            child.resume()
                        except (psutil.NoSuchProcess, psutil.AccessDenied):
                            pass
                else:
                    # On Unix-like systems, send SIGCONT
                    os.kill(self.process.pid, signal.SIGCONT)
                    # Also resume child processes
                    try:
                        import psutil
                        parent = psutil.Process(self.process.pid)
                        for child in parent.children(recursive=True):
                            try:
                                os.kill(child.pid, signal.SIGCONT)
                            except (OSError, psutil.NoSuchProcess):
                                pass
                    except ImportError:
                        pass
                
                self.download_output.emit("▶️ Download process resumed")
            except Exception as e:
                self.download_output.emit(f"❌ Error resuming download: {str(e)}")
