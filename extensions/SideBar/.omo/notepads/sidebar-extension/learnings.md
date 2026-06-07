# Learnings

## 2026-06-04 extension pattern scan

### Files reviewed
- `extensions/AnimeFLVEnhancements/manifest.json`
- `extensions/AnimeFLVEnhancements/content.js`
- `extensions/SideBar/spikes/external-side-panel-url/manifest.json`
- `extensions/SideBar/spikes/external-side-panel-url/service_worker.js`
- `extensions/SideBar/spikes/external-side-panel-url/opener.html`
- `extensions/SideBar/spikes/external-side-panel-url/opener.js`
- `extensions/SideBar/spikes/external-side-panel-url/fallback.html`
- `extensions/SideBar/spikes/external-side-panel-url/README.md`

### Reusable findings
- `extensions/AnimeFLVEnhancements/manifest.json` is a clean MV3 content-script pattern: `manifest_version: 3`, `content_scripts`, `storage` + `clipboardWrite`, no `background`, no `popup`, no `sidePanel`.
- `extensions/AnimeFLVEnhancements/content.js` uses `chrome.storage.local.set/get` to persist UI state (`selectedOption`) and has no `tabs` or `sidePanel` usage.
- `extensions/SideBar/spikes/external-side-panel-url/manifest.json` is the only SideBar-side MV3 scaffold found: `sidePanel`, `storage`, and `tabs` permissions, `background.service_worker`, and `side_panel.default_path` fallback page.
- `extensions/SideBar/spikes/external-side-panel-url/service_worker.js` is the key navigation/reference pattern: `chrome.sidePanel.setOptions()`, `chrome.sidePanel.open()`, `chrome.tabs.query({ active: true, currentWindow: true })`, and `chrome.storage.local.set/get` for result capture.
- `extensions/SideBar/spikes/external-side-panel-url/opener.html` + `opener.js` provide a minimal manual trigger page that sends runtime messages to the service worker.
- No `popup` / `default_popup` pattern was found anywhere under `extensions/` during this scan.
- `extensions/AnimeFLVEnhancements/manifest.json` also references `styles.css` and `icon.png` as the only non-code extension assets; there is still no `action.default_popup`, `background`, or `sidePanel` wiring in that extension.

### Task relevance
- Useful for Task 2 scaffold decisions: follow the MV3 service-worker + `side_panel.default_path` structure from the spike, not a popup scaffold.
- Useful for Task 4 navigation adapter work: `chrome.tabs.query` + `chrome.sidePanel.open()` is the reusable navigation shape.

## Chrome extension API patterns found

- `extensions/SideBar/spikes/external-side-panel-url/manifest.json`: MV3 spike manifest uses only `sidePanel`, `storage`, and `tabs` permissions, plus a `side_panel.default_path` fallback page. Good minimal-permissions reference for Tasks 2/4/6/8.
- `extensions/SideBar/spikes/external-side-panel-url/service_worker.js`: concrete `chrome.sidePanel.setOptions(...)` and `chrome.sidePanel.open(...)` wrappers, `chrome.runtime.lastError` capture, `chrome.tabs.query(...)` for window targeting, `chrome.runtime.onInstalled/onStartup/onMessage`, and `chrome.storage.local` result persistence. Useful pattern: wrap callback APIs in Promises and persist capability results for later UI decisions.
- `extensions/SideBar/spikes/external-side-panel-url/opener.js`: simple `chrome.runtime.sendMessage({ type: ... })` bridge from UI to worker. Good example of a tiny message surface for open-panel / run-set-options actions.
- `extensions/SideBar/spikes/external-side-panel-url/fallback.html`: explicit extension-hosted fallback page. Useful as the safe default when direct external side-panel URLs are unavailable.
- `extensions/SideBar/spikes/external-side-panel-url/run-side-panel-url-spike.js`: runner reads back `chrome.storage.local.get("latestResult")` from the service worker after the probe. Good example of capturing structured evidence for feasibility checks.
- `extensions/AnimeFLVEnhancements/content.js`: `chrome.storage.local` is used for one setting key, with hydration + persistence, selector fallback arrays, retry loops, and graceful UI fallback behavior. Good adjacent pattern for storage state, retries, and fallback UX.
- `extensions/AnimeFLVEnhancements/manifest.json`: minimal MV3 manifest only requests `storage` and `clipboardWrite`; no side-panel or tabs permissions. Useful anti-example for keeping permissions tight.

## Pitfalls / anti-patterns

- No production extension code in this workspace currently uses `chrome.tabs.create` or `chrome.sidePanel` outside the SideBar spike; the real implementation still needs to be built from the spike patterns.
- Avoid broad permissions or `<all_urls>`; the spike and plan both lean on a narrow permission set.
- Fallback UX should be explicit: the spike uses a local fallback page rather than silently failing when direct side-panel URL behavior is unsupported.

