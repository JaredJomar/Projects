from PyQt6 import QtWidgets, QtGui, QtCore
from PyQt6.QtWidgets import (QFileDialog, QMainWindow, QApplication, QInputDialog, 
                          QMessageBox, QVBoxLayout, QWidget, QStatusBar, QLabel)
from PyQt6.QtGui import QKeySequence, QAction, QShortcut, QColor, QFontDatabase
from PyQt6.QtCore import Qt, QSettings
from PyQt6.Qsci import (QsciScintilla, QsciLexerPython, QsciLexerSQL, 
                     QsciLexerJava, QsciLexerCPP, QsciLexerJavaScript, QsciLexerMarkdown)
import os
from pygments.lexers import get_lexer_for_filename
from pygments.util import ClassNotFound

class VSCodeColorScheme:
    """VS Code-like color schemes for different lexers"""
    
    # Common colors across languages
    BACKGROUND = QColor("#1E1E1E")
    FOREGROUND = QColor("#D4D4D4")
    COMMENT = QColor("#6A9955")
    KEYWORD = QColor("#569CD6")
    STRING = QColor("#CE9178")
    NUMBER = QColor("#B5CEA8")
    OPERATOR = QColor("#D4D4D4")
    IDENTIFIER = QColor("#9CDCFE")
    CLASS = QColor("#4EC9B0")
    FUNCTION = QColor("#DCDCAA")
    VARIABLE = QColor("#9CDCFE")
    PREPROCESSOR = QColor("#C586C0")
    REGEX = QColor("#D16969")
    
    # Markdown specific
    MD_HEADER = QColor("#569CD6")
    MD_LINK = QColor("#569CD6")
    MD_CODE = QColor("#CE9178")
    MD_LIST = QColor("#6796E6")
    MD_EMPHASIS = QColor("#C586C0")
    MD_STRONG = QColor("#569CD6")

class CodeEditor(QsciScintilla):
    def __init__(self, parent=None):
        super().__init__(parent)
        
        # Set encoding
        self.setUtf8(True)
        
        # Set dark theme colors
        self.setPaper(VSCodeColorScheme.BACKGROUND)  # Dark background
        self.setColor(VSCodeColorScheme.FOREGROUND)   # Default text
        
        # Line numbers - fix white background
        self.setMarginType(0, QsciScintilla.MarginType.NumberMargin)
        self.setMarginWidth(0, "     0000")  # Added padding with spaces
        self.setMarginsForegroundColor(QColor("#AAAAAA"))  # Light gray numbers
        self.setMarginsBackgroundColor(QColor("#1E1E1E"))  # Match editor background
        self.setMarginsFont(self.font())  # Use the same font as the editor
        
        # Folding
        self.setMarginType(1, QsciScintilla.MarginType.SymbolMargin)
        self.setMarginWidth(1, 15)
        self.setFolding(QsciScintilla.FoldStyle.BoxedTreeFoldStyle, 1)
        self.setFoldMarginColors(QColor("#1E1E1E"), QColor("#1E1E1E"))  # Match editor background
        
        # Brace matching
        self.setBraceMatching(QsciScintilla.BraceMatch.StrictBraceMatch)
        
        # Current line highlighting - making it more subtle
        self.setCaretLineVisible(True)
        self.setCaretLineBackgroundColor(QColor("#282828"))  # Slightly lighter than background
        self.setCaretForegroundColor(QColor("#FFFFFF"))  # White cursor
        
        # Selection color
        self.setSelectionBackgroundColor(QColor("#264F78"))  # Blue selection background
        self.setSelectionForegroundColor(QColor("#FFFFFF"))  # White text in selection
        
        # Indentation
        self.setIndentationsUseTabs(False)
        self.setTabWidth(4)
        self.setAutoIndent(True)
        self.setIndentationGuides(True)
        
        # Enhanced auto-completion
        self.setAutoCompletionSource(QsciScintilla.AutoCompletionSource.AcsAll)
        self.setAutoCompletionThreshold(2)  # Start showing after 2 characters
        self.setAutoCompletionCaseSensitivity(False)  # Case insensitive
        self.setAutoCompletionReplaceWord(True)  # Replace the word being typed
        self.setAutoCompletionUseSingle(QsciScintilla.AutoCompletionUseSingle.AcusAlways)  # Use single option if only one available
        
        # Set font
        font = QFontDatabase.systemFont(QFontDatabase.SystemFont.FixedFont)
        font.setPointSize(10)
        self.setFont(font)
        
        # Set zoom
        self.zoomTo(0)
        
        # Edge line at 80 characters
        self.setEdgeMode(QsciScintilla.EdgeMode.EdgeLine)
        self.setEdgeColumn(80)
        self.setEdgeColor(QColor("#333333"))
        
        # Set all visible whitespace
        self.setWhitespaceVisibility(QsciScintilla.WhitespaceVisibility.WsVisible)
        self.setWhitespaceForegroundColor(QColor("#3A3A3A"))  # Dark gray for whitespace

