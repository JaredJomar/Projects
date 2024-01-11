# Note App

Simple note-taking application using PyQt5.

## Features

1. **Text Editing:**
   - The application provides a text editor for creating and editing notes.

2. **File Operations:**
   - Open Folder: Allows the user to select a folder.
   - Open File: Opens a file and displays its content in the text editor.
   - Save: Saves the current content to a file.
   - Save As: Saves the current content to a new file.

3. **Keyboard Shortcuts:**
   - Ctrl+Z: Undo.
   - Ctrl+X: Cut.
   - Ctrl+C: Copy.
   - Ctrl+V: Paste.
   - Ctrl+Y: Redo.
   - Ctrl+A: Select All.
   - Ctrl+F: Find Text.
   - Ctrl+S: Save File.
   - Ctrl+O: Open File.

## Usage

1. **Open Folder:**
   - Click on the "File" menu.
   - Choose "Open Folder."
   - Select the desired folder.

2. **Open File:**
   - Click on the "File" menu.
   - Choose "Open File."
   - Select the file to open.

3. **Save:**
   - Click on the "File" menu.
   - Choose "Save" to save the current content to the last accessed folder.

4. **Save As:**
   - Click on the "File" menu.
   - Choose "Save As" to save the current content to a new file.

5. **Keyboard Shortcuts:**
   - Utilize various keyboard shortcuts for text editing and file operations.

6. **Find Text:**
   - Click on the "Edit" menu.
   - Choose "Find Text" to search for specific text in the document.

## Additional Information

- This application uses PyQt5 for the graphical user interface.
- The settings, including window size and last accessed folder, are persisted between sessions.

## Requirements

- Python 3
- PyQt5

## Installation

1. Clone the repository.
2. Install the required dependencies: `pip install PyQt5`
3. Run the application: `python note_app.py`

## License

[MIT](https://choosealicense.com/licenses/mit/)