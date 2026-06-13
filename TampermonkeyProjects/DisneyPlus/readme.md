
---
# Disney Plus Enhancements

Enhance your Disney Plus experience with automatic intro skipping, next episode playback, and smart fullscreen features.

## Features

### ⏭️ Auto Skip
- Automatically skips intros and recaps
- Smart detection of skip buttons
- Configurable skip behavior
- Seamless viewing experience

### 🎬 Playback Control
- Auto-play next episode
- Automatic fullscreen mode
- Smart continuation system
- Consistent playback settings

### ⚙️ Smart Settings
- F2 hotkey for quick access
- Easy toggle controls
- Persistent preferences
- Customizable behavior

## Keyboard Controls

| Key | Function |
|-----|----------|
| F2 | Open/close settings |
| Escape | Toggle fullscreen |

## Settings

Access the settings panel (F2) to customize:
- Intro/recap skip behavior
- Auto-play preferences
- Auto-play delay (seconds to wait before clicking next episode)
- Fullscreen options

## Version History

### v0.6.4
- Rewrote autoplay with overlay-gated polling instead of retry-limited timer
- Added configurable "Play Next Delay" setting
- Added debug logging for autoplay (gated by `localStorage.dpeDebugNext`)
- Added route guard for autoplay (only triggers on `/play/` and `/video/` paths)
- Added `wakePlayerControls()` mousemove simulation for reliable skip-intro detection
- Replaced `suspendAutoFullscreen` with cooldown-based auto-fullscreen (10s)
- Escape now toggles fullscreen (exit and re-enter)
- Fixed `play-next` elements in the controls bar being mistaken for up-next overlays
- Fixed MouseEvent and PointerEvent guards for Tampermonkey sandbox compatibility

### v0.6.3
- Fixed skip intro detection in modern Disney+ player overlays
- Added recursive open shadow DOM traversal with cycle protection
- Improved autoplay lookup to include controls rendered in shadow roots
- Synced settings dialog state and stopped exiting fullscreen when closing settings

### v0.6.2
- Refactored the script with strict mode plus centralized config, selectors, and constants
- Reworked the settings UI with modern toggle controls and a dedicated menu command entry
- Added safer intro-skip handling with click delay and duplicate-click protection
- Improved fullscreen and keyboard handling for smoother playback control

### v0.6.1
- Enhanced skip detection
- Improved fullscreen handling
- Added persistent settings
- Updated interface elements

## Technical Details

- **Author**: JJJ
- **License**: [MIT](https://choosealicense.com/licenses/mit/)

---

<div align="center">
<img src="https://www.google.com/s2/favicons?sz=64&domain=disneyplus.com" alt="Disney Plus Icon">

**Current Version: 0.6.4**
</div>