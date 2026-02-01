
---
# YouTube Enchantments

Enhance your YouTube experience with automatic likes, channel navigation shortcuts, scroll controls, and AdBlock ban bypass—now Trusted Types compliant.

## Features

### 🎯 Auto Like
- Automatically likes videos from channels you're subscribed to
- Configurable watch threshold before liking (0-100%)
- Optional live stream liking support
- Toggle for liking videos from non-subscribed channels
- Adjustable check interval with sane bounds (1–30s; default 3s)
- Smart detection across locales and Shorts

### 🎬 Smart Channel Navigation
- Automatically redirects from channel featured pages to videos page
- Works with both new (@username) and legacy (/channel/ID) URL formats
- Instant redirection for faster browsing experience
- Seamless navigation without extra browser history entries

### 🛡️ AdBlock Protection
- Bypasses YouTube's AdBlock detection
- Seamlessly continues video playback
- Maintains video quality and features
- Toggle to enable or disable bypass functionality
- Trusted Types compliant (no blob/object URLs)

### 📜 Smart Scrolling
- Adjustable scroll speed
- Keyboard controls for navigation
- Smooth auto-scroll functionality
- Customizable scroll behavior settings

### 🎮 Game Elimination
- Removes game sections from the YouTube homepage
- Toggle to hide or show game-related content
- Cleaner browsing experience without game distractions
- **Optimized Detection**: Faster and more accurate game content identification
- Supports multiple languages and regional game content

### 🔍 Advanced Logging
- Color-coded console messages for easy identification
- Timestamped entries for precise debugging
- Categorized logs (info, warning, success, error)
- Toggle to enable/disable logs from settings
- Performance-friendly with reduced overhead

## Keyboard Controls

| Key | Function |
|-----|----------|
| F2 | Open/close settings |
| Page Down | Toggle auto-scroll |
| Page Up | Stop scroll/return to top |

## Settings

Access the settings panel (F2) to customize:
- **Auto-like behavior**: Configure watch threshold (0-100%)
- **Live stream preferences**: Toggle auto-like for live content
- **Non-subscribed channels**: Option to like all videos
- **Scroll speed**: Adjustable from 10-100 pixels per interval
- **AdBlock bypass**: Toggle protection feature
- **Game sections**: Control visibility of gaming content
- **Logging**: Enable/disable console logging
- **Check frequency**: Adjustable interval (1,000–30,000 ms), default 3,000 ms

## Version History

### v0.8.6
- **Complete Class-Based Refactor**: Restructured codebase from IIFE to 11 specialized classes
- **Modular Architecture**: Each class has single responsibility (Logger, SettingsManager, PlayerManager, AutoLikeManager, etc.)
- **Improved Maintainability**: Better code organization with clear separation of concerns
- **Comprehensive Test Suite**: 137 passing unit tests covering all major functionality
- **Type Safety**: Class-based design enables better IDE support and error detection
- **Better Performance**: Optimized class composition and dependency injection
- **Enhanced Documentation**: Detailed class descriptions explaining purpose and functionality
- **No Feature Changes**: Maintains 100% backward compatibility with v0.8.5

### v0.8.5
- Trusted Types compliance: removed blob Web Worker; switched to interval-based scheduler
- Robust script loading for YouTube IFrame API (inject once; onload/onerror handling)
- Navigation lifecycle: listen to yt-navigate-finish/popstate; restart checks; stop auto-scroll on navigation
- MutationObserver to detect like-button readiness and reduce polling
- Auto-like hardening: avoid double-likes; support Shorts and standard videos
- Selector updates for Like/Dislike across locales and contexts
- Settings additions: logging toggle and adjustable checkFrequency with bounds
- Cleanup and stability: clear timers/observers on unload; defensive DOM access; improved logging

### v0.8.4
- **Performance Optimizations**: Improved script efficiency and response times
- **Enhanced Selectors**: Case-insensitive button detection for better multilingual support
- **Faster Auto-Like**: Reduced check frequency from 5 seconds to 3 seconds
- **Code Cleanup**: Streamlined functions and removed redundant code
- **Better Error Handling**: Improved worker creation and error management
- **Optimized Game Detection**: More efficient game section identification
- **Consolidated Event Handling**: Unified event listener management
- **Memory Improvements**: Better resource management and cleanup

### v0.8.3
- Added automatic channel redirect feature
- Redirects from featured pages to videos pages
- Supports both @username and /channel/ID URL formats
- Enhanced channel navigation experience
- Improved URL pattern matching

### v0.8.2
- Added game elimination toggle to remove game sections
- Enhanced logging system with color-coded console messages
- Enhanced settings panel with new game toggle option
- Added configurable auto-scroll speed slider
- Fine-tuned scroll behavior and controls
- Improved scroll settings persistence

### v0.8.1
- Updated YouTube button selectors
- Redesigned settings interface
- Performance optimizations

## Technical Details

- **Author**: JJJ
- **License**: [MIT](https://choosealicense.com/licenses/mit/)
- **Logging**: Advanced console logging system with color-coded messages and timestamps
- **Browser Support**: Chrome, Firefox, Edge with optimized performance
- **URL Handling**: Supports both modern (@username) and legacy (/channel/ID) YouTube URLs
- **Performance**: Optimized for faster execution and reduced memory usage
- **Multilingual**: Case-insensitive detection works across different YouTube language settings

---

<div align="center">
<img src="https://www.google.com/s2/favicons?sz=64&domain=youtube.com" alt="YouTube Icon">

**Current Version: 0.8.6**
</div>