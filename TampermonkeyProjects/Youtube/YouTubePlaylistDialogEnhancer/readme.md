
---
# YouTube Playlist Dialog Enhancer

Enhances the YouTube Save to playlist flow with dynamic search, reliable channel autofill, and safer menu targeting.

## Features

### 🔍 Smart Playlist Search
- Adds a live search field inside the Save to playlist dialog
- Filters playlist items instantly while typing
- Includes a one-click clear action for fast reset

### 🤖 Reliable Channel Autofill
- Auto-fills the search field with the current channel name when available
- Auto-fills the New playlist title with the detected channel name
- Uses multiple fallbacks to resolve channel name across changing YouTube layouts

### 🛡️ Context-Aware Injection
- Injects only in the real Save to playlist UI
- Avoids injecting into generic More actions context menus
- Cleans up misplaced UI if YouTube reuses popup containers dynamically

### ⚙️ Dialog Stability
- Keeps the playlist dialog centered and width-stable
- Re-applies layout constraints while the popup is open
- Resets stale search state when re-opening the dialog

## Version History

### v0.0.3
- Improved channel detection with modern YouTube selectors and runtime fallbacks
- Added contextual safeguards to prevent search bar injection in non-playlist menus
- Added stale UI cleanup for popup reuse scenarios
- Improved open/reset behavior so previous searches do not persist unexpectedly

### v0.0.2
- Styled search bar with hover and focus effects and clear button support
- Improved playlist dialog detection and list scanning selectors
- Improved scrolling and height behavior for long playlist lists
- Added auto-fill support for New playlist title

### v0.0.1
- Initial release
- Added playlist search field and filtering behavior
- Added centered dialog behavior and channel autofill baseline

## Technical Details

- **Author**: JJJ
- **License**: [MIT](https://choosealicense.com/licenses/mit/)

---

<div align="center">
<img src="https://www.google.com/s2/favicons?sz=64&domain=youtube.com" alt="YouTube Icon">

**Current Version: 0.0.3**
</div>