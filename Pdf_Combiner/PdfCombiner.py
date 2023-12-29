import PyPDF2
import tkinter as tk
from tkinter import filedialog
from tkinter import simpledialog
import os
import json

def combine_pdfs(pdf_list, output):
    pdf_writer = PyPDF2.PdfWriter()

    for pdf in pdf_list:
        pdf_reader = PyPDF2.PdfReader(pdf)
        for page_num in range(len(pdf_reader.pages)):
            page = pdf_reader.pages[page_num]
            pdf_writer.add_page(page)

    with open(output, 'wb') as out:
        pdf_writer.write(out)

def select_pdfs():
    pdfs = filedialog.askopenfilenames(filetypes=[('PDF Files', '*.pdf')])
    return pdfs

def select_output():
    initial_dir = load_last_dir()
    output_pdf = filedialog.asksaveasfilename(initialdir=initial_dir, defaultextension='.pdf', filetypes=[('PDF Files', '*.pdf')])
    save_last_dir(os.path.dirname(output_pdf))
    return output_pdf

def combine():
    pdfs = select_pdfs()
    output_pdf = select_output()
    combine_pdfs(pdfs, output_pdf)
    root.destroy()
    
def split_pdf():
    pdf_file = filedialog.askopenfilename(filetypes=[('PDF Files', '*.pdf')])
    output_dir = filedialog.askdirectory()
    pdf_reader = PyPDF2.PdfReader(pdf_file)
    for page_num in range(len(pdf_reader.pages)):
        pdf_writer = PyPDF2.PdfWriter()
        pdf_writer.add_page(pdf_reader.pages[page_num])
        output_filename = os.path.join(output_dir, f'page_{page_num + 1}.pdf')
        with open(output_filename, 'wb') as out:
            pdf_writer.write(out)

def extract_pages():
    pdf_file = filedialog.askopenfilename(filetypes=[('PDF Files', '*.pdf')])
    pages = simpledialog.askstring("Input", "Enter the page numbers to extract, separated by commas:",
                                   parent=root)
    pages = list(map(int, pages.split(',')))
    output_dir = filedialog.askdirectory()
    pdf_reader = PyPDF2.PdfReader(pdf_file)
    pdf_writer = PyPDF2.PdfWriter()
    for page_num in pages:
        pdf_writer.add_page(pdf_reader.pages[page_num - 1])
    output_filename = os.path.join(output_dir, 'extracted_pages.pdf')
    with open(output_filename, 'wb') as out:
        pdf_writer.write(out)

def load_last_dir():
    try:
        with open('last_dir.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return os.getcwd()

def save_last_dir(dir):
    script_dir = os.path.dirname(os.path.realpath(__file__))  # Get the directory of the script
    with open(os.path.join(script_dir, 'last_dir.json'), 'w') as f:  # Save last_dir.json in the script directory
        json.dump(dir, f)

root = tk.Tk()
root.geometry('300x200')  # Set window size
root.configure(bg='#007BFF')  # Set background color to blue

# Calculate position of window to be at the center of screen
window_width = 300
window_height = 380
screen_width = root.winfo_screenwidth()
screen_height = root.winfo_screenheight()
position_top = int(screen_height / 2 - window_height / 2)
position_right = int(screen_width / 2 - window_width / 2)

root.geometry(f"{window_width}x{window_height}+{position_right}+{position_top}")

button_width = 20
button_height = 2

combine_button = tk.Button(root, text="Combine PDFs", command=combine, bg='#0069D9', fg='white', font=('Helvetica', 16), width=button_width, height=button_height)
combine_button.place(relx=0.5, rely=0.3, anchor=tk.CENTER)

split_button = tk.Button(root, text="Split PDF", command=split_pdf, bg='#0069D9', fg='white', font=('Helvetica', 16), width=button_width, height=button_height)
split_button.place(relx=0.5, rely=0.5, anchor=tk.CENTER)

extract_button = tk.Button(root, text="Extract Pages", command=extract_pages, bg='#0069D9', fg='white', font=('Helvetica', 16), width=button_width, height=button_height)
extract_button.place(relx=0.5, rely=0.7, anchor=tk.CENTER)
root.mainloop()