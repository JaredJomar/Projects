import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import subprocess
import threading
import json
import os
import queue

class DownloadThread(threading.Thread):
    def __init__(self, urls, output_folder, ffmpeg_path, yt_dlp_path, download_type, resolution, main_window, max_threads=5):
        super().__init__()
        self.main_window = main_window
        self.urls = urls.split('\n')
        self.output_folder = output_folder
        self.ffmpeg_path = ffmpeg_path
        self.yt_dlp_path = yt_dlp_path
        self.download_type = download_type
        self.resolution = resolution
        self.running = True
        self.progress_bar = main_window.progress_bar
        self.max_threads = max_threads
        self.queue = queue.Queue()

    def download_video(self, url):
        if self.download_type == "video":
            command = [self.yt_dlp_path, "--format", "bestvideo+bestaudio/best", "--merge-output-format", "mkv", "-o", f"{self.output_folder}/%(title)s.%(ext)s", "--ffmpeg-location", self.ffmpeg_path, url]
        elif self.download_type == "audio":
            command = [self.yt_dlp_path, "--format", "bestaudio/best", "-x", "--audio-format", "mp3", "-o", f"{self.output_folder}/%(title)s.%(ext)s", "--ffmpeg-location", self.ffmpeg_path, url]
        elif self.download_type == "video with audio":
            command = [self.yt_dlp_path, "--format", "bestvideo+bestaudio/best", "--merge-output-format", "mkv", "-o", f"{self.output_folder}/%(title)s.%(ext)s", "--ffmpeg-location", self.ffmpeg_path, url]
        else:
            raise ValueError(f"Invalid download type: {self.download_type}")

        if self.resolution != "best":
            command.insert(2, self.resolution)

        process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, bufsize=1, universal_newlines=True)
        line = process.stdout.readline()

        while line or process.poll() is None:
            if line:
                self.main_window.update_progress_text(line.strip())
            line = process.stdout.readline()

        process.stdout.close()
        process.stderr.close()
        self.progress_bar["value"] += 1
        self.progress_bar.update()

    def run(self):
        total_urls = len(self.urls)
        self.progress_bar["maximum"] = total_urls

        download_threads = []

        for index, url in enumerate(self.urls):
            if not self.running:
                return

            self.main_window.update_progress_text(f"Downloading {url} ({index + 1}/{total_urls})")
            self.queue.put(url)

            if len(download_threads) < self.max_threads:
                url_to_download = self.queue.get()
                download_thread = threading.Thread(target=self.download_video, args=(url_to_download,))
                download_threads.append(download_thread)
                download_thread.start()

        # Wait for all remaining download threads to finish
        for download_thread in download_threads:
            download_thread.join()

        self.main_window.download_complete()

    def stop(self):
        self.running = False

