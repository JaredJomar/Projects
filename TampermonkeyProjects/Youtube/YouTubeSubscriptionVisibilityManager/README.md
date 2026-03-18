
---
# YouTube Subscription Visibility Manager

A Tampermonkey script that lets you curate your YouTube subscriptions feed with channel-level visibility controls without unsubscribing.

## Features

### 🎯 Smart Subscription Filtering
- Show or hide subscribed channels without removing your YouTube subscription
- Keep notification settings untouched while controlling subscriptions feed visibility
- Toggle channel visibility individually with persistent local storage
- Filter only the Subscriptions experience instead of changing your full YouTube account state
- Strict whitelist mode: unidentified cards (recommended, algorithm, promoted) are hidden automatically
- Collaboration videos are hidden if any of the involved channels is disabled

### 🤖 Smart Sync and Scanning
- Scan the current Subscriptions page to discover visible channels quickly
- Sync the full subscription list from the connected YouTube account with OAuth
- Automatically detect newly discovered channels and add them to the manager
- Use account sync when connected and page scan as a fallback when not connected
- Full multi-channel cache written on scan so collaboration cards are handled correctly from the first pass

### ⚡ Bulk Actions and Performance
- Enable all stored channels with one click
- Disable all stored channels with one click
- Enable only the currently filtered channel list
- Disable only the currently filtered channel list
- Undo Enable All restores the previous disabled state with one click after a bulk enable

### ⌨️ Keyboard Navigation
- Open and close the manager with keyboard shortcuts
- Navigate the channel list with Tab and toggle entries with Space or Enter

### ⚙️ UI and Data Management
- Search channels instantly from the in-page manager UI
- View All, Enabled, and Disabled tabs with live channel counts
- Import and export JSON backups for channels, settings, and sync metadata
- Use a protected modal scroll area that keeps scrolling inside the UI instead of moving the page
- Automatic data migration from any previous version storage key

## Keyboard Controls

| Key | Function |
|-----|----------|
| Alt + B | Open the manager on Windows and Linux |
| Cmd + B | Open the manager on macOS |
| Escape | Close the manager |
| Tab | Move focus between channel list entries |
| Space / Enter | Toggle the focused channel on or off |

## Settings

| Setting | Function |
|---------|----------|
| OAuth Client ID | Connects Google OAuth for full account subscription sync |
| Default state for new channels | Sets whether newly discovered channels start enabled or disabled |
| Debug mode | Enables console logging for troubleshooting |
| Import / Export JSON | Saves or restores stored channel data and settings |

## Supported Systems

| System | Support |
|--------|---------|
| YouTube Subscriptions page | Full page scan and visibility filtering |
| Connected YouTube account | Full subscription sync through OAuth |
| Tampermonkey | Required runtime environment |
| Chromium and compatible browsers | Recommended for current use |

## Automated Features

### 🔄 Dynamic Subscription Updates
- Observes YouTube SPA navigation and refreshes filtering when the subscriptions page changes
- Re-applies visibility rules when new subscription cards are loaded dynamically
- Preserves stored channel states between sessions using local storage
- Keeps the manager responsive while scanning or syncing with progress feedback
- Passive refresh skips work entirely when not on the Subscriptions page to avoid idle overhead

## Debugging

Hidden cards receive a `data-ytsvm-hidden-by` attribute in the DOM containing the channel title responsible for hiding them. Inspect any hidden card in DevTools to see which channel caused it to be filtered out.

## Version History

### v0.1.3
- Fixed collaboration video re-enable bug: toggling any channel on a collab card now re-evaluates all channels on that card before showing it
- Fixed page scan to use the same multi-channel cache as the filter engine so collab cards are handled correctly from the first scan pass
- Fixed import to sanitize channel entries missing the key field and prevent silent duplicates
- Fixed passive refresh interval to skip work when not on the Subscriptions page
- Improved channel list rendering with DOM diffing: badge and checkbox state is patched in place instead of rebuilding the full list on each toggle
- Reduced duplicate DOM traversal in channel data extraction to a single unified anchor pass
- Added `data-ytsvm-hidden-by` attribute on hidden cards so DevTools inspection shows the responsible channel
- Added Undo Enable All button that appears after a bulk enable and restores the previous disabled state
- Added keyboard navigation in the channel list: Tab to move focus, Space or Enter to toggle
- Added retry logic for Google Identity Services script load with exponential backoff on network failure
- Updated data migration to cover all previous storage keys including the v0.2.0 bad semver bump

### v0.1.2
- Fixed context menu disable action to collect all channel keys on a card instead of only the first cached one
- Collaboration videos now correctly disable all involved channels from the right-click menu action

### v0.1.1
- Added strict whitelist filtering: cards that cannot be identified as a subscribed channel are hidden automatically
- Added strict filtering for collaboration videos: a card is only shown when every detected channel is enabled
- Narrowed the context menu MutationObserver scope from document.body to ytd-popup-container to eliminate layout thrashing on the Subscriptions page
- Added automatic data migration from v0.1.0 storage key on first run
- Bumped storage key to v011

### v0.1.0
- Added bulk Enable All and Disable All controls for stored channels
- Added search-aware bulk actions for filtered channel results
- Added live tab counters for All, Enabled, and Disabled channel views
- Improved import and export workflow for JSON backups and sync metadata
- Improved modal scroll containment and action-state handling during scan and sync operations

### v0.0.9
- Added import JSON and export JSON features
- Improved settings layout and overall modal styling
- Added file-based JSON loading support
- Fixed scroll chaining inside the modal interface

### v0.0.8
- Unified the Scan action so it syncs from account when connected
- Added fallback page scan when not connected
- Updated menu commands to match the new scan behavior
- Improved status messaging for connected and disconnected flows

### v0.0.7
- Fixed the OAuth Client ID input so it can be edited reliably
- Added draft settings state to prevent input reset issues
- Improved settings rendering behavior while the modal is open
- Added better validation for Google OAuth client IDs

### v0.0.6
- Implemented real Google Identity Services OAuth support
- Added real YouTube Data API subscription sync
- Added token validation and revoke-based disconnect flow
- Connected account sync to persistent local channel storage

### v0.0.5
- Refactored the script into a modular architecture for future scaling
- Added the Settings tab with account sync preparation
- Added structured auth and sync state storage
- Prepared the script for future real OAuth integration

### v0.0.4
- Added scan progress tracking and loading feedback
- Improved scan and refresh separation
- Added progress bar updates during page scans
- Improved scan batching for smoother performance

### v0.0.3
- Added the popup scan button
- Added Alt + B and Cmd + B shortcuts for opening the manager
- Improved popup interaction flow
- Refined in-page controls for subscriptions scanning

### v0.0.2
- Restricted filtering logic to the Subscriptions page only
- Moved the UI to an on-demand modal instead of a permanent floating panel
- Reduced aggressive page scanning behavior
- Improved local storage persistence for discovered channels

### v0.0.1
- Initial release
- Added channel-level visibility filtering for the YouTube subscriptions feed
- Added persistent enabled and disabled channel states
- Added a modular base architecture for future extension growth

## Technical Details

- **Author**: JJJ
- **License**: [MIT](https://choosealicense.com/licenses/mit/)
- **Target Domain**: YouTube
- **Script Type**: Tampermonkey userscript
- **Data Storage**: localStorage
- **Authentication**: Google Identity Services OAuth 2.0
- **API Integration**: YouTube Data API v3 for full subscription sync

---

<div align="center">
<img src="https://www.google.com/s2/favicons?sz=64&domain=youtube.com" alt="YouTube Icon" width="64">

**Current Version: 0.1.3**
</div>