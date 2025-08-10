import os
import shutil
import subprocess
import glob
from PyQt5.QtCore import QSettings
from typing import Optional, Dict, Any

def find_executable(executable_name: str) -> Optional[str]:
    """Search for an executable in common installation directories."""
    # First check if it's in PATH
    path = shutil.which(executable_name)
    if path:
        return path
        
    # Try using the where command (Windows specific)
    try:
        output = subprocess.check_output(["where", executable_name], universal_newlines=True)
        paths = output.strip().split("\n")
        if paths:
            return paths[0]
    except subprocess.CalledProcessError:
        pass
        
    # Common WinGet installation paths for popular tools
    if executable_name == 'ffmpeg':
        possible_paths = [
            # WinGet installation paths
            os.path.join(os.environ.get('LOCALAPPDATA', ''), 
                         'Microsoft', 'WinGet', 'Packages', 
                         'Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe', 
                         'ffmpeg.exe'),
            # Check in Program Files
            os.path.join(os.environ.get('PROGRAMFILES', ''), 
                         'ffmpeg', 'bin', 'ffmpeg.exe'),
            # Also check for FFmpeg in temp path
            os.path.join(os.environ.get('TEMP', ''), 
                         'ffmpeg', 'bin', 'ffmpeg.exe')
        ]
    elif executable_name == 'yt-dlp':
        possible_paths = [
            # WinGet installation paths
            os.path.join(os.environ.get('LOCALAPPDATA', ''), 
                         'Microsoft', 'WinGet', 'Packages', 
                         'yt-dlp.yt-dlp_Microsoft.Winget.Source_8wekyb3d8bbwe', 
                         'yt-dlp.exe'),
            # Check in Program Files
            os.path.join(os.environ.get('PROGRAMFILES', ''), 
                         'yt-dlp', 'yt-dlp.exe'),
            # Check in user directory
            os.path.join(os.environ.get('USERPROFILE', ''), 
                         'AppData', 'Local', 'yt-dlp', 'yt-dlp.exe')
        ]
    else:
        return None
        
    # Check all possible paths
    for path in possible_paths:
        if os.path.exists(path):
            return path
            
    # Try to search in common directories using glob
    for pattern in [
        f"{os.environ.get('LOCALAPPDATA', '')}/**/*/bin/{executable_name}.exe",
        f"{os.environ.get('PROGRAMFILES', '')}/**/{executable_name}.exe",
        f"{os.environ.get('PROGRAMFILES(X86)', '')}/**/{executable_name}.exe",
        f"{os.environ.get('USERPROFILE', '')}/AppData/Local/**/{executable_name}.exe"
    ]:
        try:
            matches = glob.glob(pattern, recursive=True)
            if matches:
                return matches[0]
        except Exception:
            pass
            
    return None

def check_and_update_path(executable: str, input_field=None, settings: Optional[QSettings]=None, settings_key: Optional[str]=None, status_label=None) -> bool:
    """
    Check and update path for a dependency.
    Returns True if the dependency is found and path is updated.
    
    Args:
        executable (str): Name of the executable to check for
        input_field (QLineEdit, optional): Input field to update with path if found
        settings (QSettings, optional): Settings object to save path to
        settings_key (str, optional): Key to use when saving to settings
        status_label (QLabel, optional): Label to update with installation status
    """
    path = shutil.which(executable)
    installed = bool(path)
    
    # Update input field and settings if all required parameters are provided
    if installed and input_field and settings and settings_key:
        if not input_field.text():
            input_field.setText(path)
            settings.setValue(settings_key, path)
        
    # Update status label if provided
    if status_label:
        if installed:
            status_label.setText("✅ Installed")
            status_label.setStyleSheet("color: #00ff00;")  # Green color
        else:
            status_label.setText("❌ Not Installed")
            status_label.setStyleSheet("color: #ff0000;")  # Red color
            
    return installed

def browse_for_executable(parent, line_edit, title: str):
    """Generic function to browse for an executable file."""
    file = parent.QFileDialog.getOpenFileName(parent, f"Select {title}")
    if file[0]:
        line_edit.setText(file[0])

def save_app_settings(settings: QSettings, data: Dict[str, Any]):
    """Save application settings."""
    for key, value in data.items():
        settings.setValue(key, value)

def load_app_settings(settings: QSettings) -> Dict[str, Any]:
    """Load application settings."""
    result = {
        "download_folder": settings.value("download_folder", ""),
        "ffmpeg_path": settings.value("ffmpeg_path", ""),
        "yt_dlp_path": settings.value("yt_dlp_path", ""),
        "browser_cookies": settings.value("browser_cookies", "None"),
        "window_size": settings.value("window_size", None),
        "window_position": settings.value("window_position", None)
    }
    return {k: v for k, v in result.items() if v is not None}
