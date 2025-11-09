
---
# Cleangram

A simple userscript to clean up your Instagram feed by hiding unwanted content.

## Features

### 🧹 Content Filtering
- Hides suggested posts with improved accuracy
- Removes sponsored content using precise selectors
- Hides "Follow" prompts intelligently
- Non-destructive element hiding with zero-height collapse

### 🔍 Advanced Detection
- Selector-based content matching
- Multi-level element inspection
- Detailed console logging
- Smart re-check after dynamic updates

### ⚡ Performance
- Lightweight implementation
- Smart MutationObserver targeting
- Optimized element selection
- Minimal DOM manipulation

## Configuration

The script uses an improved CONFIG object for better control:
```javascript
const CONFIG = {
    waitLength: 500,
    elementsToClean: ['ARTICLE'],
    selectors: {
        sponsored: '[data-ad-preview="message"]',
        suggested: 'div[role="button"] span[dir="auto"]:only-child',
        followButton: 'div[role="button"]:not([aria-disabled="true"]) div[class*="x1i10hfl"]',
        suggestedLabel: 'span[dir="auto"]:first-child'
    }
};
```

## Version History

### v0.0.3
- Complete code refactoring with modular architecture
- Enhanced ad/sponsored content detection (multiple patterns)
- Improved "Suggested for you" detection with updated selectors
- Fixed infinite scroll compatibility (visibility:hidden approach)
- Added reinforcement system to prevent elements from reappearing
- Attribute monitoring to catch Instagram's style modifications
- Better state management and performance optimizations

### v0.0.2
- Improved content detection with precise selectors
- Enhanced element hiding mechanism
- Optimized MutationObserver implementation
- Better logging and debugging support

### v0.0.1
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

**Current Version: 0.0.3**
</div>
