import tkinter as tk
from tkinter import filedialog

def browse_file():
    root = tk.Tk()
    root.withdraw()
    file_path = filedialog.askopenfilename()
    return file_path

def format_transcription(transcription):
    # Apply formatting rules to the transcription
    # ...

    return formatted_transcription