# SideDock

SideDock is a vanilla Chrome Manifest V3 extension that adds a side-panel rail for user-managed websites. Save sites from the current tab, open them from the rail, and choose whether fallback previews should use a mobile or desktop frame.

## Features

- Native MV3 side panel integration with `Ctrl+Space` to open or toggle SideDock.
- Saved-site rail backed by `chrome.storage.local`.
- Add the current tab, remove saved sites, and reorder sites with drag and drop.
- Per-site view mode plus a global default for mobile or desktop fallback previews.
- Fallback extension panel for browsers that cannot navigate the side panel directly.
- `Ctrl+Shift+Space` shortcut to return to the SideDock rail.

## Requirements

- Node.js for local tests.
- Chrome or another Chromium browser with Manifest V3 side panel support.

## Development

Install dependencies:

```sh
npm install
```

Run the test suite:

```sh
npm test
```

## Load the Extension

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose this `SideDock` directory.
5. Click the extension action or press `Ctrl+Space` to open the side panel.

## Project Structure

```text
manifest.json        Extension manifest and commands
src/background.js    Service worker message and command handlers
src/panel.html       Side panel markup
src/panel.js         Rail, drawer, site interactions, and settings UI
src/siteStore.js     Storage normalization and persistence helpers
src/navigationStrategy.js  Side panel navigation and fallback behavior
src/urlValidator.js  Site URL validation and normalization
tests/               Jest and jsdom coverage
```

## Notes

SideDock stores saved sites, display settings, and panel UI state in `chrome.storage.local`. Site URLs are normalized to `http` or `https`; unsupported schemes are rejected.
