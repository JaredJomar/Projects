# Video Download App

A simple TTinker-based application for downloading videos and audio from YouTube using yt-dlp and FFmpeg.

## Features

1. **Download Videos:**
   - Supports downloading videos in various resolutions.
   - Uses yt-dlp to fetch video content.

2. **Download Audio:**
   - Allows downloading audio in mp3 format.
   - Utilizes yt-dlp for audio extraction.

3. **Download Videos with Audio:**
   - Enables downloading videos with merged audio.
   - Uses yt-dlp and FFmpeg for the combined download.

## Usage

1. **Download Videos:**
   - Provide one or more video URLs in the URL input field.
   - Choose "video" as the download type.
   - Select the desired resolution.
   - Specify the download path.
   - Click the "Download" button to start the process.
   - Use the "Cancel" button to stop the download.

2. **Download Audio:**
   - Input one or more video URLs in the URL field.
   - Select "audio" as the download type.
   - Set the desired resolution (applicable to audio quality).
   - Choose the download folder.
   - Click the "Download" button to initiate the download.
   - Stop the download using the "Cancel" button.

3. **Download Videos with Audio:**
   - Enter URLs in the URL input field.
   - Choose "video with audio" as the download type.
   - Select the resolution for video download.
   - Specify the download directory.
   - Initiate the download by clicking the "Download" button.
   - Stop the download process using the "Cancel" button.

## Additional Information

- The application uses yt-dlp and FFmpeg for fetching and processing video content.
- Ensure you have the required dependencies (yt-dlp, FFmpeg) installed.

## Requirements

- Python 3.6 or above
- PyQt5
- yt-dlp
- FFmpeg

## Installation

1. Install Python (if not already installed): [Python Installation](https://www.python.org/downloads/)
2. Install PyQt5: `pip install PyQt5`
3. Install yt-dlp: `winget install yt-dlp.yt-dlp`
4. Install FFmpeg: `winget install Gyan.FFmpeg`

## License

[MIT](https://choosealicense.com/licenses/mit/)