class MainWindow(tk.Tk):
    def __init__(self):
        super().__init__()

        self.settings = {}

        self.protocol("WM_DELETE_WINDOW", self.on_close)
        self.configure_ui()
        self.load_settings()
        self.center()

    # Open on the center of the screen
    def center(self):
        self.update_idletasks()
        width = self.winfo_width()
        frm_width = self.winfo_rootx() - self.winfo_x()
        win_width = width + 2 * frm_width
        height = self.winfo_height()
        titlebar_height = self.winfo_rooty() - self.winfo_y()
        win_height = height + titlebar_height + frm_width
        x = self.winfo_screenwidth() // 2 - win_width // 2
        y = self.winfo_screenheight() // 2 - win_height // 2
        self.geometry('{}x{}+{}+{}'.format(width, height, x, y))
        self.deiconify()

    def on_close(self):
        self.save_settings()
        self.destroy()

    def configure_ui(self):
        self.title("Video Downloader")
        self.geometry("600x400")
        self.configure(bg="#06283D")

        style = ttk.Style()
        style.configure('TFrame', background="#06283D")

        self.create_tabs()

    def create_tabs(self):
        tab_control = ttk.Notebook(self)

        main_tab = ttk.Frame(tab_control)
        style = ttk.Style(main_tab)
        style.configure('TFrame', background="#06283D")
        settings_tab = ttk.Frame(tab_control)
        style = ttk.Style(settings_tab)
        style.configure('TFrame', background="#06283D")

        tab_control.add(main_tab, text="Main")
        tab_control.add(settings_tab, text="Settings")

        self.create_main_tab(main_tab)
        self.create_settings_tab(settings_tab)

        tab_control.pack(expand=1, fill="both")

    def create_main_tab(self, tab):
        label_url = ttk.Label(tab, text="URL:", background="#06283D", foreground="white", font=("Arial", 10, "bold"))
        label_url.grid(row=0, column=0, sticky="e", padx=5, pady=5)

        self.url_input = ttk.Entry(tab, font=("Arial", 10, "bold"))
        self.url_input.grid(row=0, column=1, columnspan=2, sticky="nsew", padx=5, pady=5)

        browse_text_file_button = ttk.Button(tab, text="Browse Text File", command=self.browse_text_file, style="TButton", cursor="hand2")
        browse_text_file_button.grid(row=0, column=3, sticky="w", padx=5, pady=5)

        start_button = ttk.Button(tab, text="Download", command=self.start_download, style="TButton", cursor="hand2")
        start_button.grid(row=0, column=5, sticky="w", padx=5, pady=5)

        cancel_button = ttk.Button(tab, text="Cancel", command=self.cancel_download, style="TButton", cursor="hand2")
        cancel_button.grid(row=0, column=6, sticky="w", padx=5, pady=5)

        label_download_folder = ttk.Label(tab, text="Download Path:", background="#06283D", foreground="white", font=("Arial", 10, "bold"))
        label_download_folder.grid(row=1, column=0, sticky="e", padx=5, pady=5)

        self.download_folder_input = ttk.Entry(tab, font=("Arial", 10, "bold"))
        self.download_folder_input.grid(row=1, column=1, columnspan=2, sticky="nsew", padx=5, pady=5)

        browse_download_folder_button = ttk.Button(tab, text="Browse", command=self.browse_download_folder, style="TButton", cursor="hand2")
        browse_download_folder_button.grid(row=1, column=3, sticky="w", padx=5, pady=5)

        label_download_type = ttk.Label(tab, text="Download Type:", background="#06283D", foreground="white", font=("Arial", 10, "bold"))
        label_download_type.grid(row=2, column=0, sticky="e", padx=5, pady=5)

        self.download_type_combobox = ttk.Combobox(tab, values=["video", "audio", "video with audio"], font=("Arial", 10, "bold"))
        self.download_type_combobox.current(2)  # Set "video with audio" as the default
        self.download_type_combobox.grid(row=2, column=1, columnspan=2, sticky="nsew", padx=5, pady=5)

        label_resolution = ttk.Label(tab, text="Resolution:", background="#06283D", foreground="white", font=("Arial", 10, "bold"))
        label_resolution.grid(row=3, column=0, sticky="e", padx=5, pady=5)

        self.resolution_combobox = ttk.Combobox(tab, values=["240p", "360p", "480p", "720p", "1080p", "best"], font=("Arial", 10, "bold"))
        self.resolution_combobox.current(5)  # Set "best" as the default
        self.resolution_combobox.grid(row=3, column=1, columnspan=2, sticky="nsew", padx=5, pady=5)

        self.progress_text = tk.Text(tab, height=5, width=50, font=("Arial", 10, "bold"))
        self.progress_text.grid(row=4, column=0, columnspan=7, sticky="nsew", padx=5, pady=5)

        self.progress_bar = ttk.Progressbar(tab, orient="horizontal", length=500, mode="determinate")
        self.progress_bar.grid(row=5, column=0, columnspan=7, pady=5)

    def create_settings_tab(self, tab):
        label_ffmpeg = ttk.Label(tab, text="FFmpeg Path:", background="#06283D", foreground="white", font=("Arial", 10, "bold"))
        label_ffmpeg.grid(row=0, column=0, sticky="e", padx=5, pady=5)

        self.ffmpeg_input = ttk.Entry(tab, font=("Arial", 10, "bold"))
        self.ffmpeg_input.grid(row=0, column=1, columnspan=2, sticky="we", padx=5, pady=5)

        browse_ffmpeg_button = ttk.Button(tab, text="Browse", command=self.browse_ffmpeg, style="TButton", cursor="hand2")
        browse_ffmpeg_button.grid(row=0, column=3, sticky="w", padx=5, pady=5)

        label_yt_dlp = ttk.Label(tab, text="yt-dlp Path:", background="#06283D", foreground="white", font=("Arial", 10, "bold"))
        label_yt_dlp.grid(row=1, column=0, sticky="e", padx=5, pady=5)

        self.yt_dlp_input = ttk.Entry(tab, font=("Arial", 10, "bold"))
        self.yt_dlp_input.grid(row=1, column=1, columnspan=2, sticky="we", padx=5, pady=5)

        browse_yt_dlp_button = ttk.Button(tab, text="Browse", command=self.browse_ytdlp, style="TButton", cursor="hand2")
        browse_yt_dlp_button.grid(row=1, column=3, sticky="w", padx=5, pady=5)

    def browse_text_file(self):
        file_path = filedialog.askopenfilename(title="Select Text File", filetypes=[("Text files", "*.txt"), ("All files", "*.*")])

        if file_path and os.path.isfile(file_path) and file_path.endswith(".txt"):
            with open(file_path, "r") as file:
                urls = file.read()
                self.url_input.delete(0, tk.END)
                self.url_input.insert(0, urls)

        self.save_settings()

    def browse_download_folder(self):
        folder_path = filedialog.askdirectory(title="Select Download Folder")
        if folder_path:
            self.download_folder_input.delete(0, tk.END)
            self.download_folder_input.insert(0, folder_path)

        self.save_settings()

    def browse_ffmpeg(self):
        file_path = filedialog.askopenfilename(title="Select FFmpeg")
        if file_path:
            self.ffmpeg_input.delete(0, tk.END)
            self.ffmpeg_input.insert(0, file_path)

    def browse_ytdlp(self):
        file_path = filedialog.askopenfilename(title="Select yt-dlp")
        if file_path:
            self.yt_dlp_input.delete(0, tk.END)
            self.yt_dlp_input.insert(0, file_path)

    def start_download(self):
        url = self.url_input.get()
        output_folder = self.download_folder_input.get()
        ffmpeg_path = self.ffmpeg_input.get()
        yt_dlp_path = self.yt_dlp_input.get()
        download_type = self.download_type_combobox.get()
        resolution = self.resolution_combobox.get()

        self.download_thread = DownloadThread(url, output_folder, ffmpeg_path, yt_dlp_path, download_type, resolution, self)
        self.download_thread.start()

    def cancel_download(self):
        if hasattr(self, 'download_thread'):
            self.download_thread.stop()
            self.download_thread = None

    def update_progress_text(self, text):
        self.progress_text.insert(tk.END, text + "\n")
        self.progress_text.see(tk.END)

    def download_complete(self):
        self.done_label.grid(row=6, column=0, columnspan=4, pady=5)
        self.download_thread = None

    def save_settings(self):
        self.settings['ffmpeg_path'] = self.ffmpeg_input.get()
        self.settings['yt_dlp_path'] = self.yt_dlp_input.get()
        self.settings['download_folder'] = self.download_folder_input.get()

        with open('settings.json', 'w') as f:
            json.dump(self.settings, f)

    def load_settings(self):
        if os.path.exists('settings.json'):
            with open('settings.json', 'r') as f:
                self.settings = json.load(f)

            # Load settings only if download_folder_input is not specified
            if not self.download_folder_input.get():
                self.ffmpeg_input.insert(0, self.settings.get('ffmpeg_path', ''))
                self.yt_dlp_input.insert(0, self.settings.get('yt_dlp_path', ''))
                self.download_folder_input.insert(0, self.settings.get('download_folder', ''))

        else:
            self.settings = {}
            self.save_settings()


if __name__ == "__main__":
    app = MainWindow()
    app.mainloop()