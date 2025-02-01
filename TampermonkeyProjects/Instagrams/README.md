
---
# Cleangram

A simple userscript to clean up your Instagram feed by hiding unwanted content.

## Features

### 🧹 Content Filtering
- Hides suggested posts
- Removes sponsored content
- Hides "Follow" prompts
- Non-destructive element hiding (preserves layout)

### 🔍 Text Detection
- Case-insensitive matching
- Configurable blacklist phrases
- Basic console logging
- Automatic re-check after clicks

### ⚡ Performance
- Lightweight implementation
- MutationObserver for dynamic content
- Configurable delay timing
- Targets specific HTML elements

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) browser extension
2. Click [here](#) to install the script (link coming soon)

## Configuration

Modify the CONFIG object in the script to customize:
```javascript
const CONFIG = {
    waitLength: 500,        // Delay after clicks
    elementsToClean: ['ARTICLE'],
    blacklist: [
        'follow',
        'suggested for you',
        'suggested posts',
        'sponsored'
    ]
};
```

## Version History

### v0.1.0
- Initial release
- Basic content filtering
- MutationObserver implementation
- Click event handling

## Technical Details

- **Author**: JJJ
- **License**: [MIT](https://choosealicense.com/licenses/mit/)
- **Dependencies**: Tampermonkey

---

<div align="center">
<img src="https://www.google.com/s2/favicons?sz=64&domain=instagram.com" alt="Instagram Icon">

**Current Version: 0.1.0**
</div>
