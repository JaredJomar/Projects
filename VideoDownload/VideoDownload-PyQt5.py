from PyQt5.QtWidgets import QApplication, QMainWindow, QTabWidget, QVBoxLayout, QHBoxLayout, QLineEdit, QPushButton, QProgressBar, QFileDialog, QWidget, QLabel, QTextEdit, QComboBox, QDesktopWidget
from PyQt5.QtCore import QSettings, QSize, QPoint, pyqtSignal, QObject, Qt, QThread
from PyQt5.QtGui import QPalette, QColor
import sys
import os
import subprocess
import ctypes

class DownloadThread(QThread):
    # Define signals that will be emitted during the download process
    download_progress = pyqtSignal(int)  # Signal to update the download progress (in percentage)
    download_output = pyqtSignal(str)  # Signal to send output messages during the download
    download_complete = pyqtSignal()  # Signal to indicate that the download is complete

    def __init__(self, urls, output_folder, ffmpeg_path, yt_dlp_path, download_type, resolution):
        super().__init__()
        self.urls = urls.split('\n')  # Split the URLs by newline characters to get a list of URLs
        self.output_folder = output_folder  # The folder where the downloaded videos will be saved
        self.ffmpeg_path = ffmpeg_path  # The path to the ffmpeg executable
        self.yt_dlp_path = yt_dlp_path  # The path to the yt-dlp executable
        self.download_type = download_type  # The type of download (e.g., video or audio)
        self.resolution = resolution  # The resolution for the downloaded video
        self.running = True  # A flag to indicate whether the download thread is running

    def run(self):
        # Iterate over each URL in the list of URLs
        for url in self.urls:
            # If the running flag is False, stop the download process
            if not self.running:
                return

            # Depending on the download type, construct the command to be executed
            if self.download_type == "video":
                command = [self.yt_dlp_path, "--format", "bestvideo+bestaudio/best", "--merge-output-format", "mkv", "-o", self.output_folder + "/%(title)s.%(ext)s", "--ffmpeg-location", self.ffmpeg_path, url]
            elif self.download_type == "audio":
                command = [self.yt_dlp_path, "--format", "bestaudio/best", "-x", "--audio-format", "mp3", "-o", self.output_folder + "/%(title)s.%(ext)s", "--ffmpeg-location", self.ffmpeg_path, url]
            elif self.download_type == "video with audio":
                command = [self.yt_dlp_path, "--format", "bestvideo+bestaudio/best", "--merge-output-format", "mkv", "-o", self.output_folder + "/%(title)s.%(ext)s", "--ffmpeg-location", self.ffmpeg_path, url]
            else:
                # If the download type is not recognized, raise an error
                raise ValueError(f"Invalid download type: {self.download_type}")

            # Execute the command and get the output
            process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, universal_newlines=True)

            # Iterate over each line in the output
            for line in process.stdout:
                # If the running flag is False, stop the download process
                if not self.running:
                    return
                # Emit the output line
                self.download_output.emit(line.strip())
                # If the line contains the word "download", extract the download progress and emit it
                if "download" in line:
                    words = line.split()
                    for word in words:
                        if '%' in word:
                            percentage = word.replace('%','')
                            self.download_progress.emit(int(float(percentage)))
                            break

        # If the running flag is True after all URLs have been processed, emit the download complete signal
        if self.running:
            self.download_complete.emit()

    def stop(self):
        # Set the running flag to False to stop the download process
        self.running = False

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()

        # Set the main window's background color
        self.setStyleSheet("background-color: #000128;")

        # Create a QSettings object to save and load settings
        self.settings = QSettings("YourCompany", "VideoDownloadApp")

        # Create a palette to customize the appearance of the widgets
        palette = QPalette()
        palette.setColor(QPalette.Window, QColor("#DFF6FF"))  # Set the background color of the widgets
        palette.setColor(QPalette.WindowText, QColor(Qt.white))  # Set the text color of the widgets
        palette.setColor(QPalette.Button, QColor("#1363DF"))  # Set the background color of the buttons
        palette.setColor(QPalette.ButtonText, QColor(Qt.white))  # Set the text color of the buttons
        palette.setColor(QPalette.Base, QColor("#06283D"))  # Set the base color of the widgets
        palette.setColor(QPalette.Highlight, QColor("#47B5FF"))  # Set the color used to indicate a selected item
        palette.setColor(QPalette.HighlightedText, QColor("#DFF6FF"))  # Set the text color of a selected item
        self.setPalette(palette)  # Apply the palette to the main window

        # Create a tab widget to hold the main and settings tabs
        self.tabWidget = QTabWidget(self)
        self.tabWidget.setStyleSheet("QTabWidget::pane { background-color: #06283D; }")  # Set the background color of the tab widget
        self.tabWidget.setTabBarAutoHide(True)  # Hide the tab bar when only one tab is present
        self.setCentralWidget(self.tabWidget)  # Set the tab widget as the central widget of the main window

        # Create the main and settings tabs and add them to the tab widget
        self.mainTab = self.create_main_tab()
        self.tabWidget.addTab(self.mainTab, "  Main  ")
        self.settingsTab = self.create_settings_tab()
        self.tabWidget.addTab(self.settingsTab, "  Settings  ")

        # Customize the appearance of the menu bar
        menu = self.menuBar()
        menu.setStyleSheet("QMenuBar { background-color: #06283D; color: white; font-weight: bold; }")

        # Customize the appearance of the settings tab
        self.settingsTab.setStyleSheet("QWidget { background-color: #000128; color: white; font-weight: bold; }")

        # Customize the appearance of the tab bar
        tabBar = self.tabWidget.tabBar()
        tabBar.setStyleSheet("QTabBar::tab { background-color: #000128; color: white; font-weight: bold; }")

        # Customize the appearance of the progress bar
        self.progress_bar.setStyleSheet("QProgressBar { border: 1px solid #47B5FF; border-radius: 5px; text-align: center; background-color: #06283D; color: white; } QProgressBar::chunk { background-color: #47B5FF; }")

        # Customize the appearance of the download type and resolution comboboxes
        self.download_type_combobox.setStyleSheet("QComboBox { background-color: #06283D; color: white; font-weight: bold; }")
        self.resolution_combobox.setStyleSheet("QComboBox { background-color: #06283D; color: white; font-weight: bold; }")

        # Load paths, window size, and position from settings
        self.load_settings()

        # Set the initial size of the main window
        self.resize(500, 400)

        # Center the main window on the screen
        qtRectangle = self.frameGeometry()
        centerPoint = QDesktopWidget().availableGeometry().center()
        qtRectangle.moveCenter(centerPoint)
        self.move(qtRectangle.topLeft())

    def create_main_tab(self):
        # Create a new widget and a vertical box layout for the main tab
        widget = QWidget()
        layout = QVBoxLayout(widget)

        # Create a horizontal box layout for the URL input, browse button, download button, and cancel button
        url_layout = QHBoxLayout()

        # Create a label for the URL input and add it to the URL layout
        url_label = QLabel("<b>URL:</b>")
        url_label.setStyleSheet("QLabel { color: white; }")  # Set the text color of the label to white
        url_layout.addWidget(url_label)

        # Create the URL input and add it to the URL layout
        self.url_input = QLineEdit()
        self.url_input.setStyleSheet("QLineEdit { background-color: #fff; color: #000; font-weight: bold; }")  # Set the background color of the URL input to white and the text color to black
        url_layout.addWidget(self.url_input)

        # Create the browse button, connect its clicked signal to the browse_folder method, and add it to the URL layout
        self.browse_button = QPushButton("Browse")
        self.browse_button.clicked.connect(self.browse_folder)
        self.browse_button.setStyleSheet("QPushButton { background-color: #06283D; color: white; font-weight: bold; }")  # Set the background color of the browse button to #06283D and the text color to white
        url_layout.addWidget(self.browse_button)

        # Create the download button, connect its clicked signal to the start_download method, and add it to the URL layout
        self.download_button = QPushButton("Download")
        self.download_button.clicked.connect(self.start_download)
        self.download_button.setStyleSheet("QPushButton { background-color: #06283D; color: white; font-weight: bold; }")  # Set the background color of the download button to #06283D and the text color to white
        url_layout.addWidget(self.download_button)

        # Create the cancel button, connect its clicked signal to the cancel_download method, and add it to the URL layout
        self.cancel_button = QPushButton("Cancel")
        self.cancel_button.clicked.connect(self.cancel_download)
        self.cancel_button.setStyleSheet("QPushButton { background-color: #06283D; color: white; font-weight: bold; }")  # Set the background color of the cancel button to #06283D and the text color to white
        url_layout.addWidget(self.cancel_button)

        # Add the URL layout to the main layout
        layout.addLayout(url_layout)

        # Create a horizontal box layout for the download folder input and browse button
        folder_layout = QHBoxLayout()

        # Create a label for the download folder input and add it to the folder layout
        folder_label = QLabel("<b>Download Path:</b>")
        folder_label.setStyleSheet("QLabel { color: white; }")  # Set the text color of the label to white
        folder_layout.addWidget(folder_label)
        
        # Create the download folder input and add it to the folder layout
        self.download_folder_input = QLineEdit()
        self.download_folder_input.setStyleSheet("QLineEdit { background-color: #fff; color: #000; font-weight: bold; }")  # Set the background color of the download folder input to white and the text color to black
        folder_layout.addWidget(self.download_folder_input)
        
        # Create the browse button, connect its clicked signal to the browse_download_folder method, and add it to the folder layout
        self.browse_button = QPushButton("Browse")
        self.browse_button.clicked.connect(self.browse_download_folder)
        self.browse_button.setStyleSheet("QPushButton { background-color: #06283D; color: white; font-weight: bold; }")  # Set the background color of the browse button to #06283D and the text color to white
        folder_layout.addWidget(self.browse_button)
        
        # Add the folder layout to the main layout
        layout.addLayout(folder_layout)

        # Create a horizontal box layout for the download type and resolution selection
        options_layout = QHBoxLayout()

        # Create a label for the download type selection and add it to the options layout
        download_type_label = QLabel("<b>Download Type:</b>")
        download_type_label.setStyleSheet("QLabel { color: white; }")  # Set the text color of the label to white
        options_layout.addWidget(download_type_label)

        # Create the download type combobox, add the download types to it, set the default download type, and add it to the options layout
        self.download_type_combobox = QComboBox()
        self.download_type_combobox.addItems(["video", "audio", "video with audio"])
        self.download_type_combobox.setCurrentIndex(2)  # Set "video with audio" as the default
        options_layout.addWidget(self.download_type_combobox)

        # Create a label for the resolution selection and add it to the options layout
        resolution_label = QLabel("<font color='white'>Resolution:</font>")
        options_layout.addWidget(resolution_label)

        # Create the resolution combobox, add the resolutions to it, set the default resolution, and add it to the options layout
        self.resolution_combobox = QComboBox()
        self.resolution_combobox.addItems(["240p", "360p", "480p", "720p", "1080p", "best"])
        self.resolution_combobox.setCurrentIndex(5)  # Set "best" as the default
        options_layout.addWidget(self.resolution_combobox)

        # Add the options layout to the main layout
        layout.addLayout(options_layout)
        
        # Create a progress bar to display the download progress and add it to the main layout
        self.progress_bar = QProgressBar()
        layout.addWidget(self.progress_bar)

        # Create a text box to display progress information, set its style, and add it to the main layout
        self.progress_text = QTextEdit()
        self.progress_text.setStyleSheet("QTextEdit { background-color: #06283D; color: green; font-weight: bold; }")  # Set the background color of the text box to #06283D, the text color to green, and the font weight to bold
        layout.addWidget(self.progress_text)

        # Create a label to indicate download completion, hide it initially, and add it to the main layout
        self.done_label = QLabel("<b><font color='green'>Download Completed!</font></b>")
        self.done_label.hide()  # The label is initially hidden and will be shown when the download is complete
        layout.addWidget(self.done_label)

        # Return the widget that contains the main layout
        return widget

    def create_settings_tab(self):
        # Create a new widget and a vertical box layout for the settings tab
        widget = QWidget()
        layout = QVBoxLayout(widget)

        # Create a horizontal box layout for the FFmpeg path input and browse button
        ffmpeg_layout = QHBoxLayout()

        # Create a label for the FFmpeg path input and add it to the FFmpeg layout
        ffmpeg_label = QLabel("<b>FFmpeg Path:</b>")
        ffmpeg_layout.addWidget(ffmpeg_label)
        
        # Create the FFmpeg path input and add it to the FFmpeg layout
        self.ffmpeg_input = QLineEdit()
        self.ffmpeg_input.setStyleSheet("QLineEdit { background-color: #fff; color: #000; font-weight: bold; }")  # Set the background color of the FFmpeg path input to white and the text color to black
        ffmpeg_layout.addWidget(self.ffmpeg_input)
        
        # Create the browse button, connect its clicked signal to the browse_ffmpeg method, and add it to the FFmpeg layout
        ffmpeg_browse_button = QPushButton("Browse")
        ffmpeg_browse_button.clicked.connect(self.browse_ffmpeg)
        ffmpeg_browse_button.setStyleSheet("QPushButton { background-color: #06283D; color: white; font-weight: bold; }")  # Set the background color of the browse button to #06283D and the text color to white
        ffmpeg_layout.addWidget(ffmpeg_browse_button)
        
        # Add the FFmpeg layout to the main layout
        layout.addLayout(ffmpeg_layout)

        # Create a horizontal box layout for the yt-dlp path input and browse button
        ytdlp_layout = QHBoxLayout()

        # Create a label for the yt-dlp path input and add it to the yt-dlp layout
        ytdlp_label = QLabel("<b>yt-dlp Path:</b>")
        ytdlp_layout.addWidget(ytdlp_label)
        
        # Create the yt-dlp path input and add it to the yt-dlp layout
        self.yt_dlp_input = QLineEdit()
        self.yt_dlp_input.setStyleSheet("QLineEdit { background-color: #fff; color: #000; font-weight: bold; }")  # Set the background color of the yt-dlp path input to white and the text color to black
        ytdlp_layout.addWidget(self.yt_dlp_input)
        
        # Create the browse button, connect its clicked signal to the browse_ytdlp method, and add it to the yt-dlp layout
        ytdlp_browse_button = QPushButton("Browse")
        ytdlp_browse_button.clicked.connect(self.browse_ytdlp)
        ytdlp_browse_button.setStyleSheet("QPushButton { background-color: #06283D; color: white; font-weight: bold; }")  # Set the background color of the browse button to #06283D and the text color to white
        ytdlp_layout.addWidget(ytdlp_browse_button)
        
        # Add the yt-dlp layout to the main layout
        layout.addLayout(ytdlp_layout)

        # Return the widget that contains the main layout
        return widget

    def browse_folder(self):
        # Open a file dialog to select a text file
        file, _ = QFileDialog.getOpenFileName(self, "Select Text File", "", "Text Files (*.txt)")
        if file:
            # If a file is selected, open it and read the URLs
            with open(file, 'r') as f:
                urls = f.read().splitlines()
                # Set the URLs in the URL input field
                self.url_input.setText('\n'.join(urls))
    
    def browse_download_folder(self):
        # Open a folder dialog to select a download folder
        folder = QFileDialog.getExistingDirectory(self, "Select Folder")
        if folder:
            # If a folder is selected, set it in the download folder input field and save the settings
            self.download_folder_input.setText(folder)
            self.save_settings()

    def cancel_download(self):
        # If a download is in progress, stop it
        if self.download_thread:
            self.download_thread.stop()
            self.download_thread = None
            # Reset the progress bar and clear the progress text
            self.progress_bar.setValue(0)
            self.progress_text.clear()

    def browse_ffmpeg(self):
        # Open a file dialog to select the FFmpeg executable
        file = QFileDialog.getOpenFileName(self, "Select ffmpeg")
        if file[0]:
            # If a file is selected, set it in the FFmpeg input field and save the settings
            self.ffmpeg_input.setText(file[0])
            self.save_settings()

    def browse_ytdlp(self):
        # Open a file dialog to select the yt-dlp executable
        file = QFileDialog.getOpenFileName(self, "Select yt-dlp")
        if file[0]:
            # If a file is selected, set it in the yt-dlp input field and save the settings
            self.yt_dlp_input.setText(file[0])
            self.save_settings()

    def start_download(self):
        # Get the URL, output folder, FFmpeg path, yt-dlp path, download type, and resolution from the input fields and comboboxes
        url = self.url_input.text()
        output_folder = self.download_folder_input.text()
        ffmpeg_path = self.ffmpeg_input.text()
        yt_dlp_path = self.yt_dlp_input.text()
        download_type = self.download_type_combobox.currentText()
        resolution = self.resolution_combobox.currentText()

        # Create a new download thread with the given parameters
        self.download_thread = DownloadThread(url, output_folder, ffmpeg_path, yt_dlp_path, download_type, resolution)
        # Connect the download thread's signals to the appropriate slots
        self.download_thread.download_progress.connect(self.update_progress)
        self.download_thread.download_output.connect(self.update_progress_text)
        self.download_thread.download_complete.connect(self.download_complete)
        # Start the download thread
        self.download_thread.start()

    def update_progress(self, progress):
        # Update the progress bar with the given progress value
        self.progress_bar.setValue(int(progress))
        # Append the progress value to the progress text
        self.progress_text.append(f"Progress: {progress}%")

    def update_progress_text(self, output):
        # Append the given output to the progress text
        self.progress_text.append(output)

    def download_complete(self):
        # Show the "Download Completed" label and clear the URL input field
        self.done_label.show()
        self.url_input.clear()

    def save_settings(self):
        # Save the download folder, FFmpeg path, and yt-dlp path to the settings
        self.settings.setValue("download_folder", self.download_folder_input.text())
        self.settings.setValue("ffmpeg_path", self.ffmpeg_input.text())
        self.settings.setValue("yt_dlp_path", self.yt_dlp_input.text())

        # Save the window size and position to the settings
        self.settings.setValue("window_size", self.size())
        self.settings.setValue("window_position", self.pos())

    def load_settings(self):
        # Load the download folder, FFmpeg path, and yt-dlp path from the settings
        download_folder = self.settings.value("download_folder", "")
        ffmpeg_path = self.settings.value("ffmpeg_path", "")
        yt_dlp_path = self.settings.value("yt_dlp_path", "")

        # If the settings contain a download folder, FFmpeg path, and yt-dlp path, set them in the input fields
        if download_folder:
            self.download_folder_input.setText(download_folder)
        if ffmpeg_path:
            self.ffmpeg_input.setText(ffmpeg_path)
        if yt_dlp_path:
            self.yt_dlp_input.setText(yt_dlp_path)

        # Load the window size and position from the settings
        window_size = self.settings.value("window_size", QSize(800, 600))
        window_position = self.settings.value("window_position", QPoint(100, 100))

        # Resize and move the window to the loaded size and position
        self.resize(window_size)
        self.move(window_position)

def main():
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec_())

if __name__ == "__main__":
    main()
