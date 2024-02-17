import tkinter as tk
from tkinter import filedialog, messagebox
from tkinter.ttk import Progressbar
from moviepy.editor import VideoFileClip
import os
from threading import Thread


class VideoTranscoderApp:
    def __init__(self, master):
        self.master = master
        self.master.title("Video Transcoder")
        self.master.geometry("600x100")
        self.master.configure(bg='#808080')  # Gray background

        # Center the window on the screen
        screen_width = self.master.winfo_screenwidth()
        screen_height = self.master.winfo_screenheight()
        x_coordinate = (screen_width - 600) // 2
        y_coordinate = (screen_height - 100) // 2
        self.master.geometry("+{}+{}".format(x_coordinate, y_coordinate))

        self.create_widgets()

    def create_widgets(self):
        self.selected_files = []
        self.video_format = ""
        self.cancel_transcoding = False

        # Text bar to display selected file path
        self.file_path_var = tk.StringVar()
        file_path_entry = tk.Entry(
            self.master, textvariable=self.file_path_var, state='readonly', width=60)
        file_path_entry.grid(row=0, column=0, padx=5, pady=5, columnspan=4)

        # Browser Button on the left
        browse_button = tk.Button(
            self.master, text="Browse", command=self.browse_files, bg='#808080', fg='#FFF')
        browse_button.grid(row=1, column=0, padx=5, pady=5)

        # Options Button (Cascade Menu) on the right
        options_button = tk.Button(
            self.master, text="Options", command=self.show_options_menu, bg='#808080', fg='#FFF')
        options_button.grid(row=1, column=3, padx=5, pady=5)

        # Transcode Button
        self.transcode_button = tk.Button(
            self.master, text="Transcode", command=self.transcode_video, bg='#808080', fg='#FFF')
        self.transcode_button.grid(row=1, column=1, padx=5, pady=5)

        # Cancel Transcode Button
        self.cancel_button = tk.Button(
            self.master, text="Cancel Transcode", command=self.cancel_transcode, bg='#808080', fg='#FFF')
        self.cancel_button.grid(row=1, column=2, padx=5, pady=5)

        # Delete Original Button
        delete_button = tk.Button(self.master, text="Delete Original",
                                  command=self.delete_original, bg='#808080', fg='#FFF')
        delete_button.grid(row=1, column=4, padx=5, pady=5)

        # Progress Bar
        self.progress_bar = Progressbar(
            self.master, orient="horizontal", length=550, mode="determinate")
        self.progress_bar.grid(row=2, column=0, padx=5, pady=5, columnspan=5)

        # Space Saved Label
        self.space_saved_label = tk.Label(
            self.master, text="Space saved: 0 bytes")
        self.space_saved_label.grid(
            row=3, column=0, padx=5, pady=5, columnspan=5)

    def browse_files(self):
        self.selected_files = filedialog.askopenfilenames(
            filetypes=[("Video files", "*.mp4;*.avi;*.mov")])
        if self.selected_files:
            self.file_path_var.set(self.selected_files[0])

    def show_options_menu(self):
        # Cascade Menu for Options
        menu = tk.Menu(self.master, tearoff=0)
        video_formats = [".mp4", ".avi", ".mov"]
        for format in video_formats:
            menu.add_command(
                label=format[1:], command=lambda f=format: self.set_video_format(f))
        menu.post(self.master.winfo_pointerx(), self.master.winfo_pointery())

    def set_video_format(self, format):
        self.video_format = format

    def transcode_video(self):
        if not self.selected_files:
            messagebox.showerror(
                "Error", "Please select at least one video file.")
            return

        # Disable the "Transcode" button and enable the "Cancel Transcode" button
        self.transcode_button['state'] = 'disabled'
        self.cancel_button['state'] = 'normal'

        # Update progress bar and space saved label
        self.progress_bar["value"] = 0
        self.space_saved_label.config(text="Space saved: 0 bytes")

        def transcode_and_update_progress():
            total_files = len(self.selected_files)
            space_saved_total = 0

            for i, input_file in enumerate(self.selected_files, start=1):
                if self.cancel_transcoding:
                    # If cancel button is pressed, stop transcoding immediately
                    break

                output_file = os.path.splitext(
                    input_file)[0] + (self.video_format if self.video_format else ".avi")

                # Use libx265 codec for both video and audio
                clip = VideoFileClip(input_file)
                clip.write_videofile(
                    output_file, codec="libx265", threads=16, audio_codec="aac", fps=clip.fps)
                clip.close()

                # Calculate space saved
                original_size = os.path.getsize(input_file)
                transcoded_size = os.path.getsize(output_file)
                space_saved = original_size - transcoded_size
                space_saved_total += space_saved

                # Update progress bar
                progress_value = (i / total_files) * 100
                self.progress_bar["value"] = progress_value
                self.master.update_idletasks()

            # Update space saved label
            self.space_saved_label.config(
                text=f"Space saved: {space_saved_total} bytes")

            # Re-enable the "Transcode" button and disable the "Cancel Transcode" button
            self.transcode_button['state'] = 'normal'
            self.cancel_button['state'] = 'disabled'

        # Start transcoding in a separate thread
        thread = Thread(target=transcode_and_update_progress)
        thread.start()

    def cancel_transcode(self):
        self.cancel_transcoding = True

    def delete_original(self):
        # Implement your logic to delete the original file after transcoding
        pass


if __name__ == "__main__":
    root = tk.Tk()
    app = VideoTranscoderApp(root)
    root.mainloop()
