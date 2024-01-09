import tkinter as tk
from tkinter.filedialog import askopenfilename, asksaveasfilename
from tkinter.tix import WINDOW

# Create the functions for opening folders
def open_folder(window, text_editor):
    filepath = askopenfilename(
        filetypes=[("Text Files", "*.txt"), ("All Files", "*.*")]
    )
    if not filepath:
        return
    text_editor.delete("1.0", tk.END)
    with open(filepath, "r") as input_file:
        text = input_file.read()
        text_editor.insert(tk.END, text)
    window.title(f"NoteApp - {filepath}")
    
# Create the functions for opening files 
def open_file(window, text_editor):
    filepath = askopenfilename(
        filetypes=[("Text Files", "*.txt"), ("All Files", "*.*")]
    )
    if not filepath:
        return
    text_editor.delete("1.0", tk.END)
    with open(filepath, "r") as input_file:
        text = input_file.read()
        text_editor.insert(tk.END, text)
    window.title(f"NoteApp - {filepath}")
    
# Create the functions for saving files
def save_file(text_editor):
    filepath = asksaveasfilename(
        defaultextension="txt",
        filetypes=[("Text Files", "*.txt"), ("All Files", "*.*")]
    )
    if not filepath:
        return
    with open(filepath, "w") as output_file:
        text = text_editor.get("1.0", tk.END)
        output_file.write(text)
    WINDOW.title(f"Save File: {filepath}")
    
# Create the functions for saving files as
def save_file_as(text_editor):
    filepath = asksaveasfilename(
        defaultextension="txt",
        filetypes=[("Text Files", "*.txt"), ("All Files", "*.*")]
    )
    if not filepath:
        return
    with open(filepath, "w") as output_file:
        text = text_editor.get("1.0", tk.END)
        output_file.write(text)
    WINDOW.title(f"Save File: {filepath}")  

# Create the main function
def main():
    window = tk.Tk()
    window.title("NoteApp")
    
    # Configure the rows and columns of the window
    window.rowconfigure(0, minsize=400)
    window.columnconfigure(1, minsize=500)
    
    # Create the widgets for the window
    text_editor = tk.Text(window)
    text_editor.grid(row=0, column=1)
    
    # Create the frame for the buttons
    frame = tk.Frame(window, relief=tk.RAISED, bd=2)
    
    # Create the menu buttons
    file_button = tk.Menubutton(frame, text="File")
    #edit_button = tk.Menubutton(frame, text="Edit")
    search_button = tk.Menubutton(frame, text="Search")
    settings_button = tk.Menubutton(frame, text="Settings")
    
    # Add the menu buttons to the frame
    file_button.grid(row=0, column=0, sticky="ew", padx=5, pady=5)
    #edit_button.grid(row=1, column=0, sticky="ew", padx=5, pady=5)
    search_button.grid(row=2, column=0, sticky="ew", padx=5, pady=5)
    settings_button.grid(row=5, column=0, sticky="ew", padx=5, pady=5)
    
    # Cascade Menu for the File Button
    file_cascade = tk.Menu(file_button)
    file_cascade.add_command(label="New")
    file_cascade.add_command(label="Open Folder")
    file_cascade.add_command(label="Open File")
    file_cascade.add_command(label="Save")
    file_cascade.add_command(label="Save As")
    file_cascade.add_command(label="Exit")
    file_button.config(menu=file_cascade)
    
    # Add functionality to the File Menu Buttons 
    file_cascade.entryconfig("New", command=lambda: text_editor.delete("1.0", tk.END))
    file_cascade.entryconfig("Open Folder", command=lambda: open_folder(window, text_editor))
    file_cascade.entryconfig("Open File", command=lambda: open_file(window, text_editor))
    file_cascade.entryconfig("Save", command=lambda: save_file(text_editor))
    file_cascade.entryconfig("Save As", command=lambda: save_file_as(text_editor))
    file_cascade.entryconfig("Exit", command=window.destroy)
    
    # Cascade Menu for the Edit Button
    #edit_cascade = tk.Menu(edit_button)
    #edit_cascade.add_command(label="Undo")
    #edit_cascade.add_command(label="Redo")
    #edit_cascade.add_command(label="Cut")
    #edit_cascade.add_command(label="Copy")
    #edit_cascade.add_command(label="Paste")
    #edit_cascade.add_command(label="Delete")
    #edit_cascade.add_command(label="Select All")
    #edit_button.config(menu=edit_cascade)

    # Cascade Menu for the Search Button
    search_cascade = tk.Menu(search_button)
    search_cascade.add_command(label="Find")
    search_cascade.add_command(label="Find Next")
    search_cascade.add_command(label="Find Previous")
    search_cascade.add_command(label="Replace")
    search_cascade.add_command(label="Go To")
    search_button.config(menu=search_cascade)
    
    # Cascade Menu and add to the Settings Button
    settings_cascade = tk.Menu(settings_button)
    settings_cascade.add_command(label="Font")
    settings_cascade.add_command(label="Color")
    settings_button.config(menu=settings_cascade)

    # Add the frame to the window
    frame.grid(row=0, column=0, sticky="ns")
    
    # Add the key bindings to the window 
    window.bind("<Control-s>", lambda event: save_file(text_editor))
    window.bind("<Control-o>", lambda event: open_file(window, text_editor))
    window.bind("<Control-z>", lambda event: text_editor.edit_undo())
    window.bind("<Control-y>", lambda event: text_editor.edit_redo())
    window.bind("<Control-c>", lambda event: text_editor.edit_copy())
    window.bind("<Control-v>", lambda event: text_editor.edit_paste())
    window.bind("<Control-a>", lambda event: text_editor.edit_select_all())
    window.bind("<Control-f>", lambda event: text_editor.edit_find())
    window.bind("<Control-g>", lambda event: text_editor.edit_find_next())
    window.bind("<Control-h>", lambda event: text_editor.edit_find_previous())
    window.bind("<Control-x>", lambda event: text_editor.edit_cut())
    
    
    window.mainloop()

main()