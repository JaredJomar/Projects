from PyQt5.QtWidgets import QApplication, QMainWindow, QTabWidget, QVBoxLayout, QHBoxLayout, QLineEdit, QPushButton, QProgressBar, QFileDialog, QWidget, QLabel, QTextEdit, QComboBox, QDesktopWidget
from PyQt5.QtCore import QSettings, QSize, QPoint, pyqtSignal, QObject, Qt, QThread
from PyQt5.QtGui import QPalette, QColor
import sys
import os
import subprocess

class DownloadThread(QThread):
    download_progress = pyqtSignal(int)
    download_output = pyqtSignal(str)
    download_complete = pyqtSignal()

    def __init__(self, urls, output_folder, ffmpeg_path, yt_dlp_path, download_type, resolution):
        super().__init__()
        self.urls = urls.split('\n')  # Split the URLs into a list
        self.output_folder = output_folder
        self.ffmpeg_path = ffmpeg_path
        self.yt_dlp_path = yt_dlp_path
        self.download_type = download_type
        self.resolution = resolution
        self.running = True

    def run(self):
        for url in self.urls:
            if not self.running:
                return

            if self.download_type == "video":
                command = [self.yt_dlp_path, "--format", "bestvideo+bestaudio/best", "--merge-output-format", "mkv", "-o", self.output_folder + "/%(title)s.%(ext)s", "--ffmpeg-location", self.ffmpeg_path, url]
            elif self.download_type == "audio":
                command = [self.yt_dlp_path, "--format", "bestaudio/best", "-x", "--audio-format", "mp3", "-o", self.output_folder + "/%(title)s.%(ext)s", "--ffmpeg-location", self.ffmpeg_path, url]
            elif self.download_type == "video with audio":
                command = [self.yt_dlp_path, "--format", "bestvideo+bestaudio/best", "--merge-output-format", "mkv", "-o", self.output_folder + "/%(title)s.%(ext)s", "--ffmpeg-location", self.ffmpeg_path, url]
            else:
                raise ValueError(f"Invalid download type: {self.download_type}")

            process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, universal_newlines=True)

            for line in process.stdout:
                if not self.running:
                    return
                self.download_output.emit(line.strip())
                if "download" in line:
                    words = line.split()
                    for word in words:
                        if '%' in word:
                            percentage = word.replace('%','')
                            self.download_progress.emit(int(float(percentage)))
                            break

        if self.running:
            self.download_complete.emit()

    def stop(self):
        self.running = False

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()

        self.settings = QSettings("YourCompany", "VideoDownloadApp")

        # Set dark blue background and white text color
        palette = QPalette()
        palette.setColor(QPalette.Window, QColor("#06283D"))
        palette.setColor(QPalette.WindowText, QColor(Qt.white))
        palette.setColor(QPalette.Button, QColor("#1363DF"))  # Apply color to buttons
        palette.setColor(QPalette.ButtonText, QColor(Qt.white))
        palette.setColor(QPalette.Base, QColor("#06283D"))  # Set background color of the entire window
        palette.setColor(QPalette.Highlight, QColor("#47B5FF"))  # Set highlight color
        palette.setColor(QPalette.HighlightedText, QColor("#DFF6FF"))  # Set highlighted text color
        self.setPalette(palette)

        self.tabWidget = QTabWidget(self)
        self.tabWidget.setStyleSheet("QTabWidget::pane { background-color: #06283D; }")  # Set background color of the tab widget
        self.tabWidget.setTabBarAutoHide(True)  # Hide the tab bar when only one tab is present
        self.setCentralWidget(self.tabWidget)

        # Create the main and settings tabs 
        self.mainTab = self.create_main_tab()
        self.tabWidget.addTab(self.mainTab, "  Main  ")

        self.settingsTab = self.create_settings_tab()
        self.tabWidget.addTab(self.settingsTab, "  Settings  ")

        # Set the color of the menu
        menu = self.menuBar()
        menu.setStyleSheet("QMenuBar { background-color: #06283D; color: white; font-weight: bold; }")

        # Set the color of the settings tab
        self.settingsTab.setStyleSheet("QWidget { background-color: #06283D; color: white; font-weight: bold; }")

        # Set the color of Main and Settings buttons
        tabBar = self.tabWidget.tabBar()
        tabBar.setStyleSheet("QTabBar::tab { background-color: #06283D; color: white; font-weight: bold; }")

        # Set progress bar color and move % text to the center
        self.progress_bar.setStyleSheet("QProgressBar { border: 1px solid #47B5FF; border-radius: 5px; text-align: center; background-color: #06283D; color: white; } QProgressBar::chunk { background-color: #47B5FF; }")
        
        # Set the color of the download type and resolution comboboxes
        self.download_type_combobox.setStyleSheet("QComboBox { background-color: #06283D; color: white; font-weight: bold; }")
        self.resolution_combobox.setStyleSheet("QComboBox { background-color: #06283D; color: white; font-weight: bold; }")

        # Load paths, window size, and position from settings
        self.load_settings()
        
        # Set the window size
        self.resize(500, 400)
        
        # Center the window
        qtRectangle = self.frameGeometry()
        centerPoint = QDesktopWidget().availableGeometry().center()
        qtRectangle.moveCenter(centerPoint)
        self.move(qtRectangle.topLeft())

    def create_main_tab(self):
        widget = QWidget()
        layout = QVBoxLayout(widget)

        # URL input, browse button, download, and cancel buttons
        url_layout = QHBoxLayout()
        url_label = QLabel("<b>URL:</b>")
        url_layout.addWidget(url_label)
        self.url_input = QLineEdit()
        self.url_input.setStyleSheet("QLineEdit { background-color: #06283D; color: white; font-weight: bold; }")
        url_layout.addWidget(self.url_input)
        
        self.browse_button = QPushButton("Browse")
        self.browse_button.clicked.connect(self.browse_folder)
        self.browse_button.setStyleSheet("QPushButton { background-color: #06283D; color: white; font-weight: bold; }")
        url_layout.addWidget(self.browse_button)
        
        self.download_button = QPushButton("Download")
        self.download_button.clicked.connect(self.start_download)
        self.download_button.setStyleSheet("QPushButton { background-color: #06283D; color: white; font-weight: bold; }")
        url_layout.addWidget(self.download_button)
        
        self.cancel_button = QPushButton("Cancel")
        self.cancel_button.clicked.connect(self.cancel_download)
        self.cancel_button.setStyleSheet("QPushButton { background-color: #06283D; color: white; font-weight: bold; }")
        url_layout.addWidget(self.cancel_button)
        layout.addLayout(url_layout)

        # Download folder input and browse button
        folder_layout = QHBoxLayout()
        folder_label = QLabel("<b>Download Path:</b>")
        folder_layout.addWidget(folder_label)
        
        self.download_folder_input = QLineEdit()
        self.download_folder_input.setStyleSheet("QLineEdit { background-color: #06283D; color: white; font-weight: bold; }")
        folder_layout.addWidget(self.download_folder_input)
        
        self.browse_button = QPushButton("Browse")
        self.browse_button.clicked.connect(self.browse_folder)
        self.browse_button.setStyleSheet("QPushButton { background-color: #06283D; color: white; font-weight: bold; }")
        folder_layout.addWidget(self.browse_button)
        
        layout.addLayout(folder_layout)

        # Download type and resolution selection
        options_layout = QHBoxLayout()

        download_type_label = QLabel("<b>Download Type:</b>")
        options_layout.addWidget(download_type_label)

        self.download_type_combobox = QComboBox()
        self.download_type_combobox.addItems(["video", "audio", "video with audio"])
        self.download_type_combobox.setCurrentIndex(2)  # Set "video with audio" as the default
        options_layout.addWidget(self.download_type_combobox)

        resolution_label = QLabel("Resolution:")
        options_layout.addWidget(resolution_label)

        self.resolution_combobox = QComboBox()
        self.resolution_combobox.addItems(["240p", "360p", "480p", "720p", "1080p", "best"])
        self.resolution_combobox.setCurrentIndex(5)  # Set "best" as the default
        options_layout.addWidget(self.resolution_combobox)

        layout.addLayout(options_layout)

        # Progress bar
        self.progress_bar = QProgressBar()
        layout.addWidget(self.progress_bar)

        # Text box to display progress information
        self.progress_text = QTextEdit()
        self.progress_text.setStyleSheet("QTextEdit { background-color: #06283D; color: white; font-weight: bold; }")
        layout.addWidget(self.progress_text)

        # Label to indicate download completion
        self.done_label = QLabel("Download Completed!")
        self.done_label.hide()  # Initially hidden
        layout.addWidget(self.done_label)

        return widget

    def create_settings_tab(self):
        widget = QWidget()
        layout = QVBoxLayout(widget)

        # ffmpeg path input and browse button
        ffmpeg_layout = QHBoxLayout()
        ffmpeg_label = QLabel("<b>FFmpeg Path:</b>")
        ffmpeg_layout.addWidget(ffmpeg_label)
        
        self.ffmpeg_input = QLineEdit()
        self.ffmpeg_input.setStyleSheet("QLineEdit { background-color: #1363DF; color: white; font-weight: bold; }")
        ffmpeg_layout.addWidget(self.ffmpeg_input)
        
        ffmpeg_browse_button = QPushButton("Browse")
        ffmpeg_browse_button.clicked.connect(self.browse_ffmpeg)
        ffmpeg_browse_button.setStyleSheet("QPushButton { background-color: #1363DF; color: white; font-weight: bold; }")
        ffmpeg_layout.addWidget(ffmpeg_browse_button)
        
        layout.addLayout(ffmpeg_layout)

        # yt-dlp path input and browse button
        ytdlp_layout = QHBoxLayout()
        ytdlp_label = QLabel("<b>yt-dlp Path:</b>")
        ytdlp_layout.addWidget(ytdlp_label)
        
        self.yt_dlp_input = QLineEdit()
        self.yt_dlp_input.setStyleSheet("QLineEdit { background-color: #1363DF; color: white; font-weight: bold; }")
        ytdlp_layout.addWidget(self.yt_dlp_input)
        
        ytdlp_browse_button = QPushButton("Browse")
        ytdlp_browse_button.clicked.connect(self.browse_ytdlp)
        ytdlp_browse_button.setStyleSheet("QPushButton { background-color: #1363DF; color: white; font-weight: bold; }")
        ytdlp_layout.addWidget(ytdlp_browse_button)
        
        layout.addLayout(ytdlp_layout)

        return widget

    def browse_folder(self):
        file, _ = QFileDialog.getOpenFileName(self, "Select Text File", "", "Text Files (*.txt)")
        if file:
            with open(file, 'r') as f:
                urls = f.read().splitlines()
                self.url_input.setText('\n'.join(urls))

    def cancel_download(self):
        if self.download_thread:
            self.download_thread.stop()
            self.download_thread = None
            self.progress_bar.setValue(0)
            self.progress_text.clear()

    def browse_ffmpeg(self):
        file = QFileDialog.getOpenFileName(self, "Select ffmpeg")
        if file[0]:
            self.ffmpeg_input.setText(file[0])
            self.save_settings()

    def browse_ytdlp(self):
        file = QFileDialog.getOpenFileName(self, "Select yt-dlp")
        if file[0]:
            self.yt_dlp_input.setText(file[0])
            self.save_settings()

    def start_download(self):
        url = self.url_input.text()
        output_folder = self.download_folder_input.text()
        ffmpeg_path = self.ffmpeg_input.text()
        yt_dlp_path = self.yt_dlp_input.text()
        download_type = self.download_type_combobox.currentText()
        resolution = self.resolution_combobox.currentText()

        self.download_thread = DownloadThread(url, output_folder, ffmpeg_path, yt_dlp_path, download_type, resolution)
        self.download_thread.download_progress.connect(self.update_progress)
        self.download_thread.download_output.connect(self.update_progress_text)
        self.download_thread.download_complete.connect(self.download_complete)
        self.download_thread.start()

    def update_progress(self, progress):
        self.progress_bar.setValue(int(progress))
        self.progress_text.append(f"Progress: {progress}%")

    def update_progress_text(self, output):
        self.progress_text.append(output)

    def download_complete(self):
        self.done_label.show()
        self.url_input.clear()

    def save_settings(self):
        self.settings.setValue("download_folder", self.download_folder_input.text())
        self.settings.setValue("ffmpeg_path", self.ffmpeg_input.text())
        self.settings.setValue("yt_dlp_path", self.yt_dlp_input.text())

        # Save window size and position
        self.settings.setValue("window_size", self.size())
        self.settings.setValue("window_position", self.pos())

    def load_settings(self):
        download_folder = self.settings.value("download_folder", "")
        ffmpeg_path = self.settings.value("ffmpeg_path", "")
        yt_dlp_path = self.settings.value("yt_dlp_path", "")

        if download_folder:
            self.download_folder_input.setText(download_folder)
        if ffmpeg_path:
            self.ffmpeg_input.setText(ffmpeg_path)
        if yt_dlp_path:
            self.yt_dlp_input.setText(yt_dlp_path)

        # Load window size and position
        window_size = self.settings.value("window_size", QSize(800, 600))
        window_position = self.settings.value("window_position", QPoint(100, 100))

        self.resize(window_size)
        self.move(window_position)

def main():
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec_())

if __name__ == "__main__":
    main()
