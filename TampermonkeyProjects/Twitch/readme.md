
---
# Twitch Enhancements

Enhance your Twitch and Amazon Gaming experience with automated rewards claiming and viewing optimizations.

## Features

### 💎 Auto Claim System
- Automatic channel points claiming with visual console confirmation
- Auto-claim prime rewards on gaming.amazon.com
- Batch claiming with "Claim All" button for multiple games
- "Remove All" button to quickly dismiss all items
- Automatic Twitch drops claiming with 15-minute refresh cycle

### 🎮 Platform Integration
- One-click GOG code redemption buttons
- Legacy Games integration with email save feature
- Automatic code copying for redemption
- Cross-platform redemption support

### 🖥️ Viewing Optimization
- Automatic theater mode activation
- Clean interface with unnecessary menu removal
- Seamless platform transitions
- Enhanced viewing experience

### ⚙️ Settings Dialog
- User-friendly settings popup (press F2 to open)
- Toggle individual features on/off
- Settings automatically saved between sessions
- Accessible via Tampermonkey menu

## Automated Features

The script automatically:
- Claims channel points with visual feedback
- Enables theater mode on stream load
- Claims prime rewards on Amazon Gaming
- Claims Twitch drops (15-min refresh)
- Adds platform-specific redemption buttons
- Manages multi-platform code redemption

## Platform Integration

| Platform | Features |
|----------|-----------|
| Twitch | Points Claiming, Drops Auto-Claim, Theater Mode |
| Amazon Gaming | Prime Rewards, Batch Claims, "Claim All" & "Remove All" Buttons |
| GOG | One-Click Code Redemption, Auto-Copy |
| Legacy Games | Code Redemption, Email Save Feature |

## Version History

### v0.5.5
- Updated Legacy Games redeem URL to the correct link

### v0.5.4
- Added comprehensive settings dialog with toggle switches
- Implemented customizable hotkey for settings (default: F2)
- Enhanced Logger system with color-coded messages and timestamps
- Improved dynamic application of settings without page reload
- Added better targeting for claim buttons on Amazon Gaming
- Enhanced "Remove All" button with sequential dismissal and progress tracking
- Improved button behavior with better error handling
- Added cleanup of unused elements when features are disabled
- Optimized observer reconnection for better performance
- Fixed issues with newsletter checkbox handling on Legacy Games

### v0.5.3
- Added "Remove All" button to dismiss all items at once
- Fixed "Claim All" button to target only valid game claim buttons
- Improved button behaviors with sequential dismissal
- Added progress indicators for bulk operations
- Fixed issues with unwanted links being opened
- Implemented structured Logger system with color-coded console messages
- Added visual feedback with timestamp for script operations
- Updated Legacy Games form integration with correct selectors
- Added newsletter checkbox handling (defaults to unchecked)
- Improved form submission reliability
- Enhanced input event triggering
- Optimized redemption process timing

### v0.5.2
- Updated `CLAIM_DROPS_SELECTOR` for latest Twitch UI
- Enhanced code reliability and performance
- Improved platform compatibility
- Optimized automated processes

## Technical Details

- **Author**: JJJ
- **License**: [MIT](https://choosealicense.com/licenses/mit/)

---

<div align="center">
<img src="https://www.google.com/s2/favicons?sz=64&domain=twitch.tv" alt="Twitch Icon">

**Current Version: 0.5.4**
</div>