class NoteApp(QMainWindow):
    def __init__(self):
        super().__init__()

        # Set dark theme for the entire application
        app = QApplication.instance()
        app.setStyleSheet("""
            QMainWindow, QDialog, QFileDialog, QInputDialog, QMessageBox {
                background-color: #1E1E1E;
                color: #FFFFFF;
            }
            QMenuBar {
                background-color: #252526;
                color: #FFFFFF;
            }
            QMenuBar::item:selected {
                background-color: #323233;
            }
            QMenu {
                background-color: #252526;
                color: #FFFFFF;
                border: 1px solid #323233;
            }
            QMenu::item:selected {
                background-color: #323233;
            }
            QStatusBar {
                background-color: #252526;
                color: #FFFFFF;
            }
            QLabel {
                color: #FFFFFF;
            }
            QDialogButtonBox {
                background-color: #252526;
            }
            QDialogButtonBox QPushButton {
                background-color: #252526;
                color: #FFFFFF;
                border: 1px solid #323233;
                padding: 5px;
                min-width: 80px;
            }
            QDialogButtonBox QPushButton:hover {
                background-color: #323233;
            }
            QLineEdit {
                background-color: #252526;
                color: #FFFFFF;
                border: 1px solid #323233;
                padding: 5px;
                selection-background-color: #264F78;
                selection-color: #FFFFFF;
            }
            QPushButton {
                background-color: #252526;
                color: #FFFFFF;
                border: 1px solid #323233;
                padding: 5px;
                min-width: 80px;
            }
            QPushButton:hover {
                background-color: #323233;
            }
            QPushButton:pressed {
                background-color: #1E1E1E;
            }
            QTreeView {
                background-color: #252526;
                color: #FFFFFF;
                border: 1px solid #323233;
            }
            QTreeView::item:selected {
                background-color: #323233;
            }
            QTreeView::item:hover {
                background-color: #323233;
            }
            QComboBox {
                background-color: #252526;
                color: #FFFFFF;
                border: 1px solid #323233;
                padding: 5px;
            }
            QComboBox::drop-down {
                border: none;
                background-color: #252526;
            }
            QComboBox::down-arrow {
                background-color: #252526;
                image: none;
            }
            QComboBox QAbstractItemView {
                background-color: #252526;
                color: #FFFFFF;
                selection-background-color: #323233;
                border: 1px solid #323233;
            }
            QListView {
                background-color: #252526;
                color: #FFFFFF;
                border: 1px solid #323233;
            }
            QListView::item:selected {
                background-color: #323233;
            }
            QListView::item:hover {
                background-color: #323233;
            }
            QHeaderView::section {
                background-color: #252526;
                color: #FFFFFF;
                border: 1px solid #323233;
            }
        """)

        # Load application settings
        self.settings = QSettings("YourCompany", "NoteApp")
        self.restoreGeometry(self.settings.value("MainWindow/geometry", QtCore.QByteArray()))
        self.last_folder = self.settings.value("MainWindow/last_folder", "")
        self.current_file = None

        # Set the window title
        self.setWindowTitle("NoteApp")
        
        # Initialize the user interface
        self.setup_ui()
        self.show()
    
    def closeEvent(self, event):
        self.settings.setValue("MainWindow/geometry", self.saveGeometry())
        self.settings.setValue("MainWindow/last_folder", self.last_folder)
    
    def setup_ui(self):
        # Main layout
        main_layout = QVBoxLayout()
        
        # Text editor
        self.text_editor = CodeEditor()
        main_layout.addWidget(self.text_editor)
        
        # Status bar
        self.status_bar = QStatusBar()
        self.setStatusBar(self.status_bar)
        
        # Line and column indicator
        self.line_col_label = QLabel("Ln: 1, Col: 1")
        self.status_bar.addPermanentWidget(self.line_col_label)
        
        # File type indicator
        self.file_type_label = QLabel("Text")
        self.status_bar.addPermanentWidget(self.file_type_label)
        
        # Encoding indicator
        self.encoding_label = QLabel("UTF-8")
        self.status_bar.addPermanentWidget(self.encoding_label)
        
        # Connect cursor position change to update status bar
        self.text_editor.cursorPositionChanged.connect(self.update_line_col)

        # Setup menu bar
        self._create_menu_bar()
        
        # Setup shortcuts
        self._create_shortcuts()

        # Central widget
        central_widget = QWidget()
        central_widget.setLayout(main_layout)
        self.setCentralWidget(central_widget)
    
    def _create_menu_bar(self):
        """Create the application menu bar"""
        menu_bar = self.menuBar()
        menu_bar.setNativeMenuBar(False)
        
        # File menu
        file_menu = menu_bar.addMenu("&File")
        
        new_action = QAction("&New", self)
        new_action.setShortcut("Ctrl+N")
        new_action.triggered.connect(self.new_file)
        file_menu.addAction(new_action)
        
        open_action = QAction("&Open...", self)
        open_action.setShortcut("Ctrl+O")
        open_action.triggered.connect(self.open_file)
        file_menu.addAction(open_action)
        
        save_action = QAction("&Save", self)
        save_action.setShortcut("Ctrl+S")
        save_action.triggered.connect(self.save_file)
        file_menu.addAction(save_action)
        
        save_as_action = QAction("Save &As...", self)
        save_as_action.setShortcut("Ctrl+Shift+S")
        save_as_action.triggered.connect(self.save_file_as)
        file_menu.addAction(save_as_action)
        
        file_menu.addSeparator()
        
        exit_action = QAction("E&xit", self)
        exit_action.triggered.connect(self.close)
        file_menu.addAction(exit_action)
        
        # Edit menu
        edit_menu = menu_bar.addMenu("&Edit")
        
        undo_action = QAction("&Undo", self)
        undo_action.setShortcut("Ctrl+Z")
        undo_action.triggered.connect(self.text_editor.undo)
        edit_menu.addAction(undo_action)
        
        redo_action = QAction("&Redo", self)
        redo_action.setShortcut("Ctrl+Y")
        redo_action.triggered.connect(self.text_editor.redo)
        edit_menu.addAction(redo_action)
        
        edit_menu.addSeparator()
        
        cut_action = QAction("Cu&t", self)
        cut_action.setShortcut("Ctrl+X")
        cut_action.triggered.connect(self.text_editor.cut)
        edit_menu.addAction(cut_action)
        
        copy_action = QAction("&Copy", self)
        copy_action.setShortcut("Ctrl+C")
        copy_action.triggered.connect(self.text_editor.copy)
        edit_menu.addAction(copy_action)
        
        paste_action = QAction("&Paste", self)
        paste_action.setShortcut("Ctrl+V")
        paste_action.triggered.connect(self.text_editor.paste)
        edit_menu.addAction(paste_action)
        
        edit_menu.addSeparator()
        
        select_all_action = QAction("Select &All", self)
        select_all_action.setShortcut("Ctrl+A")
        select_all_action.triggered.connect(self.text_editor.selectAll)
        edit_menu.addAction(select_all_action)
        
        # Search menu
        search_menu = menu_bar.addMenu("&Search")
        
        find_action = QAction("&Find...", self)
        find_action.setShortcut("Ctrl+F")
        find_action.triggered.connect(self.find_text)
        search_menu.addAction(find_action)
        
        # View menu
        view_menu = menu_bar.addMenu("&View")
        
        zoom_in_action = QAction("Zoom &In", self)
        zoom_in_action.setShortcut("Ctrl++")
        zoom_in_action.triggered.connect(lambda: self.text_editor.zoomIn(1))
        view_menu.addAction(zoom_in_action)
        
        zoom_out_action = QAction("Zoom &Out", self)
        zoom_out_action.setShortcut("Ctrl+-")
        zoom_out_action.triggered.connect(lambda: self.text_editor.zoomOut(1))
        view_menu.addAction(zoom_out_action)
        
        reset_zoom_action = QAction("&Reset Zoom", self)
        reset_zoom_action.setShortcut("Ctrl+0")
        reset_zoom_action.triggered.connect(lambda: self.text_editor.zoomTo(0))
        view_menu.addAction(reset_zoom_action)

        view_menu.addSeparator()
        
        highlight_line_action = QAction("&Highlight Current Line", self)
        highlight_line_action.setCheckable(True)
        highlight_line_action.setChecked(True)
        highlight_line_action.triggered.connect(self.toggle_line_highlight)
        view_menu.addAction(highlight_line_action)
    
    def toggle_line_highlight(self):
        """Toggle the current line highlighting on/off"""
        is_visible = self.text_editor.caretLineVisible()
        self.text_editor.setCaretLineVisible(not is_visible)

    def _create_shortcuts(self):
        """Create keyboard shortcuts"""
        # Most shortcuts are now handled by menu actions
        pass

    def new_file(self):
        """Create a new file"""
        self.text_editor.clear()
        self.current_file = None
        self.setWindowTitle("NoteApp - [New]")
        self.file_type_label.setText("Text")
    
    def update_line_col(self):
        """Update the line and column indicators in the status bar"""
        line, col = self.text_editor.getCursorPosition()
        self.line_col_label.setText(f"Ln: {line + 1}, Col: {col + 1}")

    def detect_language(self, file_path):
        """Detect the programming language based on file extension and set appropriate lexer"""
        try:
            file_extension = os.path.splitext(file_path)[1].lower()
            
            # Choose lexer based on file extension
            if file_extension in ['.py', '.pyw']:
                self._apply_python_lexer()
                self.file_type_label.setText("Python")
            elif file_extension in ['.sql', '.sqlite']:
                self._apply_sql_lexer()
                self.file_type_label.setText("SQL")
            elif file_extension in ['.java']:
                self._apply_java_lexer()
                self.file_type_label.setText("Java")
            elif file_extension in ['.cpp', '.hpp', '.cc', '.hh', '.c', '.h']:
                self._apply_cpp_lexer()
                self.file_type_label.setText("C/C++")
            elif file_extension in ['.js', '.jsx', '.ts', '.tsx']:
                self._apply_javascript_lexer()
                self.file_type_label.setText("JavaScript")
            elif file_extension in ['.md', '.markdown']:
                self._apply_markdown_lexer()
                self.file_type_label.setText("Markdown")
            else:
                # Text file or unknown extension
                self.text_editor.setLexer(None)
                # Re-apply dark theme for editor when no lexer is used
                self.text_editor.setPaper(VSCodeColorScheme.BACKGROUND)
                self.text_editor.setColor(VSCodeColorScheme.FOREGROUND)
                self.text_editor.setMarginsForegroundColor(QColor("#AAAAAA"))  # Light gray numbers
                self.text_editor.setMarginsBackgroundColor(QColor("#1E1E1E"))  # Dark background for margin
                self.file_type_label.setText("Text")
                return
                
            # Try to use Pygments to detect the language
            try:
                lexer = get_lexer_for_filename(file_path)
                # Set a default lexer based on the detected language
                lexer_name = lexer.name.lower()
                if 'python' in lexer_name:
                    self._apply_python_lexer()
                elif 'sql' in lexer_name:
                    self._apply_sql_lexer()
                elif 'java' in lexer_name and 'javascript' not in lexer_name:
                    self._apply_java_lexer()
                elif 'c++' in lexer_name or 'c' == lexer_name:
                    self._apply_cpp_lexer()
                elif 'javascript' in lexer_name or 'typescript' in lexer_name:
                    self._apply_javascript_lexer()
                elif 'markdown' in lexer_name:
                    self._apply_markdown_lexer()
                else:
                    self.text_editor.setLexer(None)
                
                self.file_type_label.setText(lexer.name)
            except ClassNotFound:
                self.text_editor.setLexer(None)
                self.file_type_label.setText("Text")
        except Exception as e:
            self.text_editor.setLexer(None)
            self.file_type_label.setText("Text")
            print(f"Error setting lexer: {e}")
    
    def _apply_python_lexer(self):
        """Apply Python syntax highlighting"""
        lexer = QsciLexerPython(self.text_editor)
        lexer.setDefaultPaper(VSCodeColorScheme.BACKGROUND)
        lexer.setDefaultColor(VSCodeColorScheme.FOREGROUND)
        
        # Set colors for different elements
        lexer.setColor(VSCodeColorScheme.COMMENT, QsciLexerPython.Comment)
        lexer.setColor(VSCodeColorScheme.COMMENT, QsciLexerPython.CommentBlock)
        lexer.setColor(VSCodeColorScheme.KEYWORD, QsciLexerPython.Keyword)
        lexer.setColor(VSCodeColorScheme.STRING, QsciLexerPython.SingleQuotedString)
        lexer.setColor(VSCodeColorScheme.STRING, QsciLexerPython.DoubleQuotedString)
        lexer.setColor(VSCodeColorScheme.STRING, QsciLexerPython.TripleSingleQuotedString)
        lexer.setColor(VSCodeColorScheme.STRING, QsciLexerPython.TripleDoubleQuotedString)
        lexer.setColor(VSCodeColorScheme.NUMBER, QsciLexerPython.Number)
        lexer.setColor(VSCodeColorScheme.OPERATOR, QsciLexerPython.Operator)
        lexer.setColor(VSCodeColorScheme.IDENTIFIER, QsciLexerPython.Identifier)
        lexer.setColor(VSCodeColorScheme.CLASS, QsciLexerPython.ClassName)
        lexer.setColor(VSCodeColorScheme.FUNCTION, QsciLexerPython.FunctionMethodName)
        lexer.setColor(VSCodeColorScheme.PREPROCESSOR, QsciLexerPython.Decorator)
                
        # Set all paper (background) colors to match editor
        for style in range(0, 128):
            lexer.setPaper(VSCodeColorScheme.BACKGROUND, style)
            
        self.text_editor.setLexer(lexer)
        
        # Re-apply margin settings after setting the lexer
        self.text_editor.setMarginsForegroundColor(QColor("#AAAAAA"))  # Light gray numbers
        self.text_editor.setMarginsBackgroundColor(QColor("#1E1E1E"))  # Match editor background
    
    def _apply_sql_lexer(self):
        """Apply SQL syntax highlighting"""
        lexer = QsciLexerSQL(self.text_editor)
        lexer.setDefaultPaper(VSCodeColorScheme.BACKGROUND)
        lexer.setDefaultColor(VSCodeColorScheme.FOREGROUND)
        
        # Set colors for different elements
        lexer.setColor(VSCodeColorScheme.COMMENT, QsciLexerSQL.Comment)
        lexer.setColor(VSCodeColorScheme.COMMENT, QsciLexerSQL.CommentLine)
        lexer.setColor(VSCodeColorScheme.COMMENT, QsciLexerSQL.CommentDoc)
        lexer.setColor(VSCodeColorScheme.KEYWORD, QsciLexerSQL.Keyword)
        lexer.setColor(VSCodeColorScheme.STRING, QsciLexerSQL.SingleQuotedString)
        lexer.setColor(VSCodeColorScheme.STRING, QsciLexerSQL.DoubleQuotedString)
        lexer.setColor(VSCodeColorScheme.NUMBER, QsciLexerSQL.Number)
        lexer.setColor(VSCodeColorScheme.OPERATOR, QsciLexerSQL.Operator)
        lexer.setColor(VSCodeColorScheme.IDENTIFIER, QsciLexerSQL.Identifier)
                
        # Set all paper (background) colors to match editor
        for style in range(0, 128):
            lexer.setPaper(VSCodeColorScheme.BACKGROUND, style)
            
        self.text_editor.setLexer(lexer)
        
        # Re-apply margin settings after setting the lexer
        self.text_editor.setMarginsForegroundColor(QColor("#AAAAAA"))  # Light gray numbers
        self.text_editor.setMarginsBackgroundColor(QColor("#1E1E1E"))  # Match editor background
    
    def _apply_java_lexer(self):
        """Apply Java syntax highlighting"""
        lexer = QsciLexerJava(self.text_editor)
        lexer.setDefaultPaper(VSCodeColorScheme.BACKGROUND)
        lexer.setDefaultColor(VSCodeColorScheme.FOREGROUND)
        
        # Set colors for different elements
        lexer.setColor(VSCodeColorScheme.COMMENT, QsciLexerJava.Comment)
        lexer.setColor(VSCodeColorScheme.COMMENT, QsciLexerJava.CommentLine)
        lexer.setColor(VSCodeColorScheme.COMMENT, QsciLexerJava.CommentDoc)
        lexer.setColor(VSCodeColorScheme.KEYWORD, QsciLexerJava.Keyword)
        lexer.setColor(VSCodeColorScheme.STRING, QsciLexerJava.SingleQuotedString)
        lexer.setColor(VSCodeColorScheme.STRING, QsciLexerJava.DoubleQuotedString)
        lexer.setColor(VSCodeColorScheme.NUMBER, QsciLexerJava.Number)
        lexer.setColor(VSCodeColorScheme.OPERATOR, QsciLexerJava.Operator)
        lexer.setColor(VSCodeColorScheme.PREPROCESSOR, QsciLexerJava.PreProcessor)
                
        # Set all paper (background) colors to match editor
        for style in range(0, 128):
            lexer.setPaper(VSCodeColorScheme.BACKGROUND, style)
            
        self.text_editor.setLexer(lexer)
        
        # Re-apply margin settings after setting the lexer
        self.text_editor.setMarginsForegroundColor(QColor("#AAAAAA"))  # Light gray numbers
        self.text_editor.setMarginsBackgroundColor(QColor("#1E1E1E"))  # Match editor background
    
    def _apply_cpp_lexer(self):
        """Apply C/C++ syntax highlighting"""
        lexer = QsciLexerCPP(self.text_editor)
        lexer.setDefaultPaper(VSCodeColorScheme.BACKGROUND)
        lexer.setDefaultColor(VSCodeColorScheme.FOREGROUND)
        
        # Set colors for different elements
        lexer.setColor(VSCodeColorScheme.COMMENT, QsciLexerCPP.Comment)
        lexer.setColor(VSCodeColorScheme.COMMENT, QsciLexerCPP.CommentLine)
        lexer.setColor(VSCodeColorScheme.COMMENT, QsciLexerCPP.CommentDoc)
        lexer.setColor(VSCodeColorScheme.KEYWORD, QsciLexerCPP.Keyword)
        lexer.setColor(VSCodeColorScheme.STRING, QsciLexerCPP.SingleQuotedString)
        lexer.setColor(VSCodeColorScheme.STRING, QsciLexerCPP.DoubleQuotedString)
        lexer.setColor(VSCodeColorScheme.STRING, QsciLexerCPP.RawString)
        lexer.setColor(VSCodeColorScheme.NUMBER, QsciLexerCPP.Number)
        lexer.setColor(VSCodeColorScheme.OPERATOR, QsciLexerCPP.Operator)
        lexer.setColor(VSCodeColorScheme.IDENTIFIER, QsciLexerCPP.Identifier)
        lexer.setColor(VSCodeColorScheme.PREPROCESSOR, QsciLexerCPP.PreProcessor)
                
        # Set all paper (background) colors to match editor
        for style in range(0, 128):
            lexer.setPaper(VSCodeColorScheme.BACKGROUND, style)
            
        self.text_editor.setLexer(lexer)
        
        # Re-apply margin settings after setting the lexer
        self.text_editor.setMarginsForegroundColor(QColor("#AAAAAA"))  # Light gray numbers
        self.text_editor.setMarginsBackgroundColor(QColor("#1E1E1E"))  # Match editor background
    
    def _apply_javascript_lexer(self):
        """Apply JavaScript syntax highlighting"""
        lexer = QsciLexerJavaScript(self.text_editor)
        lexer.setDefaultPaper(VSCodeColorScheme.BACKGROUND)
        lexer.setDefaultColor(VSCodeColorScheme.FOREGROUND)
        
        # Set colors for different elements
        lexer.setColor(VSCodeColorScheme.COMMENT, QsciLexerJavaScript.Comment)
        lexer.setColor(VSCodeColorScheme.COMMENT, QsciLexerJavaScript.CommentLine)
        lexer.setColor(VSCodeColorScheme.COMMENT, QsciLexerJavaScript.CommentDoc)
        lexer.setColor(VSCodeColorScheme.KEYWORD, QsciLexerJavaScript.Keyword)
        lexer.setColor(VSCodeColorScheme.STRING, QsciLexerJavaScript.SingleQuotedString)
        lexer.setColor(VSCodeColorScheme.STRING, QsciLexerJavaScript.DoubleQuotedString)
        lexer.setColor(VSCodeColorScheme.NUMBER, QsciLexerJavaScript.Number)
        lexer.setColor(VSCodeColorScheme.OPERATOR, QsciLexerJavaScript.Operator)
        lexer.setColor(VSCodeColorScheme.IDENTIFIER, QsciLexerJavaScript.Identifier)
        lexer.setColor(VSCodeColorScheme.REGEX, QsciLexerJavaScript.RegEx)
                
        # Set all paper (background) colors to match editor
        for style in range(0, 128):
            lexer.setPaper(VSCodeColorScheme.BACKGROUND, style)
            
        self.text_editor.setLexer(lexer)
        
        # Re-apply margin settings after setting the lexer
        self.text_editor.setMarginsForegroundColor(QColor("#AAAAAA"))  # Light gray numbers
        self.text_editor.setMarginsBackgroundColor(QColor("#1E1E1E"))  # Match editor background
    
    def _apply_markdown_lexer(self):
        """Apply Markdown syntax highlighting"""
        lexer = QsciLexerMarkdown(self.text_editor)
        lexer.setDefaultPaper(VSCodeColorScheme.BACKGROUND)
        lexer.setDefaultColor(VSCodeColorScheme.FOREGROUND)
        
        # Set colors for different Markdown elements
        lexer.setColor(VSCodeColorScheme.MD_HEADER, QsciLexerMarkdown.Header1)
        lexer.setColor(VSCodeColorScheme.MD_HEADER, QsciLexerMarkdown.Header2)
        lexer.setColor(VSCodeColorScheme.MD_HEADER, QsciLexerMarkdown.Header3)
        lexer.setColor(VSCodeColorScheme.MD_HEADER, QsciLexerMarkdown.Header4)
        lexer.setColor(VSCodeColorScheme.MD_HEADER, QsciLexerMarkdown.Header5)
        lexer.setColor(VSCodeColorScheme.MD_HEADER, QsciLexerMarkdown.Header6)
        
        # Styles for code and links
        try:
            lexer.setColor(VSCodeColorScheme.MD_CODE, QsciLexerMarkdown.CodeBlock)
            lexer.setColor(VSCodeColorScheme.MD_CODE, QsciLexerMarkdown.CodeBackticks)
            lexer.setColor(VSCodeColorScheme.MD_LINK, QsciLexerMarkdown.Link)
        except AttributeError:
            # Some QScintilla versions might have different attribute names
            pass
                
        # Set all paper (background) colors to match editor
        for style in range(0, 128):
            lexer.setPaper(VSCodeColorScheme.BACKGROUND, style)
            
        self.text_editor.setLexer(lexer)
        
        # Re-apply margin settings after setting the lexer to preserve dark theme for Markdown
        self.text_editor.setMarginsForegroundColor(QColor("#AAAAAA"))  # Light gray numbers
        self.text_editor.setMarginsBackgroundColor(QColor("#1E1E1E"))  # Match editor background

    def open_file(self):
        dialog = QFileDialog(self)
        dialog.setOption(QFileDialog.Option.DontUseNativeDialog)  # Use Qt's dialog instead of system dialog
        file_path, _ = dialog.getOpenFileName(self, "Open File", self.last_folder)
        if file_path:
            self.last_folder = QtCore.QFileInfo(file_path).path()
            self.current_file = file_path
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    file_text = f.read()
                self.text_editor.setText(file_text)
                self.setWindowTitle(f"NoteApp - {file_path}")
                self.detect_language(file_path)
            except Exception as e:
                QMessageBox.critical(self, "Error", f"Failed to open file: {str(e)}")

    def save_file_as(self):
        dialog = QFileDialog(self)
        dialog.setOption(QFileDialog.Option.DontUseNativeDialog)  # Use Qt's dialog instead of system dialog
        file_path, _ = dialog.getSaveFileName(self, "Save File As", self.last_folder)
        if file_path:
            self.last_folder = QtCore.QFileInfo(file_path).path()
            self.current_file = file_path
            self._save_to_file(file_path)
            self.detect_language(file_path)
    
    def save_file(self):
        if self.current_file:
            self._save_to_file(self.current_file)
        else:
            self.save_file_as()
    
    def _save_to_file(self, file_path):
        """Helper method to save content to a file"""
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(self.text_editor.text())
            self.setWindowTitle(f"NoteApp - {file_path}")
        except Exception as e:
            QMessageBox.critical(self, "Error", f"Failed to save file: {str(e)}")
    
    def find_text(self):
        dialog = QInputDialog(self)
        dialog.setStyleSheet("""
            QInputDialog {
                background-color: #1E1E1E;
            }
            QLabel {
                color: #FFFFFF;
            }
            QLineEdit {
                background-color: #252526;
                color: #FFFFFF;
                border: 1px solid #323233;
                padding: 5px;
            }
        """)
        dialog.setWindowTitle("Find Text")
        dialog.setLabelText("Enter the text to find:")
        dialog.setTextValue("")
        
        ok = dialog.exec()
        search_text = dialog.textValue()
        
        if ok and search_text:
            # Search forward from the current position
            self.text_editor.findFirst(
                search_text,
                False,  # Regular expression
                True,   # Case sensitive
                True,   # Whole word
                True,   # Wrap around
                True,   # Forward
                -1, -1  # From current position
            )


if __name__ == "__main__":
    app = QApplication([])
    window = NoteApp()
    app.exec()  # In PyQt6, exec() is used instead of exec_()