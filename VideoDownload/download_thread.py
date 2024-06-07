from PyQt5.QtCore import QThread, pyqtSignal
import subprocess


class DownloadThread(QThread):
    download_progress = pyqtSignal(int)
    download_output = pyqtSignal(str)
    download_complete = pyqtSignal()

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

            command = self.construct_command(url)
            self.execute_command(command)

        if self.running:
            self.download_complete.emit()

    def construct_command(self, url):
        if self.download_type == "video":
            return self.construct_video_command(url)
        elif self.download_type == "audio":
            return self.construct_audio_command(url)
        elif self.download_type == "video with audio":
            return self.construct_video_with_audio_command(url)
        else:
            raise ValueError(f"Invalid download type: {self.download_type}")

    def construct_video_command(self, url):
        format_spec = "bestvideo" if self.resolution == "best" else f"bestvideo[height<={self.resolution}]"
        return [
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

    def construct_audio_command(self, url):
        return [
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

    def construct_video_with_audio_command(self, url):
        format_spec = "bestvideo+bestaudio/best" if self.resolution == "best" else f"bestvideo[height<={self.resolution}]+bestaudio/best"
        return [
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

    def execute_command(self, command):
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            creationflags=subprocess.CREATE_NO_WINDOW,
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

    def stop(self):
        self.running = False
