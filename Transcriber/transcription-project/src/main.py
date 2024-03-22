from ui import UI
from transcriber import Transcriber

if __name__ == "__main__":
    # Initialize the UI
    ui = UI()

    # Initialize the transcriber
    transcriber = Transcriber()

    # Start the transcription process
    ui.start_transcription(transcriber)