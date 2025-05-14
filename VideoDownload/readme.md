# 📥 Video Download App

<img src="icons/app_icon.ico" width="64" height="64" alt="Video Download App Icon" align="right">

A PyQt5-based application for downloading videos, audio, and live streams from various platforms using yt-dlp, FFmpeg, and aria2c.

<details>
<summary>🖼️ Application Screenshots</summary>

<div align="center">
  <img src="img/main.png" width="800" alt="Main Window Interface">
  <p><em>Main Application Window</em></p>
  
  <img src="img/settings.png" width="800" alt="Settings Panel">
  <p><em>Settings and Package Management</em></p>
</div>
</details>

## ✨ Features

1. **📼 Multiple Download Types:**
   - 🎥 Video only
   - 🎵 Audio only (MP3 format)
   - 🎞️ Video with audio
   - 🔴 Live stream recording

2. **⚙️ Advanced Options:**
   - 📊 Custom video resolutions (240p to 1080p)
   - 📝 Custom title naming
   - 📋 Batch downloads from text files
   - 📈 Progress tracking with detailed logs
   - ⏹️ Download cancellation support

3. **🔧 Integration with:**
   - 🚀 yt-dlp for video downloading
   - 🎞️ FFmpeg for media processing
   - ⚡ aria2c for accelerated downloads

## 📥 Installation

### 💿 Method 1: Using the Executable
1. ⬇️ Download the latest [VideoDownload.exe](https://github.com/JaredJomar/Projects/raw/main/VideoDownload/VideoDownload.exe)
2. 🏃 Run the application
3. ⚙️ Go to the Settings tab
4. 🔧 Use the installation buttons to install required dependencies:
   - Install FFmpeg
   - Install yt-dlp
   - Install aria2c

### 💻 Method 2: From Source
1. Clone the repository
2. Install Python requirements:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the application and install dependencies through the Settings tab

## ⚙️ Configuration

1. Open the Settings tab
2. Install required packages using the provided buttons
3. Verify installation status (green checkmarks)
4. Paths will be automatically configured after installation

## 📚 Usage

### 🔰 Basic Download
1. Paste video URL
2. (Optional) Set custom title
3. Choose download path
4. Select download type
5. Pick resolution
6. Click Download

### 📋 Batch Download
1. Create a text file with URLs (one per line)
2. Click Browse next to URL field
3. Select your text file
4. Configure other options
5. Click Download

### 🔴 Live Stream Recording
1. Paste live stream URL
2. App automatically detects live streams
3. Recording starts immediately
4. Use Cancel to stop recording

### 🍪 Browser Cookies for Age-Restricted Videos
1. In the Settings tab, select your browser under "Use Browser Cookies"
2. The app will read (but never save) cookies from your selected browser
3. For age-restricted videos, the app automatically retries with cookies if needed
4. Only the browser selection is saved, not the actual cookies

> **Note:** Cookies are only used when required for authentication or age-restricted content

## ❗ Troubleshooting

1. **📦 Dependencies Not Found:**
   - Check Settings tab for installation status
   - Verify paths are correct
   - Try reinstalling using the provided buttons

2. **❌ Download Fails:**
   - Check internet connection
   - Verify URL is valid
   - Look for errors in progress log

3. **📁 Path Issues:**
   - Use Browse buttons to set correct paths
   - Ensure write permissions in download folder

## 📄 License

[MIT](https://choosealicense.com/licenses/mit/)

## 👏 Credits

- 🚀 [yt-dlp](https://github.com/yt-dlp/yt-dlp)
- 🎞️ [FFmpeg](https://github.com/FFmpeg/FFmpeg)
- ⚡ [aria2](https://github.com/aria2/aria2)
- 🎨 [PyQt5](https://www.riverbankcomputing.com/software/pyqt/)
