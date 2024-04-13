from PyQt5.QtWidgets import (
    QApplication,
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
from PyQt5.QtCore import QSettings, QSize, QPoint, pyqtSignal, QObject, Qt, QThread
from PyQt5.QtGui import QPalette, QColor
import sys
import os
import subprocess
import ctypes
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)


class DownloadThread(QThread):
    # Signal to update the download progress
    download_progress = pyqtSignal(int)
    download_output = pyqtSignal(str)  # Signal to send output messages
    download_complete = pyqtSignal()  # Signal to indicate download completion

    def __init__(self, urls, output_folder, ffmpeg_path, yt_dlp_path, download_type, resolution):
        super().__init__()
        self.urls = urls.split("\n")
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

            # Construct the appropriate command based on download type
            if self.download_type == "video":
                if self.resolution == "best":
                    format_spec = "bestvideo"
                else:
                    format_spec = f"bestvideo[height<={self.resolution}]"
                command = [
                    self.yt_dlp_path,
                    "--format",
                    format_spec,
                    "--no-audio",
                    "--add-metadata",
                    "-o",
                    self.output_folder + "/%(title)s.%(ext)s",
                    "--ffmpeg-location",
                    self.ffmpeg_path,
                    url,
                ]
            elif self.download_type == "audio":
                command = [
                    self.yt_dlp_path,
                    "--format",
                    "bestaudio/best",
                    "-x",
                    "--audio-format",
                    "mp3",
                    "--add-metadata",
                    "-o",
                    self.output_folder + "/%(title)s.%(ext)s",
                    "--ffmpeg-location",
                    self.ffmpeg_path,
                    url,
                ]
            elif self.download_type == "video with audio":
                if self.resolution == "best":
                    format_spec = "bestvideo+bestaudio/best"
                else:
                    format_spec = f"bestvideo[height<={self.resolution}]+bestaudio/best"
                command = [
                    self.yt_dlp_path,
                    "--format",
                    format_spec,
                    "--add-metadata",
                    "-o",
                    self.output_folder + "/%(title)s.%(ext)s",
                    "--ffmpeg-location",
                    self.ffmpeg_path,
                    url,
                ]
            else:
                logging.error(f"Invalid download type: {self.download_type}")
                return

            # Execute the command and handle the output
            process = subprocess.Popen(
                command,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                universal_newlines=True,
                creationflags=subprocess.CREATE_NO_WINDOW,  # Add this line
            )
            for line in process.stdout:
                if not self.running:
                    return
                self.download_output.emit(line.strip())
                if "download" in line:
                    words = line.split()
                    for word in words:
                        if "%" in word:
                            percentage = int(float(word.replace("%", "")))
                            self.download_progress.emit(percentage)
                            break

        if self.running:
            self.download_complete.emit()

    def stop(self):
        self.running = False


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()

        self.setStyleSheet("background-color: #000128;")

        self.settings = QSettings("YourCompany", "VideoDownloadApp")

        palette = self.create_palette()
        self.setPalette(palette)

        self.tabWidget = QTabWidget(self)
        self.tabWidget.setStyleSheet(
            "QTabWidget::pane { background-color: #06283D; }")
        self.tabWidget.setTabBarAutoHide(True)
        self.setCentralWidget(self.tabWidget)

        self.mainTab = self.create_main_tab()
        self.tabWidget.addTab(self.mainTab, "  Main  ")
        self.settingsTab = self.create_settings_tab()
        self.tabWidget.addTab(self.settingsTab, "  Settings  ")

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
        palette.setColor(QPalette.Button, QColor("#1363DF"))
        palette.setColor(QPalette.ButtonText, QColor(Qt.white))
        palette.setColor(QPalette.Base, QColor("#06283D"))
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
            "QLineEdit { background-color: #fff; color: #000; font-weight: bold; }")
        url_layout.addWidget(self.url_input)

        self.browse_button = QPushButton("Browse")
        self.browse_button.clicked.connect(self.browse_folder)
        self.browse_button.setStyleSheet(
            "QPushButton { background-color: #06283D; color: white; font-weight: bold; }")
        url_layout.addWidget(self.browse_button)

        self.download_button = QPushButton("Download")
        self.download_button.clicked.connect(self.start_download)
        self.download_button.setStyleSheet(
            "QPushButton { background-color: #06283D; color: white; font-weight: bold; }")
        url_layout.addWidget(self.download_button)

        self.cancel_button = QPushButton("Cancel")
        self.cancel_button.clicked.connect(self.cancel_download)
        self.cancel_button.setStyleSheet(
            "QPushButton { background-color: #06283D; color: white; font-weight: bold; }")
        url_layout.addWidget(self.cancel_button)

        layout.addLayout(url_layout)

        folder_layout = QHBoxLayout()
        folder_label = QLabel("<b>Download Path:</b>")
        folder_label.setStyleSheet("QLabel { color: white; }")
        folder_layout.addWidget(folder_label)

        self.download_folder_input = QLineEdit()
        self.download_folder_input.setStyleSheet(
            "QLineEdit { background-color: #fff; color: #000; font-weight: bold; }")
        folder_layout.addWidget(self.download_folder_input)

        self.browse_folder_button = QPushButton("Browse")
        self.browse_folder_button.clicked.connect(self.browse_download_folder)
        self.browse_folder_button.setStyleSheet(
            "QPushButton { background-color: #06283D; color: white; font-weight: bold; }")
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

        self.progress_text = QTextEdit()
        self.progress_text.setStyleSheet(
            "QTextEdit { background-color: #06283D; color: green; font-weight: bold; }")
        layout.addWidget(self.progress_text)

        self.done_label = QLabel(
            "<b><font color='green'>Download Completed!</font></b>")
        self.done_label.hide()
        layout.addWidget(self.done_label)

        return widget

    def create_settings_tab(self):
        widget = QWidget()
        layout = QVBoxLayout(widget)

        ffmpeg_layout = QHBoxLayout()
        ffmpeg_label = QLabel("<b>FFmpeg Path:</b>")
        ffmpeg_layout.addWidget(ffmpeg_label)

        self.ffmpeg_input = QLineEdit()
        self.ffmpeg_input.setStyleSheet(
            "QLineEdit { background-color: #fff; color: #000; font-weight: bold; }")
        ffmpeg_layout.addWidget(self.ffmpeg_input)

        ffmpeg_browse_button = QPushButton("Browse")
        ffmpeg_browse_button.clicked.connect(self.browse_ffmpeg)
        ffmpeg_browse_button.setStyleSheet(
            "QPushButton { background-color: #06283D; color: white; font-weight: bold; }")
        ffmpeg_layout.addWidget(ffmpeg_browse_button)

        layout.addLayout(ffmpeg_layout)

        ytdlp_layout = QHBoxLayout()
        ytdlp_label = QLabel("<b>yt-dlp Path:</b>")
        ytdlp_layout.addWidget(ytdlp_label)

        self.yt_dlp_input = QLineEdit()
        self.yt_dlp_input.setStyleSheet(
            "QLineEdit { background-color: #fff; color: #000; font-weight: bold; }")
        ytdlp_layout.addWidget(self.yt_dlp_input)

        ytdlp_browse_button = QPushButton("Browse")
        ytdlp_browse_button.clicked.connect(self.browse_ytdlp)
        ytdlp_browse_button.setStyleSheet(
            "QPushButton { background-color: #06283D; color: white; font-weight: bold; }")
        ytdlp_layout.addWidget(ytdlp_browse_button)

        layout.addLayout(ytdlp_layout)

        return widget

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

        self.download_thread = DownloadThread(
            url, output_folder, ffmpeg_path, yt_dlp_path, download_type, resolution)
        self.download_thread.download_progress.connect(self.update_progress)
        self.download_thread.download_output.connect(self.update_progress_text)
        self.download_thread.download_complete.connect(self.download_complete)
        self.download_thread.start()

    def update_progress(self, progress):
        self.progress_bar.setValue(progress)
        self.progress_text.append(f"Progress: {progress}%")

    def update_progress_text(self, output):
        self.progress_text.append(output)

    def download_complete(self):
        self.done_label.show()
        self.url_input.clear()

    def save_settings(self):
        self.settings.setValue(
            "download_folder", self.download_folder_input.text())
        self.settings.setValue("ffmpeg_path", self.ffmpeg_input.text())
        self.settings.setValue("yt_dlp_path", self.yt_dlp_input.text())
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

        window_size = self.settings.value("window_size", QSize(800, 600))
        window_position = self.settings.value(
            "window_position", QPoint(100, 100))

        self.resize(window_size)
        self.move(window_position)

    def customize_appearance(self):
        menu = self.menuBar()
        menu.setStyleSheet(
            "QMenuBar { background-color: #06283D; color: white; font-weight: bold; }")

        self.settingsTab.setStyleSheet(
            "QWidget { background-color: #000128; color: white; font-weight: bold; }")

        tabBar = self.tabWidget.tabBar()
        tabBar.setStyleSheet(
            "QTabBar::tab { background-color: #000128; color: white; font-weight: bold; }")

        self.progress_bar.setStyleSheet(
            "QProgressBar { border: 1px solid #47B5FF; border-radius: 5px; text-align: center; background-color: #06283D; color: white; }"
            "QProgressBar::chunk { background-color: #47B5FF; }"
        )

        self.download_type_combobox.setStyleSheet(
            "QComboBox { background-color: #06283D; color: white; font-weight: bold; }"
        )
        self.resolution_combobox.setStyleSheet(
            "QComboBox { background-color: #06283D; color: white; font-weight: bold; }"
        )

        self.url_input.setStyleSheet(
            "QLineEdit { background-color: #DFF6FF; color: #000; font-weight: bold; }"
        )
        self.download_folder_input.setStyleSheet(
            "QLineEdit { background-color: #DFF6FF; color: #000; font-weight: bold; }"
        )
        self.ffmpeg_input.setStyleSheet(
            "QLineEdit { background-color: #DFF6FF; color: #000; font-weight: bold; }"
        )
        self.yt_dlp_input.setStyleSheet(
            "QLineEdit { background-color: #DFF6FF; color: #000; font-weight: bold; }"
        )

        self.browse_button.setStyleSheet(
            "QPushButton { background-color: #1363DF; color: white; font-weight: bold; }"
        )
        self.download_button.setStyleSheet(
            "QPushButton { background-color: #1363DF; color: white; font-weight: bold; }"
        )
        self.cancel_button.setStyleSheet(
            "QPushButton { background-color: #1363DF; color: white; font-weight: bold; }"
        )
        self.browse_folder_button.setStyleSheet(
            "QPushButton { background-color: #1363DF; color: white; font-weight: bold; }"
        )

        self.progress_text.setStyleSheet(
            "QTextEdit { background-color: #06283D; color: green; font-weight: bold; }"
        )
        self.done_label.setStyleSheet(
            "QLabel { color: green; font-weight: bold; font-size: 14px; }"
        )


def main():
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec_())


if __name__ == "__main__":
    main()
