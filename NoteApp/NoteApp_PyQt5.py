from PyQt5 import QtWidgets, QtGui, QtCore
from PyQt5.QtWidgets import QFileDialog, QMainWindow, QAction, QApplication, QShortcut, QInputDialog, QMessageBox, QVBoxLayout, QTextEdit, QWidget
from PyQt5.QtGui import QKeySequence
from PyQt5.QtCore import Qt, QSettings


class NoteApp(QMainWindow):
    def __init__(self):
        super().__init__()

        # Load settings
        self.settings = QSettings("YourCompany", "YourApp")
        self.restoreGeometry(self.settings.value("MainWindow/geometry", type=QtCore.QByteArray))
        self.last_folder = self.settings.value("MainWindow/last_folder", type=str)

        self.setWindowTitle("Note App")

        self.setup_ui()

        self.show()

    def closeEvent(self, event):
        # Save settings when window is closed
        self.settings.setValue("MainWindow/geometry", self.saveGeometry())
        self.settings.setValue("MainWindow/last_folder", self.last_folder)

    def setup_ui(self):
        # Create the main layout
        main_layout = QVBoxLayout()

        # Create the text editor
        self.text_editor = QTextEdit()
        main_layout.addWidget(self.text_editor)

        # Create the menu bar
        menu_bar = self.menuBar()
        menu_bar.setNativeMenuBar(False)

        # Create the "File" menu
        file_menu = menu_bar.addMenu("File")

        # Create the "Open Folder" action
        open_folder_action = QAction("Open Folder", self)
        open_folder_action.triggered.connect(self.open_folder)
        file_menu.addAction(open_folder_action)

        # Create the "Open File" action
        open_file_action = QAction("Open File", self)
        open_file_action.triggered.connect(self.open_file)
        file_menu.addAction(open_file_action)

        # Create the "Save" action
        save_action = QAction("Save", self)
        save_action.triggered.connect(self.save_file)
        file_menu.addAction(save_action)

        # Create the "Save As" action
        save_as_action = QAction("Save As", self)
        save_as_action.triggered.connect(self.save_file_as)
        file_menu.addAction(save_as_action)

        # Create shortcuts
        QShortcut(QKeySequence("Ctrl+Z"), self, self.text_editor.undo)
        QShortcut(QKeySequence("Ctrl+X"), self, self.text_editor.cut)
        QShortcut(QKeySequence("Ctrl+C"), self, self.text_editor.copy)
        QShortcut(QKeySequence("Ctrl+V"), self, self.text_editor.paste)
        QShortcut(QKeySequence("Ctrl+Y"), self, self.text_editor.redo)
        QShortcut(QKeySequence("Ctrl+A"), self, self.text_editor.selectAll)
        QShortcut(QKeySequence("Ctrl+F"), self, self.find_text)
        QShortcut(QKeySequence("Ctrl+S"), self, self.save_file)
        QShortcut(QKeySequence("Ctrl+O"), self, self.open_file)

        # Create a central widget and set the layout
        central_widget = QWidget()
        central_widget.setLayout(main_layout)
        self.setCentralWidget(central_widget)

    def open_folder(self):
        folder_path = QFileDialog.getExistingDirectory(self, "Select Folder", self.last_folder)
        if folder_path:
            self.last_folder = folder_path
            # Implement your logic here
            pass

    def open_file(self):
        file_path, _ = QFileDialog.getOpenFileName(self, "Open File", self.last_folder)
        if file_path:
            self.last_folder = QtCore.QFileInfo(file_path).path()
            with open(file_path, 'r') as f:
                file_text = f.read()
            self.text_editor.setText(file_text)

    def save_file(self):
        file_path, _ = QFileDialog.getSaveFileName(self, "Save File", self.last_folder)
        if file_path:
            self.last_folder = QtCore.QFileInfo(file_path).path()
            with open(file_path, 'w') as f:
                f.write(self.text_editor.toPlainText())

    def save_file_as(self):
        file_path, _ = QFileDialog.getSaveFileName(self, "Save File As", self.last_folder)
        if file_path:
            self.last_folder = QtCore.QFileInfo(file_path).path()
            with open(file_path, 'w') as f:
                f.write(self.text_editor.toPlainText())

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
