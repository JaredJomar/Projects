# PDF Tool

This program is a simple PDF utility tool that provides functionality to combine multiple PDF files into one, split a PDF file into individual pages, and extract specific pages from a PDF file. The tool is built using Python and the Tkinter library for the graphical user interface.

## Features

1. **Combine PDFs:**
   - Click the "Combine PDFs" button to select multiple PDF files.
   - Choose the output location and filename for the combined PDF.
   - The tool will merge the selected PDFs into a single PDF file.

2. **Split PDF:**
   - Click the "Split PDF" button to choose a PDF file for splitting.
   - Select a directory where individual pages will be saved as separate PDF files.
   - The tool will create a PDF file for each page of the original PDF.

3. **Extract Pages:**
   - Click the "Extract Pages" button to select a PDF file.
   - Enter page numbers (comma-separated) to extract specific pages.
   - Choose a directory to save the extracted pages as a new PDF file.

## Usage

1. **Combine PDFs:**
   - Run the program.
   - Click "Combine PDFs" and select multiple PDF files.
   - Choose an output location and filename for the combined PDF.
   - Click "Save" to complete the process.

2. **Split PDF:**
   - Run the program.
   - Click "Split PDF" and select a PDF file.
   - Choose a directory to save individual pages as separate PDF files.
   - Click "Save" to complete the process.

3. **Extract Pages:**
   - Run the program.
   - Click "Extract Pages" and select a PDF file.
   - Enter page numbers to extract (comma-separated).
   - Choose a directory to save the extracted pages as a new PDF file.
   - Click "Save" to complete the process.

## Additional Information

- The program remembers the last used directory for file operations.
- The GUI is designed with a simple and intuitive layout.
- The window is positioned at the center of the screen for convenience.

## Requirements

- Python 3.x
- PyPDF2 library
- Tkinter library

## Installation

1. Install Python: [Python Official Website](https://www.python.org/downloads/)
2. Install required libraries:
   ```bash
   pip install -r requirements.txt

## License

[MIT](https://choosealicense.com/licenses/mit/)