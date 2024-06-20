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
from PyQt5.QtGui import QPalette, QColor
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


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()

        self.setStyleSheet(f"background-color: {WINDOW_BACKGROUND_COLOR};")

        self.settings = QSettings("YourCompany", "VideoDownloadApp")

        palette = self.create_palette()
        self.setPalette(palette)

        self.tabWidget = QTabWidget(self)
        self.tabWidget.setStyleSheet(
            f"QTabWidget::pane {{ background-color: {TAB_BACKGROUND_COLOR}; }}")
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
        settings_window = SettingsWindow(self)
        return settings_window

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

    def start_download(self):
        url = self.url_input.text()
        output_folder = self.download_folder_input.text()
        ffmpeg_path = self.settingsTab.ffmpeg_input.text()
        yt_dlp_path = self.settingsTab.yt_dlp_input.text()
        download_type = self.download_type_combobox.currentText()
        resolution = self.resolution_combobox.currentText()

        self.done_label.hide()

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
        self.settings.setValue(
            "ffmpeg_path", self.settingsTab.ffmpeg_input.text())
        self.settings.setValue(
            "yt_dlp_path", self.settingsTab.yt_dlp_input.text())
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
            "QComboBox QAbstractItemView { background-color: #06283D; color: white; font-weight: bold; selection-background-color: #1363DF; }"
        )
        self.resolution_combobox.setStyleSheet(
            "QComboBox { background-color: #06283D; color: white; font-weight: bold; }"
            "QComboBox QAbstractItemView { background-color: #06283D; color: white; font-weight: bold; selection-background-color: #1363DF; }"
        )
