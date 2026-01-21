import os
import shutil
import subprocess
import glob
from PyQt5.QtCore import QSettings
from PyQt5.QtWidgets import QFileDialog


def get_subprocess_no_window_kwargs() -> dict:
    """Return subprocess kwargs to suppress console windows on Windows."""
    if os.name == 'nt':
        try:
            si = subprocess.STARTUPINFO()
            si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
        except Exception:
            si = None
        flags = 0
        try:
            flags |= subprocess.CREATE_NO_WINDOW
        except Exception:
            pass
        kw = {}
        if si is not None:
            kw["startupinfo"] = si
        if flags:
            kw["creationflags"] = flags
        return kw
    return {}
from typing import Optional, Dict, Any

def find_executable(executable_name: str) -> Optional[str]:
    """Search for an executable quickly without deep recursive scans.

    Strategy:
    - Prefer PATH / where.exe
    - Probe known WinGet/package install roots with narrow, shallow globs
    - Avoid scanning entire Program Files or LocalAppData recursively
    """
    # First check if it's in PATH
    path = shutil.which(executable_name)
    if path:
        return path
        
    # Try using the where command (Windows specific)
    try:
        # Capture stderr as well to avoid 'where' printing INFO messages to the parent console
        output = subprocess.check_output(["where", executable_name], stderr=subprocess.STDOUT, text=True, **get_subprocess_no_window_kwargs())
        paths = [p for p in output.strip().splitlines() if p]
        if paths:
            return paths[0]
    except subprocess.CalledProcessError:
        pass

    # Check WindowsApps and WinGet Links shim locations directly
    if os.name == 'nt':
        local = os.environ.get('LOCALAPPDATA', '')
        user = os.environ.get('USERPROFILE', '')
        for base in filter(None, [local, os.path.join(user, 'AppData', 'Local')]):
            for rel in [
                os.path.join('Microsoft', 'WindowsApps', f"{executable_name}.exe"),
                os.path.join('Microsoft', 'WinGet', 'Links', f"{executable_name}.exe"),
            ]:
                p = os.path.join(base, rel)
                if os.path.exists(p):
                    return p
        
    # Common WinGet installation paths for popular tools (narrow check set)
    if executable_name == 'ffmpeg':
        local = os.environ.get('LOCALAPPDATA', '')
        pf = os.environ.get('PROGRAMFILES', '')
        temp = os.environ.get('TEMP', '')

        winget_base = os.path.join(local, 'Microsoft', 'WinGet', 'Packages',
                                   'Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe')
        # Known layouts (keep shallow)
        shallow_checks = [
            os.path.join(pf, 'ffmpeg', 'bin', 'ffmpeg.exe'),
            os.path.join(temp, 'ffmpeg', 'bin', 'ffmpeg.exe'),
        ]
        for p in shallow_checks:
            if p and os.path.exists(p):
                return p

        # Try a shallow glob only inside the WinGet package directory
        try:
            matches = glob.glob(os.path.join(winget_base, 'ffmpeg-*', 'bin', 'ffmpeg.exe'))
            if matches:
                return matches[0]
        except Exception:
            pass
    elif executable_name == 'yt-dlp':
        local = os.environ.get('LOCALAPPDATA', '')
        pf = os.environ.get('PROGRAMFILES', '')
        user = os.environ.get('USERPROFILE', '')

        candidates = [
            os.path.join(local, 'Microsoft', 'WinGet', 'Packages',
                         'yt-dlp.yt-dlp_Microsoft.Winget.Source_8wekyb3d8bbwe', 'yt-dlp.exe'),
            os.path.join(pf, 'yt-dlp', 'yt-dlp.exe'),
            os.path.join(user, 'AppData', 'Local', 'yt-dlp', 'yt-dlp.exe'),
            # Common pip locations (limit to shallow globs under Python Scripts)
            *glob.glob(os.path.join(user, 'AppData', 'Roaming', 'Python', 'Python*', 'Scripts', 'yt-dlp.exe')),
            *glob.glob(os.path.join(local, 'Programs', 'Python', 'Python*', 'Scripts', 'yt-dlp.exe')),
            # WindowsApps shim
            os.path.join(local, 'Microsoft', 'WindowsApps', 'yt-dlp.exe'),
            # WinGet Links shim
            os.path.join(local, 'Microsoft', 'WinGet', 'Links', 'yt-dlp.exe'),
            # Scoop / Chocolatey shims
            os.path.join(user, 'scoop', 'shims', 'yt-dlp.exe'),
            os.path.join(os.environ.get('ProgramData', ''), 'chocolatey', 'bin', 'yt-dlp.exe'),
        ]
        for p in candidates:
            if p and os.path.exists(p):
                return p
    elif executable_name in ('aria2', 'aria2c'):
        # Common install locations for aria2/aria2c
        exe = 'aria2c.exe'
        local = os.environ.get('LOCALAPPDATA', '')
        pf = os.environ.get('PROGRAMFILES', '')
        for p in [
            os.path.join(local, 'Microsoft', 'WinGet', 'Packages', 'aria2.aria2_Microsoft.Winget.Source_8wekyb3d8bbwe', exe),
            os.path.join(pf, 'aria2', exe),
            os.path.join(pf, 'aria2c', exe),
            # WinGet Links shim
            os.path.join(local, 'Microsoft', 'WinGet', 'Links', exe),
            # WindowsApps shim
            os.path.join(local, 'Microsoft', 'WindowsApps', exe),
            os.path.join(os.environ.get('ProgramData', ''), 'chocolatey', 'bin', 'aria2c.exe'),
            os.path.join(os.environ.get('USERPROFILE', ''), 'scoop', 'shims', 'aria2c.exe'),
        ]:
            if p and os.path.exists(p):
                return p
    else:
        return None
    # As a last resort, do nothing more (avoid deep recursive scans)
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
    # Use the more robust finder (checks PATH, common install dirs, and WinGet links)
    path = find_executable(executable)
    installed = bool(path)
    # Fallback: respect a manually provided path if it exists
    if not installed and input_field is not None:
        current = input_field.text() if hasattr(input_field, 'text') else ''
        if current and os.path.exists(current):
            path = current
            installed = True
    
    # Update input field and settings if all required parameters are provided
    if installed and input_field and settings and settings_key:
        # Update if empty or currently points to a non-existent file
        current = input_field.text()
        if not current or not os.path.exists(current):
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
    """Open a file dialog to select an executable and update the given line edit."""
    file_path, _ = QFileDialog.getOpenFileName(parent, f"Select {title}")
    if file_path:
        line_edit.setText(file_path)

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
        "youtube_api_key": settings.value("youtube_api_key", ""),
        "window_size": settings.value("window_size", None),
        "window_position": settings.value("window_position", None)
    }
    return {k: v for k, v in result.items() if v is not None}


