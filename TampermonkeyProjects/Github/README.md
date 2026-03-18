
---
# GitHub Nav Enhancements

Quick access to Repositories and Stars buttons directly in the GitHub navigation breadcrumbs, eliminating the need to open the user menu popup.

## Features

### 🎯 Quick Navigation Buttons
- Repositories button with repo icon directly in navigation
- Stars button with star icon directly in navigation
- One-click access to your repositories and starred repos
- No more opening popup menus

### ⚡ Smart Integration
- Intelligent username detection with priority system (header → meta tag fallback)
- Always targets the logged-in user, not just URL profiles
- Styled to match GitHub's native button design
- Smooth hover effects with color transitions
- Works across all GitHub pages

### 🖥️ Code Quality
- Clean helper functions to reduce code duplication
- Robust detection methods with multiple fallbacks
- Responsive sizing that matches GitHub's design system
- CSS variables for theme compatibility
- Efficient DOM observation for dynamic content

## Version History

### v0.0.1
- Initial release
- Added Repositories and Stars buttons to breadcrumbs
- Priority-based username detection (header → meta tag fallback)
- Helper function for button creation
- Smooth hover effects and theme compatibility
- Always-logged-in-user targeting for consistent navigation

## Technical Details

- **Author**: JJJ
- **License**: [MIT](https://choosealicense.com/licenses/mit/)
- **Target Site**: github.com
- **Injection Point**: Breadcrumbs navigation
- **Username Detection**: Priority system (user header title → GitHub meta tag)
- **Dependencies**: None (vanilla JavaScript)

---

<div align="center">
<img src="https://www.google.com/s2/favicons?sz=64&domain=github.com" alt="GitHub Icon">

**Current Version: 0.0.1**
</div>
