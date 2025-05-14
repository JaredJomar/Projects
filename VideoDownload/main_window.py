from PyQt5.QtWidgets import (
    QMainWindow,
    QTabWidget,
    QVBoxLayout,
    QHBoxLayout,
    QLineEdit,
    QPushButton,
    QProgressBar,
    QFileDialog,
    QWidget,
    QLabel,
    QTextEdit,
    QComboBox,
    QDesktopWidget,
)
from PyQt5.QtCore import QSettings, QSize, QPoint, Qt
from PyQt5.QtGui import QPalette, QColor, QIcon
from download_thread import DownloadThread
from settings_window import SettingsWindow
from constants import (
    WINDOW_BACKGROUND_COLOR,
    TAB_BACKGROUND_COLOR,
    BUTTON_BACKGROUND_COLOR,
    BUTTON_TEXT_COLOR,
    INPUT_BACKGROUND_COLOR,
    INPUT_TEXT_COLOR,
    PROGRESS_BAR_BACKGROUND_COLOR,
    PROGRESS_BAR_CHUNK_COLOR,
    PROGRESS_TEXT_BACKGROUND_COLOR,
    PROGRESS_TEXT_COLOR,
    DONE_LABEL_COLOR,
)
import os
import shutil


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Video Downloader")
        
        # Add window icon
        icon_path = os.path.join(os.path.dirname(__file__), 'icons', 'app_icon.ico')
        if os.path.exists(icon_path):
            self.setWindowIcon(QIcon(icon_path))
            
        self.initUI()
        self.is_live = False  # Initialize is_live

    def initUI(self):
        self.setStyleSheet(f"background-color: {WINDOW_BACKGROUND_COLOR};")

        self.settings = QSettings("YourCompany", "VideoDownloadApp")

        palette = self.create_palette()
        self.setPalette(palette)

        self.tabs = QTabWidget()

        self.mainTab = self.create_main_tab()
        self.tabs.addTab(self.mainTab, "  Main  ")

        self.settingsTab = self.create_settings_tab()
        self.tabs.addTab(self.settingsTab, "Settings")

        self.setCentralWidget(self.tabs)

        self.customize_appearance()

        self.load_settings()

        self.resize(500, 400)
        self.center_window()

    def center_window(self):
        qtRectangle = self.frameGeometry()
        centerPoint = QDesktopWidget().availableGeometry().center()
        qtRectangle.moveCenter(centerPoint)
        self.move(qtRectangle.topLeft())

    def create_palette(self):
        palette = QPalette()
        palette.setColor(QPalette.Window, QColor("#DFF6FF"))
        palette.setColor(QPalette.WindowText, QColor(Qt.white))
        palette.setColor(QPalette.Button, QColor(BUTTON_BACKGROUND_COLOR))
        palette.setColor(QPalette.ButtonText, QColor(BUTTON_TEXT_COLOR))
        palette.setColor(QPalette.Base, QColor(TAB_BACKGROUND_COLOR))
        palette.setColor(QPalette.Highlight, QColor("#47B5FF"))
        palette.setColor(QPalette.HighlightedText, QColor("#DFF6FF"))
        return palette

    def create_main_tab(self):
        widget = QWidget()
        layout = QVBoxLayout(widget)

        url_layout = QHBoxLayout()
        url_label = QLabel("<b>URL:</b>")
        url_label.setStyleSheet("QLabel { color: white; }")
        url_layout.addWidget(url_label)

        self.url_input = QLineEdit()
        self.url_input.setStyleSheet(
            f"QLineEdit {{ background-color: {INPUT_BACKGROUND_COLOR}; color: {INPUT_TEXT_COLOR}; font-weight: bold; }}")
        url_layout.addWidget(self.url_input)

        self.browse_button = QPushButton("Browse")
        self.browse_button.clicked.connect(self.browse_folder)
        self.browse_button.setStyleSheet(
            f"QPushButton {{ background-color: {BUTTON_BACKGROUND_COLOR}; color: {BUTTON_TEXT_COLOR}; font-weight: bold; }}")
        url_layout.addWidget(self.browse_button)

        self.download_button = QPushButton("Download")
        self.download_button.clicked.connect(self.start_download)
        self.download_button.setStyleSheet(
            f"QPushButton {{ background-color: {BUTTON_BACKGROUND_COLOR}; color: {BUTTON_TEXT_COLOR}; font-weight: bold; }}")
        url_layout.addWidget(self.download_button)

        self.cancel_button = QPushButton("Cancel")
        self.cancel_button.clicked.connect(self.cancel_download)
        self.cancel_button.setStyleSheet(
            f"QPushButton {{ background-color: {BUTTON_BACKGROUND_COLOR}; color: {BUTTON_TEXT_COLOR}; font-weight: bold; }}")
        url_layout.addWidget(self.cancel_button)

        layout.addLayout(url_layout)

        # Add custom title input
        title_layout = QHBoxLayout()
        title_label = QLabel("<b>Custom Title:</b>")
        title_label.setStyleSheet("QLabel { color: white; }")
        title_layout.addWidget(title_label)

        self.title_input = QLineEdit()
        self.title_input.setStyleSheet(
            f"QLineEdit {{ background-color: {INPUT_BACKGROUND_COLOR}; color: {INPUT_TEXT_COLOR}; font-weight: bold; }}")
        self.title_input.setPlaceholderText("Enter custom title (optional)")
        title_layout.addWidget(self.title_input)

        layout.addLayout(title_layout)

        folder_layout = QHBoxLayout()
        folder_label = QLabel("<b>Download Path:</b>")
        folder_label.setStyleSheet("QLabel { color: white; }")
        folder_layout.addWidget(folder_label)

        self.download_folder_input = QLineEdit()
        self.download_folder_input.setStyleSheet(
            f"QLineEdit {{ background-color: {INPUT_BACKGROUND_COLOR}; color: {INPUT_TEXT_COLOR}; font-weight: bold; }}")
        folder_layout.addWidget(self.download_folder_input)

        self.browse_folder_button = QPushButton("Browse")
        self.browse_folder_button.clicked.connect(self.browse_download_folder)
        self.browse_folder_button.setStyleSheet(
            f"QPushButton {{ background-color: {BUTTON_BACKGROUND_COLOR}; color: {BUTTON_TEXT_COLOR}; font-weight: bold; }}")
        folder_layout.addWidget(self.browse_folder_button)

        layout.addLayout(folder_layout)

        options_layout = QHBoxLayout()
        download_type_label = QLabel("<b>Download Type:</b>")
        download_type_label.setStyleSheet("QLabel { color: white; }")
        options_layout.addWidget(download_type_label)

        self.download_type_combobox = QComboBox()
        self.download_type_combobox.addItems(
            ["video", "audio", "video with audio"])
        self.download_type_combobox.setCurrentIndex(2)
        options_layout.addWidget(self.download_type_combobox)

        resolution_label = QLabel("<font color='white'>Resolution:</font>")
        options_layout.addWidget(resolution_label)

        self.resolution_combobox = QComboBox()
        self.resolution_combobox.addItems(
            ["240", "360", "480", "720", "1080", "best"])
        self.resolution_combobox.setCurrentIndex(5)
        options_layout.addWidget(self.resolution_combobox)

        layout.addLayout(options_layout)

        self.progress_bar = QProgressBar()
        layout.addWidget(self.progress_bar)

        self.live_label = QLabel("<b><font color='red'>🔴 LIVE STREAM</font></b>")
        self.live_label.hide()
        layout.addWidget(self.live_label)

        self.progress_text = QTextEdit()
        self.progress_text.setStyleSheet(
            f"QTextEdit {{ background-color: {PROGRESS_TEXT_BACKGROUND_COLOR}; color: {PROGRESS_TEXT_COLOR}; font-weight: bold; }}")
        layout.addWidget(self.progress_text)

        self.done_label = QLabel(
            "<b><font color='green'>Download Completed!</font></b>")
        self.done_label.hide()
        layout.addWidget(self.done_label)

        return widget

    def create_settings_tab(self):
        # Create the settings window as a tab widget
        settings_widget = SettingsWindow()
        settings_widget.settings_saved.connect(
            self.on_settings_saved)  # Connect the signal
        return settings_widget

    def on_settings_saved(self):
        # Navigate to the main tab (assuming it's at index 0)
        self.tabs.setCurrentIndex(0)

    def browse_folder(self):
        file, _ = QFileDialog.getOpenFileName(
            self, "Select Text File", "", "Text Files (*.txt)")
        if file:
            with open(file, "r") as f:
                urls = f.read().splitlines()
                self.url_input.setText("\n".join(urls))

    def browse_download_folder(self):
        folder = QFileDialog.getExistingDirectory(self, "Select Folder")
        if folder:
            self.download_folder_input.setText(folder)
            self.save_settings()

    def cancel_download(self):
        if hasattr(self, "download_thread") and self.download_thread:
            self.progress_text.append("⏹️ Stopping download...")
            self.download_button.setEnabled(False)
            self.cancel_button.setEnabled(False)
            
            # Reset progress bar
            self.progress_bar.setValue(0)
            self.progress_bar.setFormat("Cancelled")
            
            try:
                self.download_thread.stop()
                self.download_thread.quit()
                self.download_thread.wait(3000)  # Wait up to 3 seconds
            except Exception as e:
                self.progress_text.append(f"❌ Error during cancellation: {str(e)}")
            finally:
                self.download_thread = None
                self.live_label.hide()
                self.progress_text.append("⏹️ Download cancelled.")
                self.download_button.setEnabled(True)
                self.cancel_button.setEnabled(True)

    def start_download(self):
        self.live_label.hide()
        url = self.url_input.text().strip()  # Ensure URL is stripped of whitespace
        
        # Enhanced live stream detection
        self.is_live = any(x in url.lower() for x in ["twitch.tv/", "youtube.com/live"])
        if self.is_live:
            self.live_label.show()
            self.progress_text.append("🔴 Live stream detected - Recording in progress...")
        else:
            self.live_label.hide()
            
        output_folder = self.download_folder_input.text().strip()  # Ensure output folder is stripped of whitespace
        ffmpeg_path = self.settingsTab.ffmpeg_input.text().strip()  # Get FFmpeg path from settings
        yt_dlp_path = self.settingsTab.yt_dlp_input.text().strip()  # Get yt-dlp path from settings
        custom_title = self.title_input.text().strip()  # Get custom title
        browser_cookies = self.settingsTab.browser_combobox.currentText()  # Get browser cookies setting
        
        # If the paths are empty, try to find them dynamically
        if not ffmpeg_path:
            ffmpeg_path = shutil.which('ffmpeg')
            if not ffmpeg_path:
                ffmpeg_path = self.settingsTab.find_executable('ffmpeg')
                
        if not yt_dlp_path:
            yt_dlp_path = shutil.which('yt-dlp')
            if not yt_dlp_path:
                yt_dlp_path = self.settingsTab.find_executable('yt-dlp')
        
        # Validate the paths
        if not ffmpeg_path or not os.path.exists(ffmpeg_path):
            self.progress_text.append("❌ Error: FFmpeg executable not found! Please install it in Settings tab.")
            return
            
        if not yt_dlp_path or not os.path.exists(yt_dlp_path):
            self.progress_text.append("❌ Error: yt-dlp executable not found! Please install it in Settings tab.")
            return
        
        download_type = self.download_type_combobox.currentText()
        resolution = self.resolution_combobox.currentText()

        self.done_label.hide()

        self.download_thread = DownloadThread(
            url, output_folder, ffmpeg_path, yt_dlp_path, download_type, resolution, custom_title, browser_cookies)  
        self.download_thread.download_progress.connect(self.update_progress)
        self.download_thread.download_output.connect(self.update_progress_text)
        self.download_thread.download_complete.connect(self.download_complete)
        self.download_thread.download_location_complete.connect(self.show_download_location)  
        self.download_thread.start()

    def update_progress(self, progress):
        self.progress_bar.setValue(progress)
        self.progress_bar.setFormat(f"{progress}%")
        self.progress_text.append(f"📊 Progress: {progress}%")
        # Auto-scroll to the end
        self.progress_text.verticalScrollBar().setValue(
            self.progress_text.verticalScrollBar().maximum()
        )

    def update_progress_text(self, output):
        # Show all logs without filtering
        if output.strip():  # Only add if text is not empty
            self.progress_text.append(output)
            # Auto-scroll to the end
            self.progress_text.verticalScrollBar().setValue(
                self.progress_text.verticalScrollBar().maximum()
            )
        
        # Only show live_label if it's a live stream
        if self.is_live:
            self.live_label.show()
            self.progress_bar.setFormat("Recording... %p%")
        else:
            self.live_label.hide()

    def download_complete(self):
        self.done_label.show()
        self.live_label.hide()
        self.url_input.clear()
        self.title_input.clear()  # Clear the custom title input
        self.progress_text.append("✅ Download Completed!")

    def show_download_location(self, location):
        """Show the download location in the progress text box."""
        if location:
            self.progress_text.append(f"📁 Download saved to: {location}")
            self.progress_text.verticalScrollBar().setValue(
                self.progress_text.verticalScrollBar().maximum()
            )

    def save_settings(self):
        self.settings.setValue(
            "download_folder", self.download_folder_input.text())
        self.settings.setValue(
            "ffmpeg_path", self.settingsTab.ffmpeg_input.text())
        self.settings.setValue(
            "yt_dlp_path", self.settingsTab.yt_dlp_input.text())
        # Do NOT save browser_cookies anymore
        # self.settings.setValue(
        #     "browser_cookies", self.settingsTab.browser_combobox.currentText())
        self.settings.setValue("window_size", self.size())
        self.settings.setValue("window_position", self.pos())

    def load_settings(self):
        download_folder = self.settings.value("download_folder", "")

        if download_folder:
            self.download_folder_input.setText(download_folder)

        window_size = self.settings.value("window_size", QSize(800, 600))
        window_position = self.settings.value(
            "window_position", QPoint(100, 100))

        self.resize(window_size)
        self.move(window_position)

    def customize_appearance(self):
        menu = self.menuBar()
        menu.setStyleSheet(
            "QMenuBar { background-color: #06283D; color: white; font-weight: bold; }"
        )

        self.settingsTab.setStyleSheet(
            "QWidget { background-color: #000128; color: white; font-weight: bold; }"
        )

        tabBar = self.tabs.tabBar()
        tabBar.setStyleSheet(
            "QTabBar::tab { background-color: #000128; color: white; font-weight: bold; padding: 10px 20px; margin-right: 10px; min-width: 100px; }"
            "QTabBar::tab:selected { background-color: #06283D; }"
        )

        self.progress_bar.setStyleSheet(
            "QProgressBar { border: 1px solid #47B5FF; border-radius: 5px; text-align: center; background-color: #06283D; color: white; }"
            "QProgressBar::chunk { background-color: #47B5FF; }"
        )

        self.download_type_combobox.setStyleSheet(
            "QComboBox { background-color: #06283D; color: white; font-weight: bold; }"
            "QComboBox QAbstractItemView { background-color: #06283D; color: white; font-weight: bold; selection-background-color: #1363DF; }"
        )
        self.resolution_combobox.setStyleSheet(
            "QComboBox { background-color: #06283D; color: white; font-weight: bold; }"
            "QComboBox QAbstractItemView { background-color: #06283D; color: white; font-weight: bold; selection-background-color: #1363DF; }"
        )
