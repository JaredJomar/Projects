# 📚 Archive.org Book Downloader

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.x](https://img.shields.io/badge/python-3.x-blue.svg)](https://www.python.org/downloads/)

A simple utility that enhances the [Archive.org-Downloader](https://github.com/MiniGlome/Archive.org-Downloader) tool by providing a convenient batch file interface for downloading books from Archive.org.

## ✨ Features

- **Simplified Download Process**: Just enter the book URL and start downloading
- **Credential Storage**: Saves your Archive.org credentials so you don't need to re-enter them
- **Customizable Image Resolution**: Preset image quality for consistent downloads
- **User-Friendly Interface**: Simple batch file execution with minimal input required

## 🔧 Prerequisites

Before using this tool, please ensure you have the following installed:

- [Git](https://git-scm.com/downloads) - For cloning the repository
- [Python 3.x](https://www.python.org/downloads/) - Required to run the downloader script
- [pip](https://pip.pypa.io/en/stable/installation/) - Python package installer for dependencies

## 📋 Installation Guide

### Step 1: Clone the Repository

```bash
git clone https://github.com/MiniGlome/Archive.org-Downloader.git
cd Archive.org-Downloader
```

### Step 2: Install Required Dependencies

```bash
pip install -r requirements.txt
```

### Step 3: Configure the Batch File

1. Copy the `ArchiveBooksDownloads.bat` file into your newly cloned `Archive.org-Downloader` folder
2. Open `ArchiveBooksDownloads.bat` in any text editor
3. Edit the following lines with your information:
   ```batch
   set "Email= -e your_email@example.com"
   set "Password= -p your_password"
   set "imageResolution= -r 3"  # Image resolution (0-10, where 0 is highest quality)
   ```
4. Save the batch file

## 🚀 How to Use

1. Navigate to the `Archive.org-Downloader` folder
2. Double-click on `ArchiveBooksDownloads.bat` to run it
3. When prompted, paste the Archive.org URL of the book you want to download
4. The download will begin automatically and save the book in the same folder

## ⚙️ Customization

- **Image Resolution**: You can modify the default image resolution in the batch file
  - Values range from 0 (highest quality) to 10 (lowest quality)
  - Default is set to 3 for a good balance of quality and file size

## 📝 Notes

- All downloads are saved within the `Archive.org-Downloader` folder
- Make sure you have sufficient disk space for larger books
- For questions or issues related to the downloader itself, please refer to the [original repository](https://github.com/MiniGlome/Archive.org-Downloader)

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](https://choosealicense.com/licenses/mit/) for details.

---

*Note: This tool is intended for downloading books that are freely available through Archive.org and should be used in accordance with their terms of service.*