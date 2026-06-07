# F3 Real Manual QA Evidence

Verdict: REJECT

Reason: I refreshed real browser-driven QA with the current rail-only/current-tab flow using isolated user-data directories and CDP only. Edge 149 completed the current add/remove/add/open and Open in Tab fallback coverage. Chrome 148 still did not expose a usable Rail extension context from `--load-extension` in an isolated profile, and CDP still cannot invoke the actual browser toolbar extension action. Because the plan requires both Chrome and Edge plus extension-action return-to-list coverage, F3 does not approve.

## Environment and versions

Working directory: `B:\Documents\Github\Personals-Projects\ProjectsHub\extensions\SideBar`

Driver used: `.omo/evidence/f3-cdp-qa-driver.mjs`.

The driver launches the real browser executable with a temporary `--user-data-dir`, `--load-extension`, and `--disable-extensions-except`, then records DOM state, `chrome.storage.local`, CDP target URLs, and browser version data. The driver was updated for the current UI: it opens `https://example.com` as the active browser tab, clicks the rail `+`, removes the selected site from the drawer, adds the active tab again, clicks `Open`, and exercises the fallback `Open in Tab` control.

## Chrome 148 isolated-profile blocker

Command:

```powershell
node ".omo/evidence/f3-cdp-qa-driver.mjs" chrome "C:\Program Files\Google\Chrome\Application\chrome.exe" "B:\Documents\Github\Personals-Projects\ProjectsHub\extensions\SideBar" 9223
```

Browser version:

```text
Chrome/148.0.7778.218
```

Result:

```text
Unable to discover Rail extension ID. Service worker error: timed out waiting for the Rail service worker target. Tried: ekkolbipbkhekfoanmhnlmggcncphejj, aambjbipcblfjeppchclkjefmpmkcgck
```

Observed CDP targets included `https://example.com/`, `about:blank`, and attempted `chrome-extension://.../src/panel.html` pages for path-derived candidate IDs, but not a loaded Rail service worker or a panel page with title `Rail`. Chrome stderr contained DevTools, USB, GCM, and TensorFlow Lite messages, but no Rail manifest error.

Chrome coverage status: BLOCKED before add/remove/open steps because the isolated stable Chrome session did not load the unpacked extension into a usable extension context.

## Edge 149 isolated-profile run

Command:

```powershell
node ".omo/evidence/f3-cdp-qa-driver.mjs" edge "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" "B:\Documents\Github\Personals-Projects\ProjectsHub\extensions\SideBar" 9243
```

Launch evidence:

```text
Browser: Edg/149.0.4022.52
Extension ID: nooihlhfdajjlckegalenchkpchejpfc
Extension discovery source: service-worker-target
Extension service worker target: chrome-extension://nooihlhfdajjlckegalenchkpchejpfc/src/background.js
```

Step results:

1. Initial rail-only editable list:

```json
{
  "href": "chrome-extension://nooihlhfdajjlckegalenchkpchejpfc/src/panel.html",
  "title": "Rail",
  "drawerHidden": true,
  "emptyHidden": false,
  "addCurrentButton": "+",
  "sites": [],
  "storage": {}
}
```

2. Click rail `+` while `https://example.com/` is the active tab:

```json
{
  "activeTab": {
    "url": "https://example.com/",
    "title": "Example Domain"
  },
  "statusText": "Current page added.",
  "drawerHidden": false,
  "selectedTitle": "Example Domain",
  "selectedUrl": "https://example.com",
  "selectedButtons": ["Open", "Remove"],
  "siteList": [
    {
      "url": "https://example.com",
      "title": "Example Domain",
      "iconUrl": "https://example.com/favicon.ico",
      "viewMode": "default"
    }
  ],
  "panelUiSettings": {
    "open": true,
    "pinned": false,
    "width": 360
  }
}
```

3. Remove the selected site:

```json
{
  "statusText": "Site removed.",
  "emptyHidden": false,
  "sites": [],
  "siteList": []
}
```

4. Add the active `https://example.com/` tab again:

```json
{
  "statusText": "Current page added.",
  "drawerHidden": false,
  "selectedTitle": "Example Domain",
  "selectedUrl": "https://example.com",
  "selectedButtons": ["Open", "Remove"],
  "sites": [
    {
      "title": "Example Domain",
      "draggable": true
    }
  ]
}
```

5. Click `Open` for the selected site:

```json
{
  "statusText": "Opening site from the sidebar.",
  "statusTone": "success",
  "targetsIncluded": [
    "chrome-extension://nooihlhfdajjlckegalenchkpchejpfc/src/panel.html?fallbackUrl=https%3A%2F%2Fexample.com&viewMode=mobile",
    "https://example.com/"
  ]
}
```

6. Extension action return-to-rail attempt:

```text
BLOCKED: CDP exposes extension pages/targets but no stable command to click the browser toolbar extension action. The service worker registered chrome.action.onClicked, but this run could not invoke the actual browser action without visual/OS-coordinate interaction.
```

Diagnostic-only reset message result, not counted as extension-action coverage:

```json
{
  "ok": false,
  "message": "`sidePanel.open()` may only be called in response to a user gesture."
}
```

7. Open-in-tab fallback control:

The fallback panel was opened directly at `chrome-extension://nooihlhfdajjlckegalenchkpchejpfc/src/panel.html?fallbackUrl=https%3A%2F%2Fexample.com` to exercise the real fallback UI control.

Before click:

```json
{
  "listHidden": true,
  "fallbackHidden": false,
  "warning": "Some browser extensions may not run in fallback mode. Use Open in Tab for full browser-extension behavior.",
  "message": "If this site does not appear, it may block sidebar embedding. Use Open in Tab instead.",
  "frameSrc": "https://example.com/",
  "openTabDisabled": false
}
```

After click, CDP target list included a normal tab at `https://example.com/`, proving the fallback control reached the tab API.

## Final F3 status

F3 remains rejected because:

- Chrome stable did not load the unpacked Rail extension into a usable isolated-profile extension context in this environment.
- CDP cannot invoke the real browser toolbar extension action, so extension-action return-to-rail remains unproven by agent-executed browser QA.
- Edge real-browser coverage for the current rail-only/current-tab flow is otherwise successful.
