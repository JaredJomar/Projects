# Transcription Project

This project is designed to transcribe video or audio files using Hugging Face and format the transcription according to specific rules. It provides a user interface (UI) built with Tinker that allows users to select a file using a file explorer, preview the transcription in real-time, and display the transcription in a designated box.

## Project Structure

The project has the following structure:

```
transcription-project
├── src
│   ├── main.py
│   ├── transcriber.py
│   ├── ui.py
│   └── utils.py
├── tests
│   └── test_transcriber.py
├── .gitignore
├── requirements.txt
└── README.md
```

## File Descriptions

- `src/main.py`: This file serves as the entry point of the program. It initializes the UI and starts the transcription process.
- `src/transcriber.py`: This file contains the logic for transcribing video or audio files using Hugging Face. It exports a class `Transcriber` with methods for loading the model, transcribing the file, and formatting the transcription.
- `src/ui.py`: This file contains the code for the Tinker UI. It exports a class `UI` with methods for creating the UI elements, handling file selection, displaying real-time preview, and updating the transcription box.
- `src/utils.py`: This file contains utility functions used by the transcriber and UI modules. It exports functions for file browsing and formatting the transcription.
- `tests/test_transcriber.py`: This file contains unit tests for the transcriber module.
- `.gitignore`: This file specifies the files and directories to be ignored by Git version control.
- `requirements.txt`: This file lists the Python dependencies required for the project.
- `README.md`: This file contains the documentation for the project.

## Usage

To use this project, follow these steps:

1. Install the required dependencies listed in `requirements.txt`.
2. Run the `main.py` script located in the `src` directory.
3. Use the file explorer in the UI to select the video or audio file you want to transcribe.
4. The real-time preview of the transcription will be displayed in the UI.
5. The formatted transcription will be shown in the designated box below.
6. Customize the UI color to dark blue with white letters for a visually appealing experience.

Please note that this project relies on Hugging Face for transcription and follows specific formatting rules. Make sure to review the code and adjust it according to your specific requirements.

This project is licensed under the [MIT License](LICENSE).