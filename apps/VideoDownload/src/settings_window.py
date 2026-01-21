from PyQt5.QtWidgets import (
    QDialog,
    QVBoxLayout,
    QHBoxLayout,
    QLineEdit,
    QPushButton,
    QLabel,
    QFileDialog,
    QMessageBox,
    QSpacerItem,
    QSizePolicy,
    QCheckBox,
    QComboBox,
    QProgressBar,
)
from PyQt5.QtCore import QSettings, pyqtSignal, QThread
from .helpers import (
    find_executable,
    check_and_update_path,
    browse_for_executable,
    save_app_settings,
    load_app_settings,
    get_subprocess_no_window_kwargs,
    find_with_winget,
)
from .constants import (
    BUTTON_BACKGROUND_COLOR,
    BUTTON_TEXT_COLOR,
    INPUT_BACKGROUND_COLOR,
    INPUT_TEXT_COLOR,
)
import os
import sys
import subprocess
import shutil
import time


class InstallationWorker(QThread):
    """Worker thread for package installations to prevent UI freezing"""
    installation_started = pyqtSignal(str)  # package name
    installation_finished = pyqtSignal(str, bool, str)  # package name, success, message
    installation_progress = pyqtSignal(str)  # progress message
    
    def __init__(self, package_type, parent=None):
        super().__init__(parent)
        self.package_type = package_type
        self.success = False
        self.message = ""
        
        # Define dependency installation configurations
        self.dependency_configs = {
            "ffmpeg": {
                "name": "FFmpeg",
                "check_cmd": "ffmpeg",
                "install_cmd": [
                    "winget", "install", "--id", "Gyan.FFmpeg", "--exact",
                    "--silent", "--accept-package-agreements", "--accept-source-agreements"
                ],
                "upgrade_cmd": [
                    "winget", "upgrade", "--id", "Gyan.FFmpeg", "--exact",
                    "--silent", "--accept-package-agreements", "--accept-source-agreements"
                ],
                "package_id": "Gyan.FFmpeg"
            },
            "ytdlp": {
                "name": "yt-dlp",
                "check_cmd": "yt-dlp",
                "install_cmd": [
                    "winget", "install", "--id", "yt-dlp.yt-dlp", "--exact",
                    "--silent", "--accept-package-agreements", "--accept-source-agreements"
                ],
                "upgrade_cmd": [
                    "winget", "upgrade", "--id", "yt-dlp.yt-dlp", "--exact",
                    "--silent", "--accept-package-agreements", "--accept-source-agreements"
                ],
                "package_id": "yt-dlp.yt-dlp"
            },
            "aria2c": {
                "name": "aria2c",
                "check_cmd": "aria2c",
                "install_cmd": [
                    "winget", "install", "--id", "aria2.aria2", "--exact",
                    "--silent", "--accept-package-agreements", "--accept-source-agreements"
                ],
                "upgrade_cmd": [
                    "winget", "upgrade", "--id", "aria2.aria2", "--exact",
                    "--silent", "--accept-package-agreements", "--accept-source-agreements"
                ],
                "package_id": "aria2.aria2"
            }
        }
        
    def run(self):
        """Run the installation in a separate thread"""
        try:
            if self.package_type in self.dependency_configs:
                config = self.dependency_configs[self.package_type]
                self._install_dependency(**config)
            else:
                raise ValueError(f"Unknown package type: {self.package_type}")
        except Exception as e:
            self.success = False
            self.message = f"Installation failed: {str(e)}"
        finally:
            self.installation_finished.emit(self.package_type, self.success, self.message)
    
    def _emit_progress(self, text: str):
        try:
            # Normalize whitespace of carriage-returned progress updates
            for part in str(text).replace("\r", "\n").splitlines():
                part = part.strip()
                if part:
                    self.installation_progress.emit(part)
        except Exception:
            pass

    def _run_with_progress(self, cmd: list, phase_label: str):
        """Run a command, streaming output and emitting progress with percents.

        Returns (returncode, tail_output:str)
        """
        try:
            # Merge stderr into stdout so we don't miss progress lines
            proc = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                errors="replace",  # avoid garbled characters from codepage differences
                bufsize=1,
                universal_newlines=True,
                **get_subprocess_no_window_kwargs(),
            )
        except FileNotFoundError as e:
            self._emit_progress(f"Failed to start: {' '.join(cmd)}")
            self._emit_progress(str(e))
            return 127, str(e)

        percent_last = -1
        tail = []
        try:
            import re
            percent_re = re.compile(r"(\d{1,3})%")
        except Exception:
            percent_re = None

        if proc.stdout is not None:
            for raw in proc.stdout:
                line = raw.rstrip("\n")
                if not line:
                    continue
                # Emit the raw line first (UI shows text updates)
                self._emit_progress(line)
                # track tail
                tail.append(line)
                if len(tail) > 100:
                    tail.pop(0)
                # Try to extract a percentage for the progress bar
                if percent_re:
                    m = percent_re.search(line)
                    if m:
                        try:
                            pct = int(m.group(1))
                            if pct != percent_last:
                                percent_last = pct
                                self.installation_progress.emit(f"{phase_label}: {pct}%")
                        except Exception:
                            pass

        proc.wait()
        return proc.returncode, "\n".join(tail)

    def _locate_after_winget(self, check_cmd: str, package_id: str) -> str:
        """Try multiple strategies to resolve the final executable path after an install/upgrade."""
        # 1) Normal PATH/where discovery
        p = find_executable(check_cmd)
        if p:
            return p
        # 2) WinGet-managed locations/shims
        p = find_with_winget(package_id, check_cmd)
        if p:
            return p
        # 3) Fallback to system which
        return shutil.which(check_cmd) or ""

    def _install_dependency(self, name, check_cmd, install_cmd, upgrade_cmd, package_id, extra_checks=None):
        """Generic method to install or update a dependency"""
        self.installation_progress.emit(f"Checking for existing {name} installation...")
        executable_path = self._locate_after_winget(check_cmd, package_id)

        # Helper: check if winget is available
        def winget_available() -> bool:
            return bool(shutil.which('winget'))

        if executable_path:
            # Already installed; attempt upgrade only if winget is present
            if winget_available():
                self.installation_progress.emit(f"{name} found. Checking for updates...")
                try:
                    rc, tail = self._run_with_progress(upgrade_cmd, f"Updating {name}")
                    if rc == 0:
                        self.installation_progress.emit(f"{name} updated successfully!")
                        self.success = True
                        self.message = f"{name} updated at: {executable_path}"
                    else:
                        # Treat non-zero as non-fatal if the tool remains present (e.g. no updates available)
                        self.success = True
                        self.message = (
                            f"{name} installed at: {executable_path}. No update applied (winget rc {rc})."
                        )
                except FileNotFoundError:
                    # Very unlikely here, but handle just in case
                    self.success = True
                    self.message = f"{name} installed at: {executable_path}. Winget not available to upgrade."
            else:
                self.success = True
                self.message = f"{name} installed at: {executable_path}. Winget not found; leaving as-is."

            # If yt-dlp was handled, also ensure Python extras are available
            if check_cmd == 'yt-dlp':
                self._ensure_ytdlp_extras()
            return
        
        self.installation_progress.emit(f"Installing {name}...")
        # For fresh install, require winget; if missing, provide actionable message
        if not winget_available():
            self.success = False
            self.message = (
                f"Cannot install {name}: winget (App Installer) not found.\n"
                "Install 'App Installer' from Microsoft Store, restart the app, or manually set the path in Settings."
            )
            return

        try:
            rc, tail = self._run_with_progress(install_cmd, f"Installing {name}")
        except FileNotFoundError as e:
            # Defensive: translate WinError 2 into a clear message
            self.success = False
            self.message = (
                f"Failed to run installer for {name}: {str(e)}.\n"
                "winget is not available. Install 'App Installer' or add winget to PATH, then retry."
            )
            return
        
        if rc == 0:
            self.installation_progress.emit("Waiting for installation to complete...")
            time.sleep(3)  # Give time for installation to complete
            
            # Check if installation was successful
            executable_path = self._locate_after_winget(check_cmd, package_id)
            if executable_path:
                self.success = True
                self.message = f"{name} successfully installed at: {executable_path}"
                # Also ensure Python extras for yt-dlp
                if check_cmd == 'yt-dlp':
                    self._ensure_ytdlp_extras()
            else:
                # Try additional checks if provided
                found_path = None
                if extra_checks and callable(extra_checks):
                    found_path = extra_checks()
                
                if found_path:
                    self.success = True
                    self.message = f"{name} successfully installed at: {found_path}"
                    if check_cmd == 'yt-dlp':
                        self._ensure_ytdlp_extras()
                else:
                    self.success = False
                    self.message = f"{name} installed but not found in PATH. Manual path setting required."
        else:
            # Even if winget returned non-zero, treat as success if the executable is now present
            self.installation_progress.emit("Verifying installation state after winget...")
            executable_path = self._locate_after_winget(check_cmd, package_id)
            if executable_path:
                self.success = True
                self.message = (
                    f"{name} installed or already present at: {executable_path} (winget rc {rc})."
                )
                if check_cmd == 'yt-dlp':
                    self._ensure_ytdlp_extras()
            else:
                # Try additional checks
                found_path = None
                if extra_checks and callable(extra_checks):
                    found_path = extra_checks()
                if found_path:
                    self.success = True
                    self.message = (
                        f"{name} installed or already present at: {found_path} (winget rc {rc})."
                    )
                    if check_cmd == 'yt-dlp':
                        self._ensure_ytdlp_extras()
                else:
                    self.success = False
                    # Include tail of output to aid debugging
                    self.message = (
                        f"Failed to install {name}: winget returned {rc}.\n"
                        f"Last output:\n{tail}"
                    )

    def _ensure_ytdlp_extras(self):
        """Install/upgrade yt-dlp with extras in the current Python env.

        This allows use of optional deps like curl_cffi when invoking the Python package,
        while still keeping the winget-installed CLI available. Does not change the
        selected yt-dlp path in settings.
        """
        interpreter_cmds = []

        if getattr(sys, "frozen", False):
            env_py = os.environ.get("PYTHON_EXECUTABLE")
            if env_py:
                interpreter_cmds.append([env_py])
            launcher = shutil.which("py")
            if launcher:
                interpreter_cmds.append([launcher, "-3"])
            for name in ("python3", "python", "pythonw"):
                path_candidate = shutil.which(name)
                if path_candidate:
                    interpreter_cmds.append([path_candidate])
        else:
            exe = getattr(sys, "executable", None)
            if exe:
                interpreter_cmds.append([exe])

        if not interpreter_cmds:
            interpreter_cmds.append(["python"])

        self.installation_progress.emit("Ensuring Python extras for yt-dlp (default,curl-cffi)...")
        package_spec = "yt-dlp[default,curl-cffi]"
        last_rc = None
        last_output = ""

        for base_cmd in interpreter_cmds:
            cmd = base_cmd + ['-m', 'pip', 'install', '-U', package_spec]
            rc, tail = self._run_with_progress(cmd, "Installing yt-dlp extras")
            if rc == 0:
                self.installation_progress.emit("yt-dlp Python extras installed successfully.")
                return
            last_rc, last_output = rc, tail

        if last_rc is None:
            self.installation_progress.emit(
                "Warning: No Python interpreter found to install yt-dlp extras. Install manually with: pip install -U \"yt-dlp[default,curl-cffi]\""
            )
        else:
            message = f"Warning: Failed to install yt-dlp extras via pip (rc {last_rc}). You can install manually: pip install -U '{package_spec}'"
            if last_output:
                message += f"\nLast output:\n{last_output}"
            self.installation_progress.emit(message)


