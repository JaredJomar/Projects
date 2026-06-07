# Rail Compatibility Matrix

Best effort, not guaranteed.

Task 1 feasibility results are captured for local Chrome and Edge builds. The implementation stores a per-browser capability map: Chrome uses fallback mode by default, and Edge uses direct external side-panel URL mode by default.

Saved sites default to Mobile view unless the user changes the global preference or overrides a specific site. In fallback mode, Mobile uses a constrained iframe width and Desktop uses the full panel width. This is a display preference, not a guarantee that a site will serve a different responsive layout.

The Edge-like app rail is implemented as an internal rail inside the extension side panel. MV3 extensions cannot draw into or control the native Edge/Chrome browser-chrome rail shown in the retired sidebar screenshots.

| Browser | Direct side-panel URL | Iframe fallback support | uBlock network filtering expectation | uBlock cosmetic filtering expectation | Tampermonkey script expectation | Open-in-tab fallback status |
| --- | --- | --- | --- | --- | --- | --- |
| Chrome 148.0.7778.218 | Fallback. Spike result: `setOptionsResult: failure`, `lastError: TypeError: Cannot read properties of undefined (reading 'setOptions')`. | Available for valid `http`/`https` URLs when the site allows iframe embedding. | Best effort, not guaranteed; behavior may differ in fallback mode. | Best effort, not guaranteed; behavior may differ in fallback mode. | Best effort, not guaranteed; behavior may differ in fallback mode. | Available through `chrome.tabs.create` after URL validation. |
| Edge 149.0.4022.52 | Direct. Spike result: `setOptionsResult: success`, `lastError: null`. | Available as fallback for valid `http`/`https` URLs when the site allows iframe embedding. | Best effort, not guaranteed; direct mode is expected to behave closer to a normal browser page than iframe fallback, but extension behavior is still conditional. | Best effort, not guaranteed; direct mode is expected to behave closer to a normal browser page than iframe fallback, but extension behavior is still conditional. | Best effort, not guaranteed; direct mode is expected to behave closer to a normal browser page than iframe fallback, but extension behavior is still conditional. | Available through `chrome.tabs.create` after URL validation. |

## Notes

- Fallback mode does not bypass `X-Frame-Options`, CSP, or same-origin restrictions.
- Unsafe schemes such as `javascript:`, `file:`, `data:`, `chrome:`, and `chrome-extension:` are rejected before side-panel, iframe, or tab navigation.
- Open in Tab is the recommended path when browser extension behavior is important.
- MV3 extensions cannot add the native Edge browser-chrome app rail shown in the retired sidebar UI; Rail approximates it with an internal side-panel rail rendered by `src/panel.html` and `src/styles.css`.
- Browser side-panel width and the native side-panel title bar are controlled by the browser and cannot be removed by Rail.
- The current-tab `+` action uses the existing `tabs` permission to read the active tab URL, title, and browser-provided favicon; no broad host permissions are requested. Saved rail order, selected site, pin state, and internal drawer width are persisted in `chrome.storage.local`.
- `Ctrl+B` is registered as an extension command to open/show Rail.
