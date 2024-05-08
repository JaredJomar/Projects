import os
import json
from PyQt6.QtWidgets import QApplication, QMainWindow, QPushButton, QFileDialog, QVBoxLayout, QWidget, QLineEdit
from PyQt6.QtCore import Qt
import PyPDF2


def load_last_dir():
    try:
        with open('last_dir.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return os.getcwd()


def save_last_dir(dir):
    with open('last_dir.json', 'w') as f:
        json.dump(dir, f)


def combine_pdfs(pdf_list, output):
    try:
        pdf_writer = PyPDF2.PdfWriter()
        for pdf in pdf_list:
            pdf_reader = PyPDF2.PdfReader(pdf)
            for page_num in range(len(pdf_reader.pages)):
                page = pdf_reader.pages[page_num]
                pdf_writer.add_page(page)
        with open(output, 'wb') as out:
            pdf_writer.write(out)
        print("PDFs combined successfully.")
    except Exception as e:
        print("Error combining PDFs:", str(e))


def extrack_pages(pdf_file, pages, output_dir):
    try:
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        pdf_writer = PyPDF2.PdfWriter()
        for page_num in pages:
            pdf_writer.add_page(pdf_reader.pages[page_num - 1])
        output_filename = os.path.join(output_dir, 'extracted_pages.pdf')
        with open(output_filename, 'wb') as out:
            pdf_writer.write(out)
        print("Pages extracted successfully.")
    except Exception as e:
        print("Error extracting pages:", str(e))


def merge_range(pdf_file, start, end, output_dir):
    try:
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        pdf_writer = PyPDF2.PdfWriter()
        for page_num in range(start, end + 1):
            pdf_writer.add_page(pdf_reader.pages[page_num - 1])
        output_filename = os.path.join(output_dir, 'merged_range.pdf')
        with open(output_filename, 'wb') as out:
            pdf_writer.write(out)
        print("Pages merged successfully.")
    except Exception as e:
        print("Error merging pages:", str(e))


def split_pdf(pdf_file, output_dir):
    try:
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        for page_num in range(len(pdf_reader.pages)):
            pdf_writer = PyPDF2.PdfWriter()
            pdf_writer.add_page(pdf_reader.pages[page_num])
            output_filename = os.path.join(
                output_dir, f'page_{page_num + 1}.pdf')
            with open(output_filename, 'wb') as out:
                pdf_writer.write(out)
        print("PDF split successfully.")
    except Exception as e:
        print("Error splitting PDF:", str(e))


def rotate_pdf(pdf_file, output_dir, rotation):
    try:
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        pdf_writer = PyPDF2.PdfWriter()
        for page_num in range(len(pdf_reader.pages)):
            page = pdf_reader.pages[page_num]
            page.rotate_clockwise(rotation)
            pdf_writer.add_page(page)
        output_filename = os.path.join(output_dir, 'rotated.pdf')
        with open(output_filename, 'wb') as out:
            pdf_writer.write(out)
        print("PDF rotated successfully.")
    except Exception as e:
        print("Error rotating PDF:", str(e))


def compress_pdf(pdf_file, output_dir):
    try:
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        pdf_writer = PyPDF2.PdfWriter()
        for page_num in range(len(pdf_reader.pages)):
            page = pdf_reader.pages[page_num]
            page.compress_content()
            pdf_writer.add_page(page)
        output_filename = os.path.join(output_dir, 'compressed.pdf')
        with open(output_filename, 'wb') as out:
            pdf_writer.write(out)
        print("PDF compressed successfully.")
    except Exception as e:
        print("Error compressing PDF:", str(e))


def convert_pdf(pdf_file, output_dir, output_format):
    try:
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        pdf_writer = PyPDF2.PdfWriter()
        for page_num in range(len(pdf_reader.pages)):
            page = pdf_reader.pages[page_num]
            pdf_writer.add_page(page)
        if output_format == 'word':
            output_filename = os.path.join(output_dir, 'converted.docx')
        elif output_format == 'excel':
            output_filename = os.path.join(output_dir, 'converted.xlsx')
        elif output_format == 'powerpoint':
            output_filename = os.path.join(output_dir, 'converted.pptx')
        elif output_format == 'text':
            output_filename = os.path.join(output_dir, 'converted.txt')
        else:
            print("Invalid output format.")
            return
        with open(output_filename, 'wb') as out:
            pdf_writer.write(out)
        print("PDF converted successfully.")
    except Exception as e:
        print("Error converting PDF:", str(e))


def preview_all_pages_pdf(pdf_file):
    try:
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        for page_num in range(len(pdf_reader.pages)):
            page = pdf_reader.pages[page_num]
            print(page.extract_text())
    except Exception as e:
        print("Error previewing PDF:", str(e))


def load_last_dir():
    try:
        with open('last_dir.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return os.getcwd()


def save_last_dir(dir):
    with open('last_dir.json', 'w') as f:
        json.dump(dir, f)


def drop_pdf_files(event, pdf_files):
    if event.mimeData().hasUrls():
        event.setDropAction(Qt.DropAction.ActionCopyAction)
        event.accept()
        for url in event.mimeData().urls():
            pdf_files.append(url.toLocalFile())
    else:
        event.ignore()


def drop_position(event):
    if event.mimeData().hasUrls():
        event.setDropAction(Qt.DropAction.ActionCopyAction)
        event.accept()
        position = event.pos()
    else:
        event.ignore()


def drop_leave(event):
    event.accept()


def batch_process(pdf_files, output_dir, process_func):
    for pdf_file in pdf_files:
        process_func(pdf_file, output_dir)


def batch_process_with_args(pdf_files, output_dir, process_func, *args):
    for pdf_file in pdf_files:
        process_func(pdf_file, output_dir, *args)


def batch_process_with_args_and_output(pdf_files, output_dir, process_func, *args):
    for pdf_file in pdf_files:
        process_func(pdf_file, output_dir, *args)


def main():
    app = QApplication([])
    window = QMainWindow()
    window.setWindowTitle("PDF Toolkit")
    window.setGeometry(100, 100, 500, 500)
    # Set background color to blue
    window.setStyleSheet("background-color: #007BFF;")

    window_layout = QVBoxLayout()
    window_layout.setSpacing(10)
    main_widget = QWidget()

    pdf_files = []
    output_dir = load_last_dir()

    def browse_pdf_files():
        pdf_files.clear()
        file_dialog = QFileDialog()
        file_dialog.setFileMode(QFileDialog.FileMode.ExistingFiles)
        file_dialog.setNameFilter("PDF Files (*.pdf)")
        if file_dialog.exec():
            pdf_files.extend(file_dialog.selectedFiles())

    def browse_output_dir():
        global output_dir
        output_dir = QFileDialog.getExistingDirectory()
        save_last_dir(output_dir)

    def combine():
        output = os.path.join(output_dir, 'combined.pdf')
        combine_pdfs(pdf_files, output)
    # Extract not working

    def extract():
        pages = [int(page)
                 for page in pages_line_edit.text().split(',') if page]
        extrack_pages(pdf_files[0], pages, output_dir)

    def merge():
        start = int(start_line_edit.text())
        end = int(end_line_edit.text())
        merge_range(pdf_files[0], start, end, output_dir)

    def split():
        split_pdf(pdf_files[0], output_dir)
    # Rotate not working

    def rotate():
        rotation = int(rotation_line_edit.text())
        rotate_pdf(pdf_files[0], output_dir, rotation)

    # Create widgets and layouts
    combine_button = QPushButton("Combine PDFs")
    combine_button.setStyleSheet(
        "background-color: #0069D9; color: white; font: 16pt 'Helvetica';")  # Set button properties
    combine_button.clicked.connect(combine)

    extract_button = QPushButton("Extract Pages")
    extract_button.setStyleSheet(
        "background-color: #0069D9; color: white; font: 16pt 'Helvetica';")  # Set button properties
    extract_button.clicked.connect(extract)

    pages_line_edit = QLineEdit()

    merge_button = QPushButton("Merge Pages")
    merge_button.setStyleSheet(
        "background-color: #0069D9; color: white; font: 16pt 'Helvetica';")  # Set button properties
    merge_button.clicked.connect(merge)

    start_line_edit = QLineEdit()
    end_line_edit = QLineEdit()

    split_button = QPushButton("Split PDF")
    split_button.setStyleSheet(
        "background-color: #0069D9; color: white; font: 16pt 'Helvetica';")  # Set button properties
    split_button.clicked.connect(split)

    rotate_button = QPushButton("Rotate PDF")
    rotate_button.setStyleSheet(
        "background-color: #0069D9; color: white; font: 16pt 'Helvetica';")  # Set button properties
    rotate_button.clicked.connect(rotate)

    rotation_line_edit = QLineEdit()

    pdf_files_button = QPushButton("Browse PDF Files")
    pdf_files_button.setStyleSheet(
        "background-color: #0069D9; color: white; font: 16pt 'Helvetica';")  # Set button properties
    pdf_files_button.clicked.connect(browse_pdf_files)

    output_dir_button = QPushButton("Browse Output Directory")
    output_dir_button.setStyleSheet(
        "background-color: #0069D9; color: white; font: 16pt 'Helvetica';")  # Set button properties
    output_dir_button.clicked.connect(browse_output_dir)

    window_layout.addWidget(combine_button)
    window_layout.addWidget(extract_button)
    window_layout.addWidget(merge_button)
    window_layout.addWidget(split_button)
    window_layout.addWidget(rotate_button)
    window_layout.addWidget(pdf_files_button)
    window_layout.addWidget(output_dir_button)

    main_widget.setLayout(window_layout)
    window.setCentralWidget(main_widget)
    window.show()
    app.exec()


if __name__ == '__main__':
    main()