class SettingsWindow(QDialog):
    settings_saved = pyqtSignal()  # Define a custom signal

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Settings")
        self.setStyleSheet("background-color: #000128;")
        self.setMinimumSize(400, 300)

        self.settings = QSettings("YourCompany", "VideoDownloadApp")
        # Defer expensive installation checks until the tab is actually shown
        self._checks_initialized = False
        
        # Initialize worker thread variables
        self.installation_worker = None
        self.progress_dialog = None
        
        layout = QVBoxLayout(self)

        install_layout = QHBoxLayout()
        
        # Create status labels first
        self.ffmpeg_status = QLabel()
        self.ytdlp_status = QLabel()
        self.aria2_status = QLabel()
        
        # FFmpeg section with status
        ffmpeg_section = QVBoxLayout()
        install_ffmpeg_button = QPushButton("Install/Update FFmpeg")
        install_ffmpeg_button.setToolTip(
            "FFmpeg is a complete solution to record, convert and stream audio and video.\n"
            "• Required for video processing and format conversion\n"
            "• Handles video/audio encoding and decoding\n"
            "• Essential for merging video and audio streams\n"
            "• Will install if not present, or update if already installed"
        )
        install_ffmpeg_button.clicked.connect(self.install_ffmpeg)
        install_ffmpeg_button.setStyleSheet(
            f"QPushButton {{ background-color: {BUTTON_BACKGROUND_COLOR}; color: {BUTTON_TEXT_COLOR}; font-weight: bold; }}")
        
        self.ffmpeg_status.setStyleSheet("color: white;")
        ffmpeg_section.addWidget(install_ffmpeg_button)
        ffmpeg_section.addWidget(self.ffmpeg_status)
        install_layout.addLayout(ffmpeg_section)

        # yt-dlp section with status
        ytdlp_section = QVBoxLayout()
        install_ytdlp_button = QPushButton("Install/Update yt-dlp")
        install_ytdlp_button.setToolTip(
            "yt-dlp is a youtube-dl fork with additional features and fixes.\n"
            "• Downloads videos from YouTube and other platforms\n"
            "• Supports various video qualities and formats\n"
            "• Handles live streams and playlists\n"
            "• Will install if not present, or update if already installed"
        )
        install_ytdlp_button.clicked.connect(self.install_ytdlp)
        install_ytdlp_button.setStyleSheet(
            f"QPushButton {{ background-color: {BUTTON_BACKGROUND_COLOR}; color: {BUTTON_TEXT_COLOR}; font-weight: bold; }}")
        
        self.ytdlp_status.setStyleSheet("color: white;")
        ytdlp_section.addWidget(install_ytdlp_button)
        ytdlp_section.addWidget(self.ytdlp_status)
        install_layout.addLayout(ytdlp_section)

        # aria2c section with status
        aria2_section = QVBoxLayout()
        install_aria2_button = QPushButton("Install/Update aria2")
        install_aria2_button.setToolTip(
            "aria2 is a lightweight multi-protocol download utility.\n"
            "• Accelerates downloads with multi-connection downloading\n"
            "• Improves download stability and speed\n"
            "• Supports resuming interrupted downloads\n"
            "• Will install if not present, or update if already installed"
        )
        install_aria2_button.clicked.connect(self.install_aria2c)
        install_aria2_button.setStyleSheet(
            f"QPushButton {{ background-color: {BUTTON_BACKGROUND_COLOR}; color: {BUTTON_TEXT_COLOR}; font-weight: bold; }}")
        
        self.aria2_status.setStyleSheet("color: white;")
        aria2_section.addWidget(install_aria2_button)
        aria2_section.addWidget(self.aria2_status)
        install_layout.addLayout(aria2_section)

        layout.addLayout(install_layout)

        spacer1 = QSpacerItem(20, 10, QSizePolicy.Minimum, QSizePolicy.Fixed)
        layout.addItem(spacer1)

        # Browser cookies section
        cookies_section = QHBoxLayout()
        
        cookies_label = QLabel("<b>Use Browser Cookies:</b>")
        cookies_label.setStyleSheet("color: white;")
        cookies_label.setToolTip(
            "Use cookies from your browser to bypass age restrictions and access private videos.\n"
            "Required for accessing age-restricted or private YouTube content."
        )
        cookies_section.addWidget(cookies_label)
        
        self.browser_combobox = QComboBox()
        self.browser_combobox.addItems(["None", "Chrome", "Firefox", "Edge", "Safari", "Opera", "Brave"])
        self.browser_combobox.setStyleSheet(
            "QComboBox { background-color: #06283D; color: white; font-weight: bold; }"
            "QComboBox QAbstractItemView { background-color: #06283D; color: white; font-weight: bold; selection-background-color: #1363DF; }"
        )
        self.browser_combobox.setToolTip(
            "Select which browser to use for cookies.\n"
            "Select 'None' to disable using cookies."
        )
        self.browser_combobox.setMinimumWidth(200)  # Make it wider like in the image
        cookies_section.addWidget(self.browser_combobox)
        
        layout.addLayout(cookies_section)

        ffmpeg_layout = QHBoxLayout()
        ffmpeg_label = QLabel("<b>FFmpeg Path:</b>")
        ffmpeg_label.setStyleSheet("color: white;")
        ffmpeg_layout.addWidget(ffmpeg_label)

        self.ffmpeg_input = QLineEdit()
        self.ffmpeg_input.setStyleSheet(
            f"QLineEdit {{ background-color: {INPUT_BACKGROUND_COLOR}; color: {INPUT_TEXT_COLOR}; font-weight: bold; }}")
        ffmpeg_layout.addWidget(self.ffmpeg_input)

        ffmpeg_browse_button = QPushButton("Browse")
        ffmpeg_browse_button.clicked.connect(self.browse_ffmpeg)
        ffmpeg_browse_button.setStyleSheet(
            f"QPushButton {{ background-color: {BUTTON_BACKGROUND_COLOR}; color: {BUTTON_TEXT_COLOR}; font-weight: bold; }}")
        ffmpeg_layout.addWidget(ffmpeg_browse_button)

        layout.addLayout(ffmpeg_layout)

        ytdlp_layout = QHBoxLayout()
        ytdlp_label = QLabel("<b>yt-dlp Path:</b>")
        ytdlp_label.setStyleSheet("color: white;")
        ytdlp_layout.addWidget(ytdlp_label)

        self.yt_dlp_input = QLineEdit()
        self.yt_dlp_input.setStyleSheet(
            f"QLineEdit {{ background-color: {INPUT_BACKGROUND_COLOR}; color: {INPUT_TEXT_COLOR}; font-weight: bold; }}")
        ytdlp_layout.addWidget(self.yt_dlp_input)

        ytdlp_browse_button = QPushButton("Browse")
        ytdlp_browse_button.clicked.connect(self.browse_ytdlp)
        ytdlp_browse_button.setStyleSheet(
            f"QPushButton {{ background-color: {BUTTON_BACKGROUND_COLOR}; color: {BUTTON_TEXT_COLOR}; font-weight: bold; }}")
        ytdlp_layout.addWidget(ytdlp_browse_button)

        layout.addLayout(ytdlp_layout)

        # YouTube Data API v3 Key
        api_layout = QHBoxLayout()
        api_label = QLabel("<b>YouTube API v3 Key:</b>")
        api_label.setStyleSheet("color: white;")
        api_label.setToolTip(
            "Opcional: añade tu clave de YouTube Data API v3.\n"
            "Se usará para mejorar la detección/listado de playlists y evitar límites."
        )
        api_layout.addWidget(api_label)

        self.youtube_api_input = QLineEdit()
        self.youtube_api_input.setEchoMode(QLineEdit.Password)
        self.youtube_api_input.setPlaceholderText("AIza... o clave del proyecto")
        self.youtube_api_input.setStyleSheet(
            f"QLineEdit {{ background-color: {INPUT_BACKGROUND_COLOR}; color: {INPUT_TEXT_COLOR}; font-weight: bold; }}")
        api_layout.addWidget(self.youtube_api_input)

        self.api_show_checkbox = QCheckBox("Mostrar")
        self.api_show_checkbox.setStyleSheet("color: white;")
        self.api_show_checkbox.setToolTip("Mostrar/ocultar la clave")
        self.api_show_checkbox.stateChanged.connect(
            lambda s: self.youtube_api_input.setEchoMode(QLineEdit.Normal if s else QLineEdit.Password)
        )
        api_layout.addWidget(self.api_show_checkbox)

        layout.addLayout(api_layout)

        spacer2 = QSpacerItem(20, 20, QSizePolicy.Minimum,
                              QSizePolicy.Expanding)
        layout.addItem(spacer2)

        save_button = QPushButton("Save")
        save_button.clicked.connect(self.save_settings)
        save_button.setStyleSheet(
            f"QPushButton {{ background-color: {BUTTON_BACKGROUND_COLOR}; color: {BUTTON_TEXT_COLOR}; font-weight: bold; }}")
        layout.addWidget(save_button)

        # Load settings first
        self.load_settings()

        # Do NOT run heavy checks here to avoid slowing app startup.
        # They will be triggered when the Settings tab is opened.

    def ensure_checked(self):
        """Run installation checks once when the tab is first shown, in background."""
        if self._checks_initialized:
            return
        self._checks_initialized = True

        # Show interim status (non-blocking)
        try:
            self.ffmpeg_status.setText("Checking…")
            self.ffmpeg_status.setStyleSheet("color: #cccccc;")
            self.ytdlp_status.setText("Checking…")
            self.ytdlp_status.setStyleSheet("color: #cccccc;")
            self.aria2_status.setText("Checking…")
            self.aria2_status.setStyleSheet("color: #cccccc;")
        except Exception:
            pass

        # Start background worker
        self._check_worker = _DependencyCheckWorker(self)
        self._check_worker.results_ready.connect(self._on_checks_ready)
        self._check_worker.finished.connect(lambda: setattr(self, '_check_worker', None))
        self._check_worker.start()

    def _on_checks_ready(self, results: dict):
        """Update UI with background check results (runs in GUI thread)."""
        ffmpeg_path = results.get('ffmpeg_path')
        ytdlp_path = results.get('yt_dlp_path')  # correct key name
        aria2c_installed = results.get('aria2c_installed', False)

        # Honor existing valid paths in inputs if discovery failed
        try:
            if not ffmpeg_path:
                existing = self.ffmpeg_input.text()
                if existing and os.path.exists(existing):
                    ffmpeg_path = existing
            if not ytdlp_path:
                existing = self.yt_dlp_input.text()
                if existing and os.path.exists(existing):
                    ytdlp_path = existing
        except Exception:
            pass

        if ffmpeg_path and not self.ffmpeg_input.text():
            self.ffmpeg_input.setText(ffmpeg_path)
            self.settings.setValue("ffmpeg_path", ffmpeg_path)
        if ytdlp_path and not self.yt_dlp_input.text():
            self.yt_dlp_input.setText(ytdlp_path)
            self.settings.setValue("yt_dlp_path", ytdlp_path)

        # Update status labels
        if ffmpeg_path:
            self.ffmpeg_status.setText("✔ Installed")
            self.ffmpeg_status.setStyleSheet("color: #00ff00;")
        else:
            self.ffmpeg_status.setText("✖ Not Installed")
            self.ffmpeg_status.setStyleSheet("color: #ff0000;")

        if ytdlp_path:
            self.ytdlp_status.setText("✔ Installed")
            self.ytdlp_status.setStyleSheet("color: #00ff00;")
        else:
            self.ytdlp_status.setText("✖ Not Installed")
            self.ytdlp_status.setStyleSheet("color: #ff0000;")

        if aria2c_installed:
            self.aria2_status.setText("✔ Installed")
            self.aria2_status.setStyleSheet("color: #00ff00;")
        else:
            self.aria2_status.setText("✖ Not Installed")
            self.aria2_status.setStyleSheet("color: #ff0000;")

        # Persist selected browser choice in settings for completeness
        self.settings.setValue("browser_cookies", self.browser_combobox.currentText())

        # Note: keep check_installations() available for explicit refresh after installs

    def browse_ffmpeg(self):
        browse_for_executable(self, self.ffmpeg_input, "ffmpeg")

    def browse_ytdlp(self):
        browse_for_executable(self, self.yt_dlp_input, "yt-dlp")

    def save_settings(self):
        settings_data = {
            "ffmpeg_path": self.ffmpeg_input.text(),
            "yt_dlp_path": self.yt_dlp_input.text(),
            "browser_cookies": self.browser_combobox.currentText(),
            "youtube_api_key": self.youtube_api_input.text(),
        }
        save_app_settings(self.settings, settings_data)
        self.settings_saved.emit()  # Emit the custom signal
        self.accept()

    def load_settings(self):
        settings_data = load_app_settings(self.settings)
        
        if settings_data.get("ffmpeg_path"):
            self.ffmpeg_input.setText(settings_data["ffmpeg_path"])
        if settings_data.get("yt_dlp_path"):
            self.yt_dlp_input.setText(settings_data["yt_dlp_path"])
        if settings_data.get("youtube_api_key"):
            self.youtube_api_input.setText(settings_data["youtube_api_key"])
        
        # Restore browser selection if present
        browser_cookies = settings_data.get("browser_cookies", "None")
        index = self.browser_combobox.findText(browser_cookies)
        if index >= 0:
            self.browser_combobox.setCurrentIndex(index)

    def install_ffmpeg(self):
        """Start FFmpeg installation in a separate thread"""
        self._start_installation("ffmpeg", "Installing FFmpeg")
    
    def install_ytdlp(self):
        """Start yt-dlp installation in a separate thread"""
        self._start_installation("ytdlp", "Installing yt-dlp")
    
    def install_aria2c(self):
        """Start aria2c installation in a separate thread"""
        self._start_installation("aria2c", "Installing aria2c")
    
    def _start_installation(self, package_type, title):
        """Generic method to start installation in worker thread"""
        if self.installation_worker and self.installation_worker.isRunning():
            QMessageBox.warning(self, "Installation in Progress", 
                              "Another installation is already running. Please wait for it to complete.")
            return
        
        # Create and show progress dialog
        self.progress_dialog = InstallationProgressDialog(self)
        self.progress_dialog.setWindowTitle(title)
        self.progress_dialog.update_status(f"Starting {package_type} installation...")
        
        # Create worker thread
        self.installation_worker = InstallationWorker(package_type, self)
        
        # Connect signals
        self.installation_worker.installation_started.connect(
            lambda pkg: self.progress_dialog and self.progress_dialog.update_status(f"Installing {pkg}..."))
        self.installation_worker.installation_progress.connect(
            self.progress_dialog.update_progress)
        self.installation_worker.installation_finished.connect(
            self._on_installation_finished)
        
        # Start installation
        self.installation_worker.start()
        self.progress_dialog.show()
    
    def _on_installation_finished(self, package_type, success, message):
        """Handle installation completion"""
        # Close progress dialog
        if self.progress_dialog:
            self.progress_dialog.close()
            self.progress_dialog = None
        
        # Update UI based on results
        if success:
            if package_type == "ffmpeg":
                # Try to find FFmpeg path
                ffmpeg_path = shutil.which('ffmpeg') or find_executable('ffmpeg')
                if ffmpeg_path:
                    self.ffmpeg_input.setText(ffmpeg_path)
                    self.settings.setValue("ffmpeg_path", ffmpeg_path)
            elif package_type == "ytdlp":
                # Try to find yt-dlp path
                ytdlp_path = shutil.which('yt-dlp') or find_executable('yt-dlp')
                if ytdlp_path:
                    self.yt_dlp_input.setText(ytdlp_path)
                    self.settings.setValue("yt_dlp_path", ytdlp_path)
            
            QMessageBox.information(self, "Installation Complete", message)
        else:
            QMessageBox.warning(self, "Installation Failed", message)
        
        # Refresh installation status
        self.check_installations()
        # Clean up worker
        if self.installation_worker:
            self.installation_worker.deleteLater()
            self.installation_worker = None

    # Duplicate path discovery methods removed in favor of helpers.find_executable

    def check_installations(self):
        """Check the installation status of all required packages"""
        # Check each dependency using the helper function
        ffmpeg_installed = check_and_update_path('ffmpeg', self.ffmpeg_input, self.settings, "ffmpeg_path", self.ffmpeg_status)
        ytdlp_installed = check_and_update_path('yt-dlp', self.yt_dlp_input, self.settings, "yt_dlp_path", self.ytdlp_status)
        aria2c_installed = check_and_update_path('aria2c', None, self.settings, None, self.aria2_status)

    def update_status_label(self, label, installed):
        """Update the status label with appropriate icon and text"""
        if installed:
            label.setText("✔ Installed")
            label.setStyleSheet("color: #00ff00;")  # Green color
        else:
            label.setText("✖ Not Installed")
            label.setStyleSheet("color: #ff0000;")  # Red color


