import os
import sys
import glob
from pathlib import Path

block_cipher = None

# Use Windows-style path for icon
icon_path = 'icons\\app_icon.ico'

extra_binaries = []

# Collect DLLs that the Python DLL depends on. For conda environments many
# runtime DLLs live under <env>\DLLs and <env>\Library\bin (VC runtime,
# OpenSSL, etc). Bundle any .dlls we find there to avoid LoadLibrary errors
# when the bundled python DLL is extracted at runtime.
env_dirs = [
    os.path.join(sys.base_prefix, 'DLLs'),
    os.path.join(sys.base_prefix, 'Library', 'bin'),
    sys.base_prefix,
]

for d in env_dirs:
    if not os.path.isdir(d):
        continue
    for dll in glob.glob(os.path.join(d, '*.dll')):
        try:
            # (source, destfolder)
            extra_binaries.append((dll, '.'))
        except Exception:
            # non-fatal: skip files we can't access
            pass

# Fallback: ensure the Python DLL itself is present and added explicitly
python_dll_name = f'python{sys.version_info.major}{sys.version_info.minor}.dll'
python_dll = os.path.join(sys.base_prefix, python_dll_name)
if os.path.exists(python_dll):
    extra_binaries.append((python_dll, '.'))
a = Analysis(
    ['PdfCombiner.py'],
    pathex=[],
    binaries=extra_binaries,
    datas=[
        ('last_dir.json', '.'),
        ('icons', 'icons'),
        ('pdf_combiner', 'pdf_combiner'),
    ],
    hiddenimports=[
        'PyQt6',
        'PyPDF2',
        'fitz',  # PyMuPDF
        'pdf2docx',
        'tabula',
        'jpype',  # Required for tabula
        'pptx',
        'pdfplumber',
        'pandas',
        # Ensure XML parser binary is bundled
        'pyexpat',
        'xml.parsers.expat',
        # SSL CA bundle support for API calls
        'certifi',
        # Ensure stdlib ssl and its extension are collected
        'ssl',
        '_ssl',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'scipy',
        'matplotlib',
        'PIL',
        'tkinter',
        'pytest',
        'pygments',
        'jinja2',
        'numba',
        'llvmlite',
        'cv2',
        'lxml',
        'pytz',
        'dateutil',
        'fsspec',
        'pkg_resources',
        'setuptools',
        'wheel',
        'platformdirs',
        'backports',
        'jaraco',
        'more_itertools',
        'importlib_metadata',
        'zipp',
        'importlib_resources',
        'jaraco.context',
        'backports.tarfile',
        'pycparser',
        'psutil',
        'charset_normalizer',
        'lz4',
        'xml.etree.cElementTree',
        'PIL.ImageFilter',
        'PIL.SpiderImagePlugin',
        'xml.dom.domreg',
        'pdfminer',
        'cryptography',
        'pypdfium2',
        'pypdfium2_raw',
        'docx',
        'pptx',
        'urllib3',
        'lxml.isoschematron',
        'lxml.objectify',
        'numpy',
        'pandas.plotting',
        'pandas.io.formats.style',
        'pandas.io.clipboard',
        'sqlite3',
        'multiprocessing.util',
        'difflib',
        'sysconfig',
        'platform',
        'typing_extensions',
        'xml',
        '_ctypes',
        'heapq',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    [],
    [],
    name='PdfCombiner',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=icon_path,
    onefile=False,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    name='PdfCombiner',
)