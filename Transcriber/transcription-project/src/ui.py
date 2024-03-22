import tkinter as tk
from tkinter import filedialog

class UI:
    def __init__(self):
        self.root = tk.Tk()
        self.root.configure(bg='dark blue')
        self.root.title("Transcription UI")
        
        self.file_path = tk.StringVar()
        self.transcription = tk.StringVar()
        
        self.create_widgets()
        
    def create_widgets(self):
        file_label = tk.Label(self.root, text="File Path:", bg='dark blue', fg='white')
        file_label.pack()
        
        file_entry = tk.Entry(self.root, textvariable=self.file_path)
        file_entry.pack()
        
        browse_button = tk.Button(self.root, text="Browse", command=self.browse_file)
        browse_button.pack()
        
        preview_label = tk.Label(self.root, text="Preview:", bg='dark blue', fg='white')
        preview_label.pack()
        
        preview_text = tk.Text(self.root, height=10, width=50)
        preview_text.pack()
        
        transcription_label = tk.Label(self.root, text="Transcription:", bg='dark blue', fg='white')
        transcription_label.pack()
        
        transcription_text = tk.Text(self.root, height=10, width=50, textvariable=self.transcription)
        transcription_text.pack()
        
    def browse_file(self):
        file_path = filedialog.askopenfilename()
        self.file_path.set(file_path)
        
    def update_preview(self, preview):
        preview_text.delete(1.0, tk.END)
        preview_text.insert(tk.END, preview)
        
    def update_transcription(self, transcription):
        self.transcription.set(transcription)
        
    def run(self):
        self.root.mainloop()

if __name__ == "__main__":
    ui = UI()
    ui.run()