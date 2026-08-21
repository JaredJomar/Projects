
---
# GitHub Nav Enhancements

Adds a compact set of Home, Explorer, Dashboard, Repositories, and Stars shortcuts directly to GitHub’s breadcrumb navigation for faster access to the most-used destinations.

## Features

### 🎯 Quick Navigation
- Home shortcut opens the logged-in user profile instantly
- Explorer and Dashboard provide fast access to GitHub discovery and overview pages
- Repositories and Stars keep the most-used destinations one click away
- Buttons sit directly in the breadcrumb area without opening the user menu

### ⚡ Responsive Behavior
- Adapts across different screen widths with icon-only and compressed layouts
- Drops lower-priority buttons on smaller screens to prevent overlap
- Hides the entire block on very narrow viewports to match GitHub’s own collapse behavior
- Uses GitHub design tokens and spacing to stay visually consistent

### 🛡️ Smart Detection
- Detects the current logged-in username from the user menu header or meta tag fallback
- Always targets the active account instead of just the current profile URL
- Keeps buttons present as the page updates via DOM observation
- Works without external dependencies or additional setup

## Version History

### v0.0.3
- Added the Dashboard button to the breadcrumb shortcuts
- Improved responsive layout behavior for narrower screens
- Added graceful button hiding for compact widths to prevent overlap
- Refined spacing and styling for better alignment with GitHub’s UI

### v0.0.2
- Added Home button to open the logged-in user’s profile page
- Added Explorer button to open GitHub Explore
- Updated the breadcrumb navigation set to four quick-access destinations

### v0.0.1
- Initial release
- Added Repositories and Stars buttons to breadcrumbs
- Implemented username detection with header-to-meta fallback
- Added helper function for button creation and theme-compatible hover styles

## Technical Details

- **Author**: JJJ
- **License**: [MIT](https://choosealicense.com/licenses/mit/)
- **Target Site**: github.com
- **Injection Point**: Breadcrumb navigation
- **Username Detection**: User header title → meta tag fallback
- **Dependencies**: None (vanilla JavaScript)

---

<div align="center">
<img src="https://www.google.com/s2/favicons?sz=64&domain=github.com" alt="GitHub Icon">

**Current Version: 0.0.3**
</div>
