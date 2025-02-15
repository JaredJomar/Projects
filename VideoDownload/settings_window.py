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
)
from PyQt5.QtCore import QSettings, pyqtSignal
from constants import (
    BUTTON_BACKGROUND_COLOR,
    BUTTON_TEXT_COLOR,
    INPUT_BACKGROUND_COLOR,
    INPUT_TEXT_COLOR,
)
import os
import subprocess
import shutil


class SettingsWindow(QDialog):
    settings_saved = pyqtSignal()  # Define a custom signal

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Settings")
        self.setStyleSheet("background-color: #000128;")
        self.setMinimumSize(400, 300)

        self.settings = QSettings("YourCompany", "VideoDownloadApp")
        layout = QVBoxLayout(self)

        install_layout = QHBoxLayout()
        
        # Create status labels first
        self.ffmpeg_status = QLabel()
        self.ytdlp_status = QLabel()
        self.aria2_status = QLabel()
        
        # Now check installations
        self.check_installations()
        
        # FFmpeg section with status
        ffmpeg_section = QVBoxLayout()
        install_ffmpeg_button = QPushButton("Install FFmpeg")
        install_ffmpeg_button.setToolTip(
            "FFmpeg is a complete solution to record, convert and stream audio and video.\n"
            "• Required for video processing and format conversion\n"
            "• Handles video/audio encoding and decoding\n"
            "• Essential for merging video and audio streams"
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
        install_ytdlp_button = QPushButton("Install yt-dlp")
        install_ytdlp_button.setToolTip(
            "yt-dlp is a youtube-dl fork with additional features and fixes.\n"
            "• Downloads videos from YouTube and other platforms\n"
            "• Supports various video qualities and formats\n"
            "• Handles live streams and playlists"
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
        install_aria2_button = QPushButton("Install aria2c")
        install_aria2_button.setToolTip(
            "aria2 is a lightweight multi-protocol download utility.\n"
            "• Accelerates downloads with multi-connection downloading\n"
            "• Improves download stability and speed\n"
            "• Supports resuming interrupted downloads"
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

        self.load_settings()

    def browse_ffmpeg(self):
        file = QFileDialog.getOpenFileName(self, "Select ffmpeg")
        if file[0]:
            self.ffmpeg_input.setText(file[0])

    def browse_ytdlp(self):
        file = QFileDialog.getOpenFileName(self, "Select yt-dlp")
        if file[0]:
            self.yt_dlp_input.setText(file[0])

    def save_settings(self):
        self.settings.setValue("ffmpeg_path", self.ffmpeg_input.text())
        self.settings.setValue("yt_dlp_path", self.yt_dlp_input.text())
        self.settings_saved.emit()  # Emit the custom signal
        self.accept()

    def load_settings(self):
        ffmpeg_path = self.settings.value("ffmpeg_path", "")
        yt_dlp_path = self.settings.value("yt_dlp_path", "")

        if ffmpeg_path:
            self.ffmpeg_input.setText(ffmpeg_path)
        if yt_dlp_path:
            self.yt_dlp_input.setText(yt_dlp_path)

    def install_ffmpeg(self):
        ffmpeg_path = os.path.expandvars(
            "%USERPROFILE%/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-7.1-full_build/bin/ffmpeg.exe")
        if os.path.exists(ffmpeg_path):
            QMessageBox.information(
                self, "Installation", "FFmpeg is already installed.")
            self.ffmpeg_input.setText(ffmpeg_path)
            self.settings.setValue("ffmpeg_path", ffmpeg_path)
            self.check_installations()  # Refresh status after installation
            return

        try:
            subprocess.run(
                ["winget", "install", "Gyan.FFmpeg", "--silent"], check=True)
            if os.path.exists(ffmpeg_path):
                self.ffmpeg_input.setText(ffmpeg_path)
                self.settings.setValue("ffmpeg_path", ffmpeg_path)
                QMessageBox.information(
                    self, "Installation", "FFmpeg has been successfully installed.")
            else:
                QMessageBox.warning(self, "Installation Error",
                                    "Failed to locate FFmpeg after installation.")
        except subprocess.CalledProcessError:
            QMessageBox.warning(self, "Installation Error",
                                "Failed to install FFmpeg using winget.")
        self.check_installations()  # Refresh status after installation

    def install_ytdlp(self):
        ytdlp_path = os.path.expandvars(
            "%USERPROFILE%/AppData/Local/Microsoft/WinGet/Packages/yt-dlp.yt-dlp_Microsoft.Winget.Source_8wekyb3d8bbwe/yt-dlp.exe")
        if os.path.exists(ytdlp_path):
            QMessageBox.information(
                self, "Installation", "yt-dlp is already installed.")
            self.yt_dlp_input.setText(ytdlp_path)
            self.settings.setValue("yt_dlp_path", ytdlp_path)
            self.check_installations()  # Refresh status after installation
            return

        try:
            subprocess.run(
                ["winget", "install", "yt-dlp.yt-dlp", "--silent"], check=True)
            if os.path.exists(ytdlp_path):
                self.yt_dlp_input.setText(ytdlp_path)
                self.settings.setValue("yt_dlp_path", ytdlp_path)
                QMessageBox.information(
                    self, "Installation", "yt-dlp has been successfully installed.")
            else:
                QMessageBox.warning(self, "Installation Error",
                                    "Failed to locate yt-dlp after installation.")
        except subprocess.CalledProcessError:
            QMessageBox.warning(self, "Installation Error",
                                "Failed to install yt-dlp using winget.")
        self.check_installations()  # Refresh status after installation

    def install_aria2c(self):
        if shutil.which('aria2c'):
            QMessageBox.information(
                self, "Installation", "aria2c is already installed.")
            self.check_installations()  # Refresh status after installation
            return

        try:
            subprocess.run(
                ['choco', 'install', '-y', 'aria2'], 
                check=True,
                creationflags=subprocess.CREATE_NO_WINDOW
            )
            
            # Wait and check for successful installation
            import time
            for _ in range(5):
                time.sleep(2)
                if shutil.which('aria2c'):
                    QMessageBox.information(
                        self, "Installation", "aria2c has been successfully installed.")
                    self.check_installations()  # Refresh status after installation
                    return
                    
            QMessageBox.warning(
                self, "Installation Error", 
                "Failed to locate aria2c after installation. Please try installing manually.")
        except subprocess.CalledProcessError:
            QMessageBox.warning(
                self, "Installation Error",
                "Failed to install aria2c using Chocolatey. Please make sure Chocolatey is installed.")
        self.check_installations()  # Refresh status after installation

    def get_dependency_path(self, dependency):
        try:
            output = subprocess.check_output(
                ["where", dependency], universal_newlines=True)
            paths = output.strip().split("\n")
            if paths:
                return paths[0]
        except subprocess.CalledProcessError:
            return ""

    def check_installations(self):
        """Check the installation status of all required packages"""
        # Check FFmpeg
        ffmpeg_path = os.path.expandvars(
            "%USERPROFILE%/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-7.1-full_build/bin/ffmpeg.exe")
        if os.path.exists(ffmpeg_path):
            self.update_status_label(self.ffmpeg_status, True)
        else:
            self.update_status_label(self.ffmpeg_status, False)

        # Check yt-dlp
        ytdlp_path = os.path.expandvars(
            "%USERPROFILE%/AppData/Local/Microsoft/WinGet/Packages/yt-dlp.yt-dlp_Microsoft.Winget.Source_8wekyb3d8bbwe/yt-dlp.exe")
        if os.path.exists(ytdlp_path):
            self.update_status_label(self.ytdlp_status, True)
        else:
            self.update_status_label(self.ytdlp_status, False)

        # Check aria2c
        if shutil.which('aria2c'):
            self.update_status_label(self.aria2_status, True)
        else:
            self.update_status_label(self.aria2_status, False)

    def update_status_label(self, label, installed):
        """Update the status label with appropriate icon and text"""
        if installed:
            label.setText("✅ Installed")
            label.setStyleSheet("color: #00ff00;")  # Green color
        else:
            label.setText("❌ Not Installed")
            label.setStyleSheet("color: #ff0000;")  # Red color
