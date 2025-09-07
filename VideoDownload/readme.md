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
   - ⏸️ Download pause and resume functionality
   - ⏹️ Download cancellation support
   - 🔧 Non-blocking package installations
   - 🔄 Automatic package updates when available

3. **🔧 Integration with:**
   - 🚀 yt-dlp for video downloading
   - 🎞️ FFmpeg for media processing
   - ⚡ aria2/aria2c for accelerated downloads (used by default if installed)
   
4. **⚡ Platform-Specific Optimizations:**
   - 🎮 Enhanced Twitch downloads with superior audio quality
   - 🔄 Automatic audio synchronization for Twitch streams
   - 📱 YouTube age-restricted content support
   - ⚡ Aria2/aria2c used for all eligible downloads for maximum speed
   - 🧩 Increased fragment concurrency and chunking for fast downloads


## 📥 Installation & Build

### 💿 Method 1: Using the Executable
1. ⬇️ Download the latest [VideoDownload.exe](https://github.com/JaredJomar/Projects/raw/main/VideoDownload/VideoDownload.exe)
2. 🏃 Run the application
3. ⚙️ Go to the Settings tab
4. 🔧 Use the installation buttons to install/update required dependencies:
   - Install/Update FFmpeg
   - Install/Update yt-dlp (also auto-installs Python extras for improved compatibility)
   - Install/Update aria2c

> Note: When you install or update yt-dlp from Settings, the app also ensures
> the Python package `yt-dlp[default,curl-cffi]` is installed in your current
> Python environment. This enables advanced HTTP impersonation and broader site
> compatibility without adding new buttons or steps. The app still uses the
> winget-installed `yt-dlp` binary path by default.

### 💻 Method 2: From Source
1. Clone the repository
2. Install Python requirements:
   ```pwsh
   python -m pip install -r requirements.txt
   ```
3. Run the application and install dependencies through the Settings tab
4. To build with PyInstaller:
     ```pwsh
     python -m PyInstaller VideoDownloadToExecute.spec
     ```

## ⚙️ Configuration

1. Open the Settings tab
2. Install or update required packages using the provided buttons
3. Verify installation status (green checkmarks)
4. Paths will be automatically configured after installation
5. **Smart Updates**: Buttons automatically check for and install updates if packages are already installed

## 📚 Usage

### 🔰 Basic Download
1. Paste video URL
2. (Optional) Set custom title
3. Choose download path
4. Select download type
5. Pick resolution
6. Click Download
7. Use Pause/Resume button to control download progress

### ⏸️ Pause and Resume Downloads
1. **Pause**: Click the "Pause" button during an active download to suspend it
2. **Resume**: Click "Resume" to continue the download from where it was paused
3. **Benefits**: No need to restart downloads, saves bandwidth and time
4. **Compatibility**: Works with all supported platforms and download types

### 📋 Batch Download & Playlists
1. Create a text file with URLs (one per line) or paste a YouTube playlist.
2. Click Browse next to URL field or paste directly.
3. Configure other options.
4. Click Download.
5. Playlist videos are auto-numbered (01_, 02_, …) oldest to newest.

### 🔴 Live Stream & Twitch Content
1. Paste live stream URL or Twitch video/clip URL
2. App automatically detects content type
3. For live streams:
   - Recording starts immediately
   - Use Cancel to stop recording
4. For Twitch videos:
   - Select "video with audio" and "best" resolution for highest quality
   - App handles audio synchronization automatically
   - Audio quality is set to maximum for all Twitch downloads

### 🍪 Browser Cookies for Age-Restricted Videos
1. In the Settings tab, select your browser under "Use Browser Cookies"
2. The app will read (but never save) cookies from your selected browser
3. For age-restricted videos, the app automatically retries with cookies if needed
4. Only the browser selection is saved, not the actual cookies

> **Note:** Cookies are only used when required for authentication or age-restricted content

### 🎬 YouTube Quality and Client Strategy
- The app targets your selected resolution (e.g., 1080) using yt-dlp’s format
  selection.
- For YouTube, it prefers yt-dlp’s default desktop/TV clients to expose full
  format lists (1080p+). If YouTube returns a client restriction (e.g. “Watch
  on the latest version of YouTube”), the app automatically retries using
  alternate clients without cookies to maximize the chance of success.
- Mobile clients (Android/iOS) don’t support cookies and may be capped (≤720p)
  or require additional tokens. The app avoids them unless absolutely necessary.
- Tip: If you are not getting 1080p on a restricted video, try setting
  Browser Cookies to “None” and retry; this can unlock higher formats in some
  cases.

## ❗ Troubleshooting

1. **📦 Dependencies Not Found:**
   - Check Settings tab for installation status
   - Verify paths are correct
   - Try reinstalling using the provided buttons

2. **❌ Download Fails:**
   - Check internet connection
   - Verify URL is valid
   - Look for errors in progress log
   - “Unsupported URL” messages mean the page has no downloadable media;
     the app will no longer mark such cases as Completed.
   - If you see “The following content is not available on this app” the app
     will try alternate client strategies automatically. You can also toggle
     cookies off to try an anonymous fetch which sometimes yields higher formats.

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
