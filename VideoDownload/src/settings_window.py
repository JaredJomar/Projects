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
)
from PyQt5.QtCore import QSettings, pyqtSignal, QThread
from .helpers import (
    find_executable,
    check_and_update_path,
    browse_for_executable,
    save_app_settings,
    load_app_settings,
)
from .constants import (
    BUTTON_BACKGROUND_COLOR,
    BUTTON_TEXT_COLOR,
    INPUT_BACKGROUND_COLOR,
    INPUT_TEXT_COLOR,
)
import os
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
                "install_cmd": ["winget", "install", "Gyan.FFmpeg", "--silent"],
                "upgrade_cmd": ["winget", "upgrade", "Gyan.FFmpeg", "--silent"],
                "package_id": "Gyan.FFmpeg"
            },
            "ytdlp": {
                "name": "yt-dlp",
                "check_cmd": "yt-dlp",
                "install_cmd": ["winget", "install", "yt-dlp.yt-dlp", "--silent"],
                "upgrade_cmd": ["winget", "upgrade", "yt-dlp.yt-dlp", "--silent"],
                "package_id": "yt-dlp.yt-dlp"
            },
            "aria2c": {
                "name": "aria2c",
                "check_cmd": "aria2c",
                "install_cmd": ["choco", "install", "-y", "aria2"],
                "upgrade_cmd": ["choco", "upgrade", "-y", "aria2"],
                "package_id": "aria2"
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
    
    def _install_dependency(self, name, check_cmd, install_cmd, upgrade_cmd, package_id, extra_checks=None):
        """Generic method to install or update a dependency"""
        self.installation_progress.emit(f"Checking for existing {name} installation...")
        executable_path = shutil.which(check_cmd)
        
        if executable_path:
            self.installation_progress.emit(f"{name} found. Checking for updates...")
            # Try to update existing installation
            result = subprocess.run(upgrade_cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                self.installation_progress.emit(f"{name} updated successfully!")
                self.success = True
                self.message = f"{name} updated at: {executable_path}"
            else:
                # Update failed, but it's already installed
                self.success = True
                self.message = f"{name} already up-to-date at: {executable_path}"
            return
        
        self.installation_progress.emit(f"Installing {name}...")
        result = subprocess.run(install_cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            self.installation_progress.emit("Waiting for installation to complete...")
            time.sleep(3)  # Give time for installation to complete
            
            # Check if installation was successful
            executable_path = shutil.which(check_cmd)
            if executable_path:
                self.success = True
                self.message = f"{name} successfully installed at: {executable_path}"
            else:
                # Try additional checks if provided
                found_path = None
                if extra_checks and callable(extra_checks):
                    found_path = extra_checks()
                
                if found_path:
                    self.success = True
                    self.message = f"{name} successfully installed at: {found_path}"
                else:
                    self.success = False
                    self.message = f"{name} installed but not found in PATH. Manual path setting required."
        else:
            self.success = False
            self.message = f"Failed to install {name}: {result.stderr}"


class SettingsWindow(QDialog):
    settings_saved = pyqtSignal()  # Define a custom signal

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Settings")
        self.setStyleSheet("background-color: #000128;")
        self.setMinimumSize(400, 300)

        self.settings = QSettings("YourCompany", "VideoDownloadApp")
        
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
        install_aria2_button = QPushButton("Install/Update aria2c")
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

        spacer2 = QSpacerItem(20, 20, QSizePolicy.Minimum,
                              QSizePolicy.Expanding)
        layout.addItem(spacer2)

        save_button = QPushButton("Save")
        save_button.clicked.connect(self.save_settings)
        save_button.setStyleSheet(
            f"QPushButton {{ background-color: {BUTTON_BACKGROUND_COLOR}; color: {BUTTON_TEXT_COLOR}; font-weight: bold; }}")
        layout.addWidget(save_button)

        # Load settings first, then check installations
        self.load_settings()
        
        # Now check installations after input fields have been created
        self.check_installations()

    def browse_ffmpeg(self):
        browse_for_executable(self, self.ffmpeg_input, "ffmpeg")

    def browse_ytdlp(self):
        browse_for_executable(self, self.yt_dlp_input, "yt-dlp")

    def save_settings(self):
        settings_data = {
            "ffmpeg_path": self.ffmpeg_input.text(),
            "yt_dlp_path": self.yt_dlp_input.text(),
            "browser_cookies": self.browser_combobox.currentText()
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
                ffmpeg_path = shutil.which('ffmpeg')
                if not ffmpeg_path:
                    ffmpeg_path = self.get_dependency_path("ffmpeg")
                if ffmpeg_path:
                    self.ffmpeg_input.setText(ffmpeg_path)
                    self.settings.setValue("ffmpeg_path", ffmpeg_path)
            elif package_type == "ytdlp":
                # Try to find yt-dlp path
                ytdlp_path = shutil.which('yt-dlp')
                if not ytdlp_path:
                    ytdlp_path = self.get_dependency_path("yt-dlp")
                    # Try default winget path as fallback
                    if not ytdlp_path:
                        default_path = os.path.expandvars(
                            "%USERPROFILE%/AppData/Local/Microsoft/WinGet/Packages/yt-dlp.yt-dlp_Microsoft.Winget.Source_8wekyb3d8bbwe/yt-dlp.exe")
                        if os.path.exists(default_path):
                            ytdlp_path = default_path
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

    def get_dependency_path(self, dependency):
        try:
            output = subprocess.check_output(
                ["where", dependency], universal_newlines=True)
            paths = output.strip().split("\n")
            if paths:
                return paths[0]
        except subprocess.CalledProcessError:
            return ""

    def find_executable(self, executable_name):
        """Search for an executable in common installation directories"""
        # First check if it's in PATH
        path = shutil.which(executable_name)
        if path:
            return path
            
        # Try using the where command (Windows specific)
        try:
            path = self.get_dependency_path(executable_name)
            if path:
                return path
        except Exception:
            pass
            
        # Common WinGet installation paths for popular tools
        if executable_name == 'ffmpeg':
            possible_paths = [
                # WinGet installation paths
                os.path.join(os.environ.get('LOCALAPPDATA', ''), 
                             'Microsoft', 'WinGet', 'Packages', 
                             'Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe', 
                             'ffmpeg.exe'),
                # Check in Program Files
                os.path.join(os.environ.get('PROGRAMFILES', ''), 
                             'ffmpeg', 'bin', 'ffmpeg.exe'),
                # Also check for FFmpeg in temp path
                os.path.join(os.environ.get('TEMP', ''), 
                             'ffmpeg', 'bin', 'ffmpeg.exe')
            ]
        elif executable_name == 'yt-dlp':
            possible_paths = [
                # WinGet installation paths
                os.path.join(os.environ.get('LOCALAPPDATA', ''), 
                             'Microsoft', 'WinGet', 'Packages', 
                             'yt-dlp.yt-dlp_Microsoft.Winget.Source_8wekyb3d8bbwe', 
                             'yt-dlp.exe'),
                # Check in Program Files
                os.path.join(os.environ.get('PROGRAMFILES', ''), 
                             'yt-dlp', 'yt-dlp.exe'),
                # Check in user directory
                os.path.join(os.environ.get('USERPROFILE', ''), 
                             'AppData', 'Local', 'yt-dlp', 'yt-dlp.exe')
            ]
        else:
            return None
            
        # Check all possible paths
        for path in possible_paths:
            if os.path.exists(path):
                return path
                
        # Try to search in common directories using glob
        import glob
        for pattern in [
            f"{os.environ.get('LOCALAPPDATA', '')}/**/*/bin/{executable_name}.exe",
            f"{os.environ.get('PROGRAMFILES', '')}/**/{executable_name}.exe",
            f"{os.environ.get('PROGRAMFILES(X86)', '')}/**/{executable_name}.exe",
            f"{os.environ.get('USERPROFILE', '')}/AppData/Local/**/{executable_name}.exe"
        ]:
            try:
                matches = glob.glob(pattern, recursive=True)
                if matches:
                    return matches[0]
            except Exception:
                pass
                
        return None

    def check_installations(self):
        """Check the installation status of all required packages"""
        # Check each dependency using the helper function
        ffmpeg_installed = check_and_update_path('ffmpeg', self.ffmpeg_input, self.settings, "ffmpeg_path", self.ffmpeg_status)
        ytdlp_installed = check_and_update_path('yt-dlp', self.yt_dlp_input, self.settings, "yt_dlp_path", self.ytdlp_status)
        aria2c_installed = check_and_update_path('aria2c', None, self.settings, None, self.aria2_status)

    def update_status_label(self, label, installed):
        """Update the status label with appropriate icon and text"""
        if installed:
            label.setText("✅ Installed")
            label.setStyleSheet("color: #00ff00;")  # Green color
        else:
            label.setText("❌ Not Installed")
            label.setStyleSheet("color: #ff0000;")  # Red color


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
