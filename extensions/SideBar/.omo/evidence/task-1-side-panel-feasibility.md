# Task 1 Side Panel Feasibility

Status: completed with local Chrome and Edge spike results.

Commands run from `extensions/SideBar`:

```powershell
node spikes/external-side-panel-url/run-side-panel-url-spike.js --browser=chrome
node spikes/external-side-panel-url/run-side-panel-url-spike.js --browser=edge
```

## Chrome

```json
{
  "executable": "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "extensionPath": "B:\\Documents\\Github\\Personals-Projects\\ProjectsHub\\extensions\\SideBar\\spikes\\external-side-panel-url",
  "serviceWorkerUrl": "chrome-extension://fignfifoniblkonapihmkfakmlgkbkcf/service_worker.js",
  "setOptionsResult": "failure",
  "lastError": "TypeError: Cannot read properties of undefined (reading 'setOptions')",
  "directModeDecision": "FALLBACK",
  "source": "cdp",
  "panelOpenAttempted": true,
  "panelOpenResult": "failure",
  "panelOpenLastError": "TypeError: Cannot read properties of undefined (reading 'open')",
  "browser": "chrome",
  "version": "Chrome/148.0.7778.218"
}
```

## Edge

```json
{
  "executable": "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "extensionPath": "B:\\Documents\\Github\\Personals-Projects\\ProjectsHub\\extensions\\SideBar\\spikes\\external-side-panel-url",
  "serviceWorkerUrl": "chrome-extension://lnbenicgglgpljiadjpehonlhgdljffm/service_worker.js",
  "browser": "edge",
  "version": "Edg/149.0.4022.52",
  "setOptionsResult": "success",
  "lastError": null,
  "panelOpenAttempted": true,
  "panelOpenResult": "failure",
  "panelOpenLastError": "`sidePanel.open()` may only be called in response to a user gesture.",
  "directModeDecision": "DIRECT",
  "testedUrl": "https://example.com",
  "timestamp": "2026-06-05T21:32:59.575Z",
  "source": "cdp"
}
```

## Decision rule

- `DIRECT`: direct external side-panel URL mode can be enabled for that browser.
- `FALLBACK`: keep extension-hosted fallback mode for that browser.
- `UNKNOWN_FALLBACK`: keep fallback mode until a conclusive result exists.
