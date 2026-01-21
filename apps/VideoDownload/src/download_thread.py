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

    def __init__(self, urls, output_folder, ffmpeg_path, yt_dlp_path, download_type, resolution, custom_title="", browser_cookies="None", youtube_api_key=""):
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
        self.youtube_api_key = youtube_api_key
        self.running = True
        self.is_paused = False  # Add pause state tracking
        # Track if cookie-based downloads have failed and we should avoid cookies
        self.cookies_failed = False
        # Track success across URLs to decide whether to emit completion
        self._any_success = False
        self.last_command_succeeded = False

    def run(self):
        for url in self.urls:
            if not self.running:
                return

            # Special handling for YouTube playlists with API key
            if self.youtube_api_key and self.is_youtube_playlist(url):
                try:
                    self.process_youtube_playlist(url)
                    continue
                except Exception as e:
                    # Fallback to normal handling on any API failure
                    self.download_output.emit(f"⚠️ Playlist API fallback: {str(e)}")

            command = self.construct_command(url)
            self.execute_command(command, url=url)
            # Record whether this URL succeeded
            if getattr(self, 'last_command_succeeded', False):
                self._any_success = True

        if self.running and self._any_success:
            # Emit final progress update to ensure progress bar reaches 100% only on success
            self.download_progress.emit(100)
            self.download_complete.emit()
        elif self.running and not self._any_success:
            # Inform user and avoid signaling completion when nothing was downloaded
            self.download_output.emit("❌ No downloadable media found or all URLs failed.")

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

    # ------------- YouTube Playlist Helpers -------------
    def is_youtube_playlist(self, url: str) -> bool:
        u = url.lower()
        return ("youtube.com/playlist" in u or "list=" in u) and ("youtube.com" in u or "youtu.be" in u)

    def _extract_playlist_id(self, url: str) -> str:
        try:
            from urllib.parse import urlparse, parse_qs
            parsed = urlparse(url)
            qs = parse_qs(parsed.query)
            if 'list' in qs:
                return qs['list'][0]
        except Exception:
            pass
        # Fallback: simple regex
        m = re.search(r'[?&]list=([A-Za-z0-9_-]+)', url)
        return m.group(1) if m else ""

    def fetch_youtube_playlist_items(self, playlist_id: str):
        """Fetch playlist items using YouTube Data API v3 and order by actual upload date (older -> newest).

        In frozen executables, SSL certificate bundles may be missing. We try to use certifi if available
        and gracefully fall back to an unverified SSL context to preserve functionality.
        """
        import json
        import ssl
        from urllib.request import urlopen
        from urllib.parse import urlencode
        from datetime import datetime

        def _urlopen(url: str):
            ctx = None
            try:
                # Prefer verified context using certifi if present
                try:
                    import certifi  # type: ignore
                    ctx = ssl.create_default_context(cafile=certifi.where())
                except Exception:
                    # Fallback to default context which may use system store
                    ctx = ssl.create_default_context()
            except Exception:
                # Last resort: unverified context (avoid breaking functionality in frozen builds)
                try:
                    ctx = ssl._create_unverified_context()
                except Exception:
                    ctx = None
            if ctx is not None:
                return urlopen(url, context=ctx)
            return urlopen(url)

        items = []
        page_token = None
        video_ids_in_playlist_order = []
        id_to_meta = {}
        # First fetch playlist entries (gives us videoIds and titles)
        while True:
            params = {
                'part': 'snippet',
                'maxResults': 50,
                'playlistId': playlist_id,
                'key': self.youtube_api_key,
            }
            if page_token:
                params['pageToken'] = page_token
            url = f"https://www.googleapis.com/youtube/v3/playlistItems?{urlencode(params)}"
            with _urlopen(url) as resp:
                data = json.loads(resp.read().decode('utf-8', errors='ignore'))
            for it in data.get('items', []):
                sn = it.get('snippet', {})
                vid = sn.get('resourceId', {}).get('videoId')
                title = sn.get('title') or ''
                if vid:
                    video_ids_in_playlist_order.append(vid)
                    id_to_meta[vid] = {'title': title}
            page_token = data.get('nextPageToken')
            if not page_token:
                break

        if not video_ids_in_playlist_order:
            return []

        # Fetch upload dates for videos in chunks of 50
        def chunks(lst, n):
            for i in range(0, len(lst), n):
                yield lst[i:i + n]

        for batch in chunks(video_ids_in_playlist_order, 50):
            params = {
                'part': 'snippet',  # snippet.publishedAt is the upload date
                'id': ','.join(batch),
                'key': self.youtube_api_key,
                'maxResults': 50,
            }
            url = f"https://www.googleapis.com/youtube/v3/videos?{urlencode(params)}"
            with _urlopen(url) as resp:
                vdata = json.loads(resp.read().decode('utf-8', errors='ignore'))
            for v in vdata.get('items', []):
                vid = v.get('id')
                sn = v.get('snippet', {})
                published = sn.get('publishedAt')  # ISO 8601
                if vid in id_to_meta:
                    id_to_meta[vid]['publishedAt'] = published

        # Build items list and sort by upload date ascending, fallback to playlist order if missing
        for idx, vid in enumerate(video_ids_in_playlist_order):
            meta = id_to_meta.get(vid, {})
            items.append({
                'videoId': vid,
                'title': meta.get('title', ''),
                'publishedAt': meta.get('publishedAt'),
                'playlistIndex': idx,
            })

        def parse_dt(s):
            if not s:
                return None
            try:
                # Handle trailing Z
                if s.endswith('Z'):
                    s = s[:-1] + '+00:00'
                return datetime.fromisoformat(s)
            except Exception:
                return None

        # Sort by upload date ascending; if missing date, place after dated entries keeping playlist order
        def sort_key(x):
            dt = parse_dt(x.get('publishedAt'))
            has_date = 0 if dt is not None else 1  # 0 = has date, 1 = missing
            return (has_date, dt or datetime.max, x['playlistIndex'])

        items.sort(key=sort_key)
        return items

    def normalize_title_for_compare(self, name: str) -> str:
        base = name or ''
        # Remove extension if present
        base = re.sub(r'\.[A-Za-z0-9]{1,5}$', '', base)
        # Remove leading numeric enumeration like "001 - ", "12_", "3) "
        base = re.sub(r'^\s*\d+\s*[-_.)]\s*', '', base)
        # Remove trailing resolution markers like _1080p or _640x360
        base = re.sub(r'_[0-9]{3,4}p$', '', base, flags=re.IGNORECASE)
        base = re.sub(r'_\d{2,4}x\d{2,4}$', '', base, flags=re.IGNORECASE)
        # Sanitize and mimic --restrict-filenames basic effects
        base = self.sanitize_path(base)
        base = re.sub(r'\s+', '_', base)  # spaces to underscores
        # Lowercase for stable comparison
        return base.strip().lower()

    def collect_existing_titles(self):
        exts = ('.mp4', '.mkv', '.webm', '.mp3', '.m4a', '.wav', '.mov', '.flv')
        existing = []
        max_num = 0
        try:
            for fn in os.listdir(self._normalized_output_folder):
                if not fn.lower().endswith(exts):
                    continue
                # Track max leading number if present
                m = re.match(r'\s*(\d+)\s*[-_.)]', fn)
                if m:
                    try:
                        max_num = max(max_num, int(m.group(1)))
                    except ValueError:
                        pass
                # Compare against just the base name without extension
                base = os.path.splitext(fn)[0]
                existing.append(self.normalize_title_for_compare(base))
        except Exception:
            pass
        return set(existing), max_num

    def _title_exists(self, candidate_norm: str, existing_norms: set) -> bool:
        """Robust check: exact or substring containment either way."""
        if candidate_norm in existing_norms:
            return True
        for ex in existing_norms:
            if not ex or not candidate_norm:
                continue
            if candidate_norm in ex or ex in candidate_norm:
                return True
        return False

    def process_youtube_playlist(self, url: str):
        playlist_id = self._extract_playlist_id(url)
        if not playlist_id:
            raise ValueError('Could not extract playlistId')

        self.download_output.emit('🎵 Fetching playlist items via API...')
        items = self.fetch_youtube_playlist_items(playlist_id)
        total = len(items)
        if total == 0:
            self.download_output.emit('⚠️ Playlist is empty')
            return

        # items are already ordered by upload date older -> newest
        existing_titles, max_enum = self.collect_existing_titles()
        pad = max(3, len(str(total)))

        # Build list to download skipping existing by title (ignoring numbers)
        to_download = []
        for i, it in enumerate(items, start=1):
            title_norm = self.normalize_title_for_compare(it.get('title', ''))
            if self._title_exists(title_norm, existing_titles):
                continue
            # Next enumeration continues from max existing number
            enum_num = max_enum + len(to_download) + 1
            to_download.append((enum_num, it))

        if not to_download:
            self.download_output.emit('✅ No new videos to download')
            return

        # Download each video with enumerated filename
        for enum_num, it in to_download:
            if not self.running:
                return
            vid = it['videoId']
            video_url = f"https://www.youtube.com/watch?v={vid}"
            # Build base command then replace output template
            command = self.construct_command(video_url)
            # Create per-item output template
            num_str = str(enum_num).zfill(pad)
            if self.download_type == "audio":
                item_template = f"{self._normalized_output_folder}\\{num_str} - %(title)s.%(ext)s"
            else:
                item_template = f"{self._normalized_output_folder}\\{num_str} - %(title)s_%(resolution)s.%(ext)s"
            # Replace the -o template in command
            try:
                o_idx = command.index('-o')
                command[o_idx + 1] = item_template
            except ValueError:
                # If not found, append
                command.extend(['-o', item_template])

            self.download_output.emit(f"⬇️ {num_str} - {it.get('title','(untitled)')}")
            self.execute_command(command, url=video_url)

    def construct_command(self, url, force_cookies=False, skip_cookies=False):
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
            self._normalized_yt_dlp_path,    # Path to yt-dlp executable
            "--no-cache-dir",                # Don't cache downloaded data (saves disk space)
            "--no-check-certificates",       # Skip SSL certificate verification for problematic sites
            "--add-metadata",                # Embed metadata into downloaded files
            "-o", output_template,           # Set output filename template
            "--ffmpeg-location", self._normalized_ffmpeg_path,  # Path to ffmpeg for video processing
            "--concurrent-fragments", "5",   # Download 5 video fragments simultaneously (faster downloads)
            "--no-part",                     # Don't create .part files during download
            "--progress",                    # Show download progress information
            "--restrict-filenames",          # Replace problematic characters in filenames
            "--no-continue",                 # Don't resume partially downloaded files (prevents HTTP 416 errors)
            "--no-overwrites",               # Do not overwrite files that already exist; skip them
            "--ignore-errors",               # Continue downloading other videos if one fails
            "--retries", "10",               # Retry failed downloads up to 10 times
            "--retry-sleep", "5",            # Wait 5 seconds between retry attempts
            url                              # The video URL to download
        ]
        # Only use browser cookies if necessary or forced, unless disabled after failures
        use_cookies = False
        if not skip_cookies and not self.cookies_failed:
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
            # --live-from-start only for live: moved below
            # Add safer audio handling to avoid "Function not implemented" errors
            base_command.extend([
                "--audio-quality", "0",  # Use highest audio quality
                # --hls-use-mpegts only for live (moved below)
                # Specify path for temporary files
                "--paths", f"temp:{self._normalized_output_folder}",  # Specify temp file location
                # Use a modern desktop user agent for requests that use UA
                "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
            ])
            if '/live/' in url.lower() or 'livestream' in url.lower():
                base_command.append("--live-from-start")
                self.download_output.emit("🔴 YouTube live stream detected - Using enhanced audio processing")
                base_command.extend(["--hls-use-mpegts"])
        elif 'twitch.tv' in url.lower():
            # Common Twitch parameters for both live and VOD
            base_command.extend([
                "--wait-for-video", "5",  # Wait up to 5 seconds for live stream
                "--downloader", "ffmpeg",  # Use ffmpeg directly for downloading
                # --hls-use-mpegts only for live (moved below)
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
                # --live-from-start only for live: moved below
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

    def _preserve_output_template(self, src_cmd, dst_cmd):
        """Ensure dst_cmd uses the same -o template as src_cmd (used on retries)."""
        try:
            s_idx = src_cmd.index('-o')
            src_tpl = src_cmd[s_idx + 1]
        except ValueError:
            return dst_cmd
        # Put/replace in dst
        try:
            d_idx = dst_cmd.index('-o')
            dst_cmd[d_idx + 1] = src_tpl
        except ValueError:
            dst_cmd.extend(['-o', src_tpl])
        return dst_cmd

    def execute_command(self, command, url=None, retry_with_cookies=False, attempted_no_cookies=False, fallback_stage=0):
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
                                # Detect YouTube client restriction error; prefer alternate client with cookies over dropping cookies
                if 'not available on this app' in line.lower() or 'watch on the latest version of youtube' in line.lower():
                    if url and fallback_stage <= 1:
                        try:
                            self.process.terminate()
                        except Exception:
                            pass
                        self.wait_with_timeout(self.process, 2)
                        # Stage 0 -> retry default (tv,web_safari,web) without cookies; Stage 1 -> retry tv-only without cookies
                        if fallback_stage == 0:
                            self.download_output.emit('⚠️ YouTube restriction: Retrying with default clients (no cookies)…')
                            self.cookies_failed = True
                            fresh_command = self.construct_command(url, force_cookies=False, skip_cookies=True)
                            fresh_command = self._preserve_output_template(command, fresh_command)
                            # Ensure we use default clients excluding mobile
                            try:
                                ei = fresh_command.index("--extractor-args")
                                del fresh_command[ei:ei+2]
                            except ValueError:
                                pass
                            fresh_command.extend(["--extractor-args", "youtube:player_client=default,-ios,-android"])
                            self.execute_command(fresh_command, url=url, retry_with_cookies=False, attempted_no_cookies=True, fallback_stage=1)
                            return
                        else:  # fallback_stage == 1
                            self.download_output.emit('⚠️ YouTube restriction: Retrying with TV client (no cookies)…')
                            self.cookies_failed = True
                            fresh_command = self.construct_command(url, force_cookies=False, skip_cookies=True)
                            fresh_command = self._preserve_output_template(command, fresh_command)
                            try:
                                ei = fresh_command.index("--extractor-args")
                                del fresh_command[ei:ei+2]
                            except ValueError:
                                pass
                            fresh_command.extend(["--extractor-args", "youtube:player_client=tv,tv_embedded"])
                            self.execute_command(fresh_command, url=url, retry_with_cookies=False, attempted_no_cookies=True, fallback_stage=2)
                            return
                # (secondary retries handled by fallback_stage above)

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
                        fresh_command = self._preserve_output_template(command, fresh_command)
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
                elif 'error:' in line.lower() or line.strip().startswith('ERROR:'):
                    error_detected = True
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
            # Set last command success based on return code and lack of detected errors
            try:
                rc = self.process.returncode
            except Exception:
                rc = None
            self.last_command_succeeded = (rc == 0 and not error_detected)
            
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

