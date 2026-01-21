from PyQt5 import QtWidgets, QtGui, QtCore
from PyQt5.QtWidgets import QFileDialog, QMainWindow, QAction, QApplication, QShortcut, QInputDialog, QMessageBox, QVBoxLayout, QTextEdit, QWidget
from PyQt5.QtGui import QKeySequence
from PyQt5.QtCore import Qt, QSettings

class NoteApp(QMainWindow):
    # Initialize the application
    def __init__(self):
        super().__init__()

        # Load application settings
        self.settings = QSettings("YourCompany", "YourApp")
        # Restore the window size and position from the last session
        self.restoreGeometry(self.settings.value("MainWindow/geometry", type=QtCore.QByteArray))
        # Get the last accessed folder from the settings
        self.last_folder = self.settings.value("MainWindow/last_folder", type=str)

        # Set the window title
        self.setWindowTitle("Note App")
        
        # Initialize the user interface
        self.setup_ui()

        # Display the main window
        self.show()
    
    # This method is called when the window is about to close
    def closeEvent(self, event):
        # Save the current window size and position to the settings
        self.settings.setValue("MainWindow/geometry", self.saveGeometry())
        # Save the last accessed folder to the settings
        self.settings.setValue("MainWindow/last_folder", self.last_folder)
    
    # This method sets up the user interface of the application
    def setup_ui(self):
        # Create a QVBoxLayout which will serve as the main layout
        main_layout = QVBoxLayout()
        
        # Instantiate QTextEdit and add it to the main layout. This will serve as the text editor
        self.text_editor = QTextEdit()
        main_layout.addWidget(self.text_editor)

        # Create a menu bar and disable the native menu bar
        menu_bar = self.menuBar()
        menu_bar.setNativeMenuBar(False)
        
        # Add a "File" menu to the menu bar
        file_menu = menu_bar.addMenu("File")

        # Create an "Open Folder" action, connect it to the open_folder method, and add it to the "File" menu
        open_folder_action = QAction("Open Folder", self)
        open_folder_action.triggered.connect(self.open_folder)
        file_menu.addAction(open_folder_action)

        # Create an "Open File" action, connect it to the open_file method, and add it to the "File" menu
        open_file_action = QAction("Open File", self)
        open_file_action.triggered.connect(self.open_file)
        file_menu.addAction(open_file_action)

        # Create a "Save" action, connect it to the save_file method, and add it to the "File" menu
        save_action = QAction("Save", self)
        save_action.triggered.connect(self.save_file)
        file_menu.addAction(save_action)

        # Create a "Save As" action, connect it to the save_file_as method, and add it to the "File" menu
        save_as_action = QAction("Save As", self)
        save_as_action.triggered.connect(self.save_file_as)
        file_menu.addAction(save_as_action)
        
        # End the cascade File menu
        
        # Create keyboard shortcuts for various actions in the text editor
        QShortcut(QKeySequence("Ctrl+Z"), self, self.text_editor.undo)  # Undo
        QShortcut(QKeySequence("Ctrl+X"), self, self.text_editor.cut)  # Cut
        QShortcut(QKeySequence("Ctrl+C"), self, self.text_editor.copy)  # Copy
        QShortcut(QKeySequence("Ctrl+V"), self, self.text_editor.paste)  # Paste
        QShortcut(QKeySequence("Ctrl+Y"), self, self.text_editor.redo)  # Redo
        QShortcut(QKeySequence("Ctrl+A"), self, self.text_editor.selectAll)  # Select All
        QShortcut(QKeySequence("Ctrl+F"), self, self.find_text)  # Find Text
        QShortcut(QKeySequence("Ctrl+S"), self, self.save_file)  # Save File
        QShortcut(QKeySequence("Ctrl+O"), self, self.open_file)  # Open File

        # Create a central widget, set the main layout to it, and set it as the central widget of the main window
        central_widget = QWidget()
        central_widget.setLayout(main_layout)
        self.setCentralWidget(central_widget)

    # This method opens a directory selection dialog for the user to select a folder.
    # If a folder is selected, it updates the `last_folder` attribute to the selected folder.
    def open_folder(self):
        folder_path = QFileDialog.getExistingDirectory(self, "Select Folder", self.last_folder)
        if folder_path:
            self.last_folder = folder_path

    # This method opens a file dialog for the user to select a file to open.
    # If a file is selected, it updates the `last_folder` attribute to the directory of the selected file,
    # reads the content of the file, and sets the text of the text editor to the read content.
    def open_file(self):
        file_path, _ = QFileDialog.getOpenFileName(self, "Open File", self.last_folder)
        if file_path:
            self.last_folder = QtCore.QFileInfo(file_path).path()
            with open(file_path, 'r') as f:
                file_text = f.read()
            self.text_editor.setText(file_text)
    
    # This method opens a file dialog for the user to select a location to save the file.
    # If a location is selected, it saves the content of the text editor to the selected file.
    # It also updates the `last_folder` attribute to the directory of the saved file.
    def save_file(self):
        file_path, _ = QFileDialog.getSaveFileName(self, "Save File", self.last_folder)
        if file_path:
            self.last_folder = QtCore.QFileInfo(file_path).path()
            with open(file_path, 'w') as f:
                f.write(self.text_editor.toPlainText())

    # This method opens a file dialog for the user to select a new location to save the current file.
    # If a location is selected, it saves the content of the text editor to the new file.
    # It also updates the `last_folder` attribute to the directory of the newly saved file.
    def save_file_as(self):
        file_path, _ = QFileDialog.getSaveFileName(self, "Save File As", self.last_folder)
        if file_path:
            self.last_folder = QtCore.QFileInfo(file_path).path()
            with open(file_path, 'w') as f:
                f.write(self.text_editor.toPlainText())
    
    # This method opens a dialog for the user to enter a text to find in the text editor.
    # If the user enters a text, it finds all occurrences of the entered text in the text editor.
    # If no occurrence is found, it shows an information message box saying "Text not found."
    # If occurrences are found, it prompts the user to select an occurrence from a list of the positions of the occurrences.
    # If the user selects an occurrence, it sets the cursor to the selected occurrence, focuses the text editor, and ensures the cursor is visible.
    def find_text(self):
        search_text, ok = QInputDialog.getText(self, "Find Text", "Enter the text to find:")
        if ok:
            cursor = self.text_editor.document().find(search_text)
            if cursor.isNull():
                QMessageBox.information(self, "Find Text", "Text not found.")
            else:
                # Create a list to store all occurrences of the search text
                occurrences = []
                while not cursor.isNull():
                    occurrences.append(cursor)
                    cursor = self.text_editor.document().find(search_text, cursor)

                # Prompt the user to select an occurrence from the list
                selected_occurrence, ok = QInputDialog.getItem(self, "Select Occurrence", "Select an occurrence:", [str(occurrence.position()) for occurrence in occurrences], editable=False)
                if ok:
                    # Find the selected occurrence and set the cursor to it
                    for occurrence in occurrences:
                        if str(occurrence.position()) == selected_occurrence:
                            self.text_editor.setTextCursor(occurrence)
                            self.text_editor.setFocus()
                            self.text_editor.ensureCursorVisible()
                            break

if __name__ == "__main__":
    app = QApplication([])
    window = NoteApp()
    app.exec_()              
                