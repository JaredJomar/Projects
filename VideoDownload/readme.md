# Video Download App

A simple PyQt5-based application for downloading videos and audio from YouTube using yt-dlp and FFmpeg.

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

## Executable 

1. Download the Executable: [VideoDownload_v2.exe](https://github.com/JaredJomar/Projects/raw/4c9fc979dea354ffb73f578f20edb5d107c5bd2a/VideoDownload/VideoDownload_v2.exe?download=)
2. Install yt-dlp: Open the terminal and run:

   ```sh
   winget install yt-dlp.yt-dlp
   ```

3. Install FFmpeg: Open the terminal and run:

   ```sh
   winget install Gyan.FFmpeg
   ```
4. Select the path to yt-dlp and FFmpeg in the settings
Path should be something like this:
   ```json
      "ffmpeg_path": C:\Users\YourUsername\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-7.0.2-full_build\bin\ffmpeg.exe
      "yt_dlp_path": C:\Users\YourUsername\AppData\Local\Microsoft\WinGet\Packages\yt-dlp.yt-dlp_Microsoft.Winget.Source_8wekyb3d8bbwe\yt-dlp.exe
   ```



## License

[MIT](https://choosealicense.com/licenses/mit/)
