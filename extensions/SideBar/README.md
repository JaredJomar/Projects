# Rail

Rail is a vanilla MV3 browser extension for Chrome and Edge. It provides an editable side-panel rail of websites and starts with no saved sites.

## Install

1. Run `npm install` in this directory if you want to run the Jest/jsdom test suite.
2. Open Chrome or Edge and go to the browser extensions page.
3. Enable developer mode.
4. Choose the option to load an unpacked extension.
5. Select this `extensions/SideBar` directory.

## Usage

1. Click the Rail extension action or press `Ctrl+B` to open the side-panel rail.
2. Click the bottom `+` button to save the current active tab.
3. Drag saved-site icons in the rail to reorder them.
4. Click a saved site's rail icon to keep the rail visible and open the drawer/sidebar to its left.
5. Click Open in the selected-site details to open it through the current side-panel strategy.

Only `http` and `https` URLs from browser tabs are accepted. Rail validates the current tab URL before saving it.

The current-tab `+` action saves the active tab URL, title, and browser-provided favicon when available. Rail stores this metadata, rail order, selected site, pin state, and internal drawer width locally in `chrome.storage.local`.

Mobile and Desktop are display preferences. In fallback mode, Mobile constrains the iframe to a phone-like width and Desktop uses the full side-panel width. Direct external side-panel URL support is browser-dependent, so these preferences do not bypass browser, site, or extension limitations.

## Edge Sidebar Target

Rail recreates the website-in-a-side-panel part of the retired Edge sidebar experience. Browser extensions cannot create or control Edge's native right-side app rail, the browser-chrome icon strip, or the built-in Customize sidebar shown by Edge. Rail approximates that shape with an internal right-side rail inside the extension's own side panel, with saved-site icons stacked vertically and the `+` action at the bottom.

This internal rail is not the native Edge browser-chrome rail and cannot place icons outside the extension side-panel surface.

## Compatibility

Best effort, not guaranteed.

Rail uses the browser side panel API and a conservative fallback mode. The Task 1 feasibility spike recorded Chrome 148 as fallback mode and Edge 149 as direct external URL mode. Chrome uses the extension-hosted fallback panel by default; Edge can use direct external side-panel URLs by default.

Browser extensions such as uBlock Origin, ad blockers, and Tampermonkey-style user scripts can behave differently depending on whether the site is opened directly in a browser context, embedded in fallback mode, or opened in a normal tab. Use Open in Tab when you need the browser's normal extension behavior.

## Fallback Mode

Fallback mode opens an extension-hosted side-panel page with the selected site in an iframe when the URL is valid and frameable. Some sites block iframe embedding with headers such as `X-Frame-Options` or CSP. Rail does not bypass those restrictions.

Fallback mode displays this warning in the UI:

`Some browser extensions may not run in fallback mode. Use Open in Tab for full browser-extension behavior.`

The fallback panel always provides an Open in Tab button for the selected URL.

## Limitations

- Chrome 148 uses fallback mode because the spike could not access direct `chrome.sidePanel.setOptions` support in the service worker context.
- Edge 149 uses direct external side-panel URL mode based on the successful spike result.
- Rail cannot add a permanent native browser-chrome app rail like the retired Edge sidebar; the rail is internal to the extension side panel.
- Browser side-panel width and the native side-panel title bar are controlled by the browser, not by Rail.
- `Ctrl+B` is registered as an extension command to open/show Rail.
- Rail does not request broad host permissions.
- Rail does not include preloaded websites, bookmark import, folders, search, network favicon fetching, sync, or i18n.
- Rail does not use `webview`.
- Rail does not bypass site iframe restrictions.
