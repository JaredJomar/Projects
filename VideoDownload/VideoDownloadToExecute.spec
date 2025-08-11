import os
import sys
from pathlib import Path

block_cipher = None

# Use Windows-style path for icon
icon_path = 'icons\\app_icon.ico'

a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('settings.json', '.'),
        ('icons', 'icons'),
        ('img', 'img'),
        ('src/constants.py', 'src'),
        ('src/download_thread.py', 'src'),
        ('src/helpers.py', 'src'),
        ('src/main_window.py', 'src'),
        ('src/settings_window.py', 'src'),
        ('src/__init__.py', 'src'),
    ],
    hiddenimports=['PyQt5', 'yt_dlp'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    name='VideoDownload',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=icon_path,
)