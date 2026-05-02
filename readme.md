# Projects

This repo contains my personal projects across various domains including utilities, browser enhancements, and applications.

<div align="center">
<img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License">
</div>

## 📚 Table of Contents

- [Project Structure](#project-structure)
- [Desktop Applications](#desktop-applications)
- [Browser Enhancements](#browser-enhancements)
  - [Streaming Services](#streaming-services)
  - [Social & Content](#social--content)
  - [Search & Productivity](#search--productivity)
- [Utilities](#utilities)
- [License](#license)

## Project Structure

```
ProjectsHub/
├── apps/
│   ├── NoteApp/
│   ├── Pdf_Combiner/
│   └── VideoDownload/
├── extensions/
│   ├── ChromeExtensions/
│   └── TampermonkeyProjects/
├── utilities/
│   └── ArchiveBooksDownloader/
├── .gitignore
├── last_dir.json
└── README.md
```

## Desktop Applications

### 📝 NoteApp

A modern, feature-rich text editor built with PyQt6, supporting multiple programming languages and advanced editing features.

**Key Features:**
- ✨ Syntax highlighting for multiple languages (Python, SQL, Java, C++, JavaScript, Markdown)
- 📊 Line numbers with dark theme support
- 📂 Code folding and brace matching
- 💾 File operations (New, Open, Save, Save As)
- 🔍 Zoom In/Out capabilities
- ⌨️ Comprehensive keyboard shortcuts

**Tech Stack:** Python, PyQt6, QScintilla

### 📥 Video Download App

A PyQt5-based application for downloading videos, audio, and live streams from various platforms.

**Key Features:**
- 📼 Multiple download types (video, audio, combined, live streams)
- 📊 Custom video resolutions (240p to 1080p)
- 📋 Batch downloads from text files
- 📈 Progress tracking with detailed logs
- 🔧 Integration with yt-dlp, FFmpeg, and aria2c

**Tech Stack:** Python, PyQt5

## Browser Enhancements

A collection of JavaScript scripts using the Tampermonkey browser extension to enhance web browsing experiences.

### Streaming Services

#### 🎬 Netflix Enhancements (v0.4.4)

Enhance your Netflix experience with automatic features and smart controls.

**Key Features:**
- ⏭️ Auto skip intros, recaps, and outros
- 🎬 Smart fullscreen management
- 🎮 Optional games section hiding
- ⚙️ F2 settings hotkey for preferences

#### 📺 Disney Plus Enhancements (v0.6.1)

Improve Disney Plus with automatic playback controls.

**Key Features:**
- ⏭️ Auto skip intros and recaps
- ▶️ Auto play next episode
- 🖥️ Smart fullscreen management
- ⚙️ Customizable settings

#### 🎞️ Prime Video Enhancements (v0.2.2)

Streamline your Prime Video experience with smart playback features.

**Key Features:**
- ⏭️ Auto skip intros
- 🖥️ Auto fullscreen mode
- ⚙️ Netflix-style settings UI
- 💾 Persistent preferences

#### 🎦 AnimeFLV Enhancements (v0.3.1)

Enhance AnimeFLV with provider selection and navigation improvements.

**Key Features:**
- 🎦 Automatic video provider selection
- 📱 Floating "Page Up" navigation button
- ⚙️ F2 hotkey for quick settings access
- 🎯 Provider preference memory

#### 📺 Serieslan Enhancements (v0.1.0)

Improve Serieslan with provider selection and visual enhancements.

**Key Features:**
- 🎦 Auto provider selection with preferences
- 🎨 Dark theme background
- 📱 Enhanced text readability
- ⚙️ F2 hotkey for settings

#### 🎬 AppleTV Enhancements

Skip intros and outros on Apple TV+ content.

**Key Features:**
- ⏭️ Skip recaps and intros automatically
- 💾 Persistent user preferences
- ⚙️ Settings dialog with toggle controls

#### 🍿 LookMovie Enhancements (v0.6.3)

Enhance LookMovie with ad controls and CAPTCHA management.

**Key Features:**
- 🛡️ Automatic player ad closure
- 🤖 Smart reCAPTCHA handling
- 🚫 Banner advertisement removal
- ⚡ Optimized performance

### Social & Content

#### 📸 Cleangram (v0.0.2)

Clean up your Instagram feed by hiding unwanted content.

**Key Features:**
- 🧹 Hides suggested posts with improved accuracy
- 🚫 Removes sponsored content
- 🔍 Advanced element detection
- ⚡ Lightweight implementation

#### 🎮 Twitch Enhancements (v0.5.4)

Enhance Twitch and Amazon Gaming with automated features.

**Key Features:**
- 💰 Auto claim channel points
- 🎬 Auto enable theater mode
- 🎮 Auto claim prime rewards
- 🎁 Add "Redeem on GOG" button
- ⚙️ F2 settings hotkey with toggle switches

#### 📺 YouTube Enhancements

Collection of YouTube enhancing scripts:
- 🚫 AdBlock Ban Bypass
- 🎬 Playlist Dialog Enhancer
- 👍 Automatic likes and scroll controls

### Search & Productivity

#### 🔍 Fast Search

Quick search shortcuts across multiple platforms using a React-based interface.

**Key Features:**
- ⌨️ Press Insert to activate
- 🔎 Multiple search engine shortcuts
- 📂 Current/new tab opening options
- 📚 Search history support

#### ✉️ Outlook Smart Email Filter

Quick email filter management for Outlook Web App.

**Key Features:**
- 📥 Advanced email filtering
- ⌨️ Keyboard shortcuts
- 🔄 Real-time filter application

#### ❓ Perplexity Thread Manager (v0.1.3)

Thread deletion for Perplexity through keyboard shortcuts.

**Key Features:**
- ⌨️ Delete key to initiate deletion
- ✅ Enter to confirm, ESC to cancel
- 📊 Visual confirmation prompt

#### 🤖 Auto "Not a Robot" (v0.9.0)

Automate captcha verification across websites.

**Key Features:**
- 🔄 Automatic CAPTCHA clicking
- 🔍 Smart detection system
- 🛡️ Cross-site compatibility

## Utilities

### 📚 ArchiveBooksDownloader

A batch file utility that simplifies downloading books from Archive.org.

**Key Features:**
- 💾 Saves credentials and preferences
- 🖼️ Sets default image resolution
- 📚 Quick book link entry
- 📂 Organized downloads

### 📑 PDF Tool

A Python utility for combining, splitting, and manipulating PDF files.

**Key Features:**
- 📁 Combine multiple PDFs into one
- ✂️ Split PDFs into individual pages
- 🔍 Extract specific pages
- 📊 Excel to PDF conversion
- 🔄 PDF rotation options

### 📄 Drive PDF Download Bypass (v0.1.0)

Bypass PDF download restrictions on Google Drive files.

**Key Features:**
- 📄 Auto-scrolls pages for image capture
- 📥 Generates high-quality PDFs
- ⚙️ Customizable scroll delay
- 🔧 Real-time progress updates

## License

This project is licensed under the [MIT License](https://choosealicense.com/licenses/mit/).