__all__ = [
    'find_executable',
    'check_and_update_path',
    'browse_for_executable',
    'save_app_settings',
    'load_app_settings',
    'get_subprocess_no_window_kwargs',
]

def find_with_winget(package_id: str, exe_name: str) -> Optional[str]:
    """Best-effort resolution of an executable path for a WinGet-managed package.

    This avoids package-specific hardcoding by inspecting standard WinGet artifacts:
    - %LOCALAPPDATA%\Microsoft\WinGet\Links\<exe>
    - %LOCALAPPDATA%\Microsoft\WindowsApps\<exe>
    - %LOCALAPPDATA%\Microsoft\WinGet\Packages\<id>_*\**\<exe> (shallow search)

    Returns the first existing path or None.
    """
    # If it's already discoverable normally, return that
    found = find_executable(exe_name)
    if found:
        return found

    if os.name != 'nt':
        return None

    local = os.environ.get('LOCALAPPDATA', '')
    user = os.environ.get('USERPROFILE', '')

    # Check WinGet Links shims
    links_dir = os.path.join(local, 'Microsoft', 'WinGet', 'Links')
    candidates = [
        os.path.join(links_dir, f"{exe_name}.exe"),
        os.path.join(local, 'Microsoft', 'WindowsApps', f"{exe_name}.exe"),
    ]
    for p in candidates:
        if p and os.path.exists(p):
            return p

    # Shallow scan inside the package folder (avoid deep recursive search)
    try:
        pkg_root = os.path.join(local, 'Microsoft', 'WinGet', 'Packages')
        matches = []
        # a few common shallow patterns
        patterns = [
            os.path.join(pkg_root, f"{package_id}_*", exe_name + '.exe'),
            os.path.join(pkg_root, f"{package_id}_*", 'bin', exe_name + '.exe'),
            os.path.join(pkg_root, f"{package_id}_*", '*', 'bin', exe_name + '.exe'),
            os.path.join(pkg_root, f"{package_id}_*", '*', exe_name + '.exe'),
        ]
        for pat in patterns:
            matches.extend(glob.glob(pat))
        if matches:
            return matches[0]
    except Exception:
        pass

    return None
