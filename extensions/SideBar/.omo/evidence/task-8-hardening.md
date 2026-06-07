# Task 8 Hardening Evidence

## Result

PASS for automated hardening checks.

## Permission and CSP boundary

- `manifest.json` keeps the permission set to `sidePanel`, `storage`, and `tabs`.
- Source audit found no `<all_urls>` in audited implementation files.
- Source audit found no remote script loading requirement and no inline script requirement added by the extension.

## Navigation validation boundary

- `src/urlValidator.js` remains the central URL normalization and unsafe-scheme rejection boundary.
- `src/navigationStrategy.js` calls validation before side-panel or tab navigation.
- `src/fallbackPanel.js` calls validation before iframe assignment or Open in Tab.
- Tests prove `javascript:`, `file:`, `data:`, `chrome:`, and `chrome-extension:` cannot reach side-panel, iframe, or tab APIs.

## Unsafe construct audit

Source-only checks over `manifest.json`, `src/**`, selected docs, and navigation/fallback tests found:

- No `<all_urls>`.
- No `<webview>` in implementation files.
- No `eval(`.
- No `new Function`.
- No unsafe scheme literals outside validation source in production files.

## Test result

`npm test` passed with 6 suites and 51 tests.

Latest covered behaviors include rail-only UI, current-tab add, rail reorder persistence, selected-site memory without reload, forced extension-hosted fallback navigation from Open, Back to Rail, Alt+B return-to-rail handling, and persisted drawer width.

## Service-worker registration fix

The reported `Identifier 'getRuntimeApi' has already been declared` failure was addressed by wrapping production classic scripts in local IIFEs while preserving their `globalThis.SideBar...` exports. A Node VM duplicate-load check executed the production worker script set twice in one global context and returned:

```json
{"ok":true,"hasBrowserApi":true,"hasBackground":true}
```

## Remaining final verification note

The mandatory final F1-F4 review wave remains intentionally unchecked until review agents complete and the user gives explicit approval, per `.omo/plans/sidebar-extension.md`.
