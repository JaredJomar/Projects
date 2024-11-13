# VideoDownloadToExecute: 
# pyinstaller VideoDownloadToExecute.spec 
block_cipher = None

a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('constants.py', '.'),
        ('download_thread.py', '.'),
        ('main_window.py', '.'),
        ('settings_window.py', '.'),
        ('settings.json', '.'),
        ('img.ico', '.')
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
    a.binaries,        # Added binaries
    a.zipfiles,        # Added zipfiles
    a.datas,          # Added datas
    name='VideoDownloadV3',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='img.ico'
)