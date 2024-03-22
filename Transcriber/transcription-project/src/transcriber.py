import tkinter as tk
from tkinter import filedialog
from transformers import pipeline

class Transcriber:
    def __init__(self):
        self.model = pipeline("automatic-speech-recognition")

    def transcribe_file(self, file_path):
        transcription = self.model(file_path)[0]['transcription']
        formatted_transcription = self.format_transcription(transcription)
        return formatted_transcription

    def format_transcription(self, transcription):
        # Add your formatting rules here
        formatted_transcription = transcription.upper()
        return formatted_transcription

if __name__ == "__main__":
    # Example usage
    transcriber = Transcriber()
    file_path = "path/to/your/file"
    transcription = transcriber.transcribe_file(file_path)
    print(transcription)