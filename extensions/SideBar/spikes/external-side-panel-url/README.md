# External Side Panel URL Feasibility Spike

Throwaway MV3 spike for testing whether current Chromium browsers accept a direct HTTP/HTTPS URL as a side panel path.

## What it tests

- Calls `chrome.sidePanel.setOptions({ path: "https://example.com", enabled: true })` from an extension service worker.
- Records `chrome.runtime.lastError` exactly as exposed by the browser.
- Attempts panel-opening plumbing separately through `chrome.sidePanel.open()` support fields when triggered.
- Stores structured evidence in `chrome.storage.local.latestResult` for automated collection.

## Run

```powershell
node spikes/external-side-panel-url/run-side-panel-url-spike.js --browser=chrome
node spikes/external-side-panel-url/run-side-panel-url-spike.js --browser=edge
```

Set `CHROME_PATH` or `EDGE_PATH` if the executable is not in the default Windows install locations.

Copy each JSON result into `.omo/evidence/task-1-side-panel-feasibility.md`. Each browser entry must include `browser`, `version`, `setOptionsResult`, `lastError`, `panelOpenAttempted`, and `directModeDecision`. Valid `directModeDecision` values are `DIRECT`, `FALLBACK`, and `UNKNOWN_FALLBACK`.