class _DependencyCheckWorker(QThread):
    """Background worker to probe dependency presence without blocking the UI."""
    results_ready = pyqtSignal(dict)

    def __init__(self, parent: SettingsWindow):
        super().__init__(parent)
        self._parent = parent

    def run(self):
        # Import here to avoid circulars at module import time
        from .helpers import find_executable

        results = {}
        try:
            results['ffmpeg_path'] = find_executable('ffmpeg')
        except Exception:
            results['ffmpeg_path'] = None
        try:
            results['yt_dlp_path'] = find_executable('yt-dlp')
        except Exception:
            results['yt_dlp_path'] = None
        try:
            results['aria2c_installed'] = bool(find_executable('aria2c'))
        except Exception:
            results['aria2c_installed'] = False

        self.results_ready.emit(results)


class InstallationProgressDialog(QDialog):
    """Progress dialog for installation operations"""
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Installing Package")
        self.setModal(True)
        self.setFixedSize(400, 150)
        
        layout = QVBoxLayout(self)
        
        self.status_label = QLabel("Preparing installation...")
        layout.addWidget(self.status_label)

        # Visual progress indicator (indeterminate by default)
        self.progress_bar = QProgressBar()
        self.progress_bar.setRange(0, 0)  # Busy/indeterminate until we have a percentage
        layout.addWidget(self.progress_bar)

        self.progress_label = QLabel("")
        layout.addWidget(self.progress_label)
        
        # Cancel button (disabled during critical operations)
        self.cancel_button = QPushButton("Cancel")
        self.cancel_button.setEnabled(False)  # Will be enabled when safe to cancel
        layout.addWidget(self.cancel_button)
        
    def update_status(self, message):
        """Update the main status message"""
        self.status_label.setText(message)
        
    def update_progress(self, message):
        """Update the progress message"""
        self.progress_label.setText(message)

        # If the message contains a percentage, switch to determinate mode and update value
        try:
            import re
            match = re.search(r"(\d{1,3})%", message)
            if match:
                percent = max(0, min(100, int(match.group(1))))
                if self.progress_bar.maximum() == 0:  # currently indeterminate
                    self.progress_bar.setRange(0, 100)
                self.progress_bar.setValue(percent)
        except Exception:
            # Best-effort parsing only; keep bar indeterminate on any error
            pass