## 2026-06-04 - Browser feasibility spike: `chrome.sidePanel`, direct URLs, and extension/web-content limits

### Official docs and Chromium sources gathered

- Chrome Side Panel API reference: https://developer.chrome.com/docs/extensions/reference/api/sidePanel
  - Availability: Chrome 114+ and MV3.
  - Public docs still state `side_panel.default_path` should be a relative path in the extension directory and `PanelOptions.path` "must be a local resource within the extension package."
  - `sidePanel.open()` is Chrome 116+ and must be called in response to a user action.
  - Later API caveats: `getLayout()`/`Side` are Chrome 140+, `close()` is Chrome 141+ with behavior changed in Chrome 145, `onOpened` is Chrome 141+, and `onClosed` is Chrome 142+.
- Chrome "Create a side panel" docs: https://developer.chrome.com/docs/extensions/develop/ui/create-a-side-panel
  - Describes the Side Panel API as an extension-owned UI surface; webview is not part of this model.
- Microsoft Edge sidebar docs: https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/sidebar
  - Edge uses Chrome-compatible `sidePanel`/`side_panel` names but calls the surface "sidebar."
  - Edge states the sidebar page is a trusted extension context on `extension://<id>` and has the same supported extension API access as other trusted extension contexts.
  - Edge known issue: the sidebar is not automatically displayed again when switching back to a tab where it was previously open (MicrosoftEdge-Extensions issue #142, linked from the docs).
- Microsoft Edge supported extension APIs: https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/api-support
  - Lists `sidePanel` as MV3-supported on Windows, Linux, and Mac.
- Chromium side panel service source: https://chromium.googlesource.com/chromium/src/+/main/chrome/browser/extensions/api/side_panel/side_panel_service.cc
  - Stores/merges `PanelOptions.path` and `enabled`, falls back from tab-specific options to defaults/manifest options, and checks a panel is active when `enabled` and `path` are present.
- Chromium M138 external-URL fix commit: https://chromium.googlesource.com/chromium/src/+/c3b7cc5958b615aa53c7c0019fcfcbc18f05af09
  - Commit title: `[M138] Extensions: Fix side panel external URL loading`.
  - Commit message says validation from crrev.com/1460397 regressed loading external HTTP/HTTPS URLs, and this CL fixes side panels loading external HTTP/HTTPS URLs plus initial non-extension URL creation.
  - Review URL from commit metadata: https://chromium-review.googlesource.com/c/chromium/src/+/6714665 and cherry-pick review https://chromium-review.googlesource.com/c/chromium/src/+/6730217.
- Chromium source evidence from the M138 change (search result excerpt): `extension_side_panel_coordinator.cc` adds `GetSidePanelURL()` where a side panel URL can be either an external HTTP/HTTPS URL or an extension URL; otherwise it resolves the path through `extension.GetResourceURL(*options.path)`.
- Chrome content scripts docs: https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
  - Content scripts run in the context of web pages, can modify DOM, are isolated from page/other extension worlds, and can be injected into matching frames with `all_frames` / `allFrames`.
- Chrome content filtering docs: https://developer.chrome.com/docs/extensions/develop/concepts/content-filtering
  - Network filtering is primarily via `chrome.declarativeNetRequest`; element hiding uses content scripts. Policy-installed extensions are the special case for blocking `webRequest` content filters.
- Chrome declarativeNetRequest API docs: https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest
  - DNR can block, upgrade, redirect, and modify headers; examples include `main_frame` and `sub_frame`. Rule limits and MV3 behavior mean this is not equivalent to promising full uBlock Origin behavior.

### Feasibility findings

- Chrome baseline: extension-hosted side panels are officially supported from Chrome 114+ MV3. Public docs still describe `path` as an extension-local HTML resource, so Task 1 should treat extension-hosted `sidepanel.html` as the documented stable baseline.
- Direct HTTP/HTTPS side-panel URLs: Chromium M138 source explicitly fixes external HTTP/HTTPS side-panel URL loading. Because the current public Chrome docs still say local extension resource, direct URL support must be recorded as version-dependent implementation behavior and verified in the actual target Chrome/Chromium build before relying on it.
- Edge behavior: Edge documents the same `sidePanel` API names and trusted `extension://<id>` sidebar context, with `sidePanel` supported for MV3 on desktop. Edge docs do not independently document direct HTTP/HTTPS `path` support; treat direct URLs as unverified on Edge until tested in the Task 1 matrix.
- Extension-hosted vs direct web content: an extension-hosted panel has extension API access and can coordinate tabs, DNR, scripting, storage, etc. Direct web content loaded as the panel should not be assumed to have extension APIs or extension privileges; plan message-passing/adapter behavior around the extension-hosted baseline.
- Direct side-panel URL vs iframe fallback compatibility: preferred stable path is `sidepanel.html` with an internal navigation adapter. Direct HTTP/HTTPS panel URL may work in Chrome/Chromium M138+ but needs runtime/browser-version probing. Iframe fallback can keep the top-level panel extension-hosted, but embedded sites may fail to frame because of normal web `X-Frame-Options`/CSP `frame-ancestors`, and scripts/filtering only apply where extension permissions and frame matching allow it.
- uBlock Origin-style behavior: do not promise full compatibility. MV3 supports DNR-based request blocking/modification and content-script element hiding, including frame resource types such as `main_frame`/`sub_frame`, but rule limits, permissions, service-worker interactions, and vendor behavior make it best-effort.
- Tampermonkey-style behavior: do not promise automatic script behavior inside every side-panel web page. Content-script/user-script behavior depends on host permissions, URL/frame matching, `all_frames`/`match_origin_as_fallback` where relevant, execution world, and whether the target is direct web content, an iframe, or an extension page.

### Task 1 compatibility matrix fields to capture

- Browser/channel/version and Chromium milestone.
- `chrome.sidePanel` availability and MV3 requirement.
- Extension-local `side_panel.default_path` result.
- `chrome.sidePanel.setOptions({ path: "https://..." })` result, including load success/failure and console/runtime error text.
- Extension-hosted iframe fallback result, including frame-blocking headers/CSP failures.
- Whether DNR rules affect panel/direct/iframe requests as expected for `main_frame` and `sub_frame`.
- Whether content scripts/user scripts inject into target web content and frames under declared host permissions.

## 2026-06-04 Task 2 scaffold findings

### Files created
- `manifest.json`
- `package.json`
- `package-lock.json`
- `src/background.js`
- `src/panel.html`
- `src/panel.js`
- `src/styles.css`
- `src/constants.js`
- `src/browserApi.js`
- `tests/jest.config.js`
- `tests/setup.js`
- `tests/__mocks__/chrome.js`
- `tests/smoke.test.js`

### Verification results
- `npm install` completed successfully in `extensions/SideBar`.
- `npm test` passed with the initial empty-site-list smoke test.
- The production manifest stayed narrow with only `sidePanel`, `storage`, and `tabs` permissions.
- No source or test file added Spanish UI text or extra frameworks.

### Scaffold notes
- The panel uses an extension-hosted fallback path at `src/panel.html`.
- `src/constants.js` exports the empty initial site list contract for later storage work.
- `src/browserApi.js` is a thin helper layer so later tasks can add behavior without changing the scaffold shape.

## 2026-06-05 Task 3 storage and validation findings

- `src/urlValidator.js` now normalizes parseable hostnames to `https://...` and rejects empty input plus unsafe or malformed schemes before persistence.
- `src/siteStore.js` persists the site list in `chrome.storage.local` under `STORAGE_KEYS.siteList` with stable `{ id, url, title, createdAt, updatedAt }` records and duplicate URL rejection after normalization.
- The Jest mock in `tests/__mocks__/chrome.js` keeps an in-memory storage snapshot so add/remove/list flows exercise real persistence behavior across calls.

## 2026-06-05 Task 4 navigation adapter findings

- `src/navigationStrategy.js` keeps direct external side-panel URLs disabled by default via `SIDE_PANEL_CAPABILITY.directUrlEnabled: false`; callers can opt in after manual Chrome/Edge evidence arrives.
- All side-panel and tab navigation flows normalize through `src/urlValidator.js`, so only validated `http`/`https` URLs reach `chrome.sidePanel.setOptions` or `chrome.tabs.create`.
- Unknown browsers always fall back to the extension-hosted `src/panel.html`; Edge is detected from `Edg`, and Chrome/Chromium only when `Edg` is absent.
- Direct side-panel `setOptions` failures return a deterministic English failure state with `nextAction: "open-in-tab"` instead of silently opening another surface.
- Extension action clicks reset the side panel to `src/panel.html` and open it, preserving access to the editable list after direct-mode navigation.

## 2026-06-05 Task 5 panel UI findings

- `src/panel.html` now loads `urlValidator.js`, `siteStore.js`, and `navigationStrategy.js` before `panel.js` so the browser UI can use the storage and navigation contracts.
- `src/panel.js` exposes `createPanelApp()` for Jest/jsdom and initializes automatically in the extension page when CommonJS is unavailable.
- Panel tests use plain DOM events and the real `siteStore` with the in-memory Chrome mock; no Testing Library or UI framework was added.

## 2026-06-05 Task 6 fallback UX findings

- `src/navigationStrategy.js` now routes fallback navigation to `src/panel.html?fallbackUrl=...`, preserving the validated URL for the extension-hosted fallback view.
- `src/fallbackPanel.js` owns fallback-mode rendering, iframe assignment, iframe failure messaging, and the Open in Tab escape hatch.
- Fallback UI uses the exact required warning: `Some browser extensions may not run in fallback mode. Use Open in Tab for full browser-extension behavior.`
- Invalid fallback query URLs are rejected before iframe assignment or tab opening.

## 2026-06-05 Task 7 and 8 findings

- `README.md` and `compatibility-matrix.md` were created in English with conservative pending Chrome/Edge direct-mode language because Task 1 manual feasibility evidence is still unavailable.
- Documentation includes `Best effort, not guaranteed` and avoids prohibited guarantee language.
- Hardening added regression coverage proving `javascript:`, `file:`, `data:`, `chrome:`, and `chrome-extension:` cannot reach side-panel, iframe, or tab APIs.
- Full Jest/jsdom suite passes with 6 suites and 32 tests.

## 2026-06-05 runner fix note

- `spikes/external-side-panel-url/run-side-panel-url-spike.js` now collects Task 1 evidence directly from the extension service worker with `runSetOptionsSpike("cdp")` and `runPanelOpenSpike("cdp")`, so the runner no longer depends on `opener.html` or a page button click.

## 2026-06-05 production service worker redeclaration fix

- The production MV3 worker failed with `Identifier 'getRuntimeApi' has already been declared` because classic scripts loaded by `importScripts()` share one worker global lexical scope.
- Production JavaScript files now wrap declarations in local IIFEs while preserving their CommonJS exports and `globalThis.SideBar...` browser globals.
- A Node VM duplicate-load check executed the production worker script set twice in one global context and confirmed `SideBarBrowserApi` and `SideBarBackground` initialize without redeclaration.
- Edge isolated-profile loading found the production `src/background.js` service worker registered after the scoping fix; Chrome CLI probing was noisy because local command-line loading exposed the nested spike extension target, but direct duplicate-load simulation covers the reported syntax error path.

## 2026-06-05 Task 1 captured browser results

- Chrome `Chrome/148.0.7778.218` spike result: `setOptionsResult: failure`, `lastError: TypeError: Cannot read properties of undefined (reading 'setOptions')`, `directModeDecision: FALLBACK`.
- Edge `Edg/149.0.4022.52` spike result: `setOptionsResult: success`, `lastError: null`, `directModeDecision: DIRECT`.
- `SIDE_PANEL_CAPABILITY.directUrlByBrowser` now records Chrome fallback mode and Edge direct mode.

## 2026-06-05 Edge sidebar screenshot scope clarification

- The screenshots show Edge's native browser-chrome right app rail plus a website panel; MV3 extensions can use `chrome.sidePanel` for the website panel surface but cannot create that browser-chrome rail.
- `src/background.js` now calls `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })` so the extension action behaves as closely as the API allows.

## 2026-06-05 Chrome worker binding fix note

- `spikes/external-side-panel-url/run-side-panel-url-spike.js` now waits for the worker probes to become available and invokes them through a self-contained CDP expression that falls back across `globalThis`, `self`, and the bare service-worker binding, which avoids the Chrome-only `globalThis.runSetOptionsSpike is not a function` failure.

## 2026-06-05 current-tab capture and display preferences

- The panel now has a bottom `+` button that saves the active tab URL, title, and browser-provided favicon through the existing `tabs` permission.
- Saved site records include `iconUrl` and per-site `viewMode`; settings include `globalViewMode`, which defaults to `mobile`.
- Per-site `default` view mode resolves through the global setting. A site override of `mobile` or `desktop` wins over the global setting.
- Fallback navigation carries `viewMode` in the panel query string. Mobile constrains the fallback iframe width; Desktop uses the full panel width.
- URL normalization now treats `localhost:3000/path` as a host:port input and normalizes it to `https://localhost:3000/path` instead of misclassifying `localhost:` as a URL scheme.

## 2026-06-05 rail-only UI corrections

- The rail UI no longer exposes a manual URL form; sites are added from the active tab with the bottom `+` button.
- Saved rail icons can be reordered by drag/drop, and the persisted site list order is updated in `chrome.storage.local`.
- Rail icon clicks select/open the drawer without navigating, so they do not reload the current website. The selected site's `Open` button is the navigation trigger.
- The fallback website view now includes a Back to Rail button. `Alt+B` is registered as a return-to-rail command and is handled inside extension pages, but browser/page/iframe shortcut handling can take precedence.
- The side panel's native width cannot be reduced by MV3 code. To avoid the white unused area next to the rail, `html`, `body`, and the panel root now paint the full side-panel viewport dark while the rail remains right-aligned.
