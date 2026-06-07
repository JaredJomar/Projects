# Issues

## 2026-06-05 Task: 1 Browser side-panel URL feasibility spike
Resolved by local spike runs: Chrome 148 is fallback mode and Edge 149 is direct mode. Compatibility language remains `Best effort, not guaranteed`.

## 2026-06-06 13:51:53 -04:00 F4 Scope Fidelity Check

Verdict: REJECT due to one scope violation: `src/siteStore.js` synthesizes a network favicon URL with `buildBrowserFaviconUrl(siteUrl)` and stores it when `siteInput.iconUrl` is missing (`iconUrl: normalizeIconUrl(siteInput.iconUrl) || buildBrowserFaviconUrl(normalizedUrl)`). This conflicts with the plan guardrail `No ... favicon fetching` and the README limitation claiming Rail does not include `network favicon fetching`. The final rail scope allows favicon rail icons from the active tab (`favIconUrl`) when available, but not fallback network fetching of `/favicon.ico`.

Concrete remediation: remove the synthesized `/favicon.ico` fallback, persist only validated browser-provided active-tab favicon URLs when present, render the existing letter fallback when no favicon is available, and update tests that currently expect `https://example.com/favicon.ico` for sites added without an explicit favicon.

## 2026-06-06 13:58:00 -04:00 F4 remediation implemented

`src/siteStore.js` now stores `iconUrl` only from `normalizeIconUrl(siteInput.iconUrl)` and no longer synthesizes `/<origin>/favicon.ico`. The Jest coverage was updated so missing or unsafe icon URLs stay empty, stored sites without an icon render the letter fallback, and active-tab `favIconUrl` remains supported.
