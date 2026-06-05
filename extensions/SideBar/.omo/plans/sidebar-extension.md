# SideBar Browser Extension

## TL;DR
> **Summary**: Build a fresh vanilla MV3 Chrome/Edge extension that provides an editable website sidebar with English UI and best-effort compatibility for other browser extensions. The first implementation task verifies whether direct HTTP/HTTPS side-panel URLs work in current Chrome and Edge; fallback behavior is predefined if they do not.
> **Deliverables**:
> - MV3 extension scaffold in `extensions/SideBar`
> - Editable empty-start website list
> - Side-panel navigation strategy with direct URL capability detection and fallback UX
> - Jest/jsdom unit test baseline
> - Compatibility matrix for Chrome/Edge, uBlock-style filtering, and Tampermonkey-style scripts
> **Effort**: Medium
> **Parallel**: YES - 7 waves with limited parallelism after scaffold
> **Critical Path**: Task 1 → Task 2 → Tasks 3/4 → Task 5 → Task 6 → Task 7 → Task 8 → Final Verification

## Context
### Original Request
The user wants a browser extension for a quick website sidebar like the Microsoft Edge sidebar feature that was removed. The user specifically wants websites opened in the sidebar to benefit from installed browser extensions such as uBlock Origin/adblocker and Tampermonkey scripts where possible, because the removed Edge sidebar showed ads and did not run scripts.

### Interview Summary
- Target browsers: latest stable Edge + Chrome first.
- UX: real sidebar-style quick website access without splitting the screen.
- Website list: editable and starts empty.
- Language: all code, comments, developer-facing docs, commit messages, and visible extension UI copy in English.
- Compatibility requirement: best-effort support for existing browser extensions; do not guarantee uBlock/Tampermonkey behavior.
- Accepted tradeoff: if a true sidebar has compatibility limits, still ship a sidebar with explicit fallback and messaging.
- Test strategy: Jest/jsdom only; no Playwright or browser E2E framework in v1.

### Metis Review (gaps addressed)
- Added mandatory first task: Chrome + Edge feasibility spike for direct HTTP/HTTPS side-panel URLs.
- Compatibility is treated as best-effort and captured in a matrix instead of promised.
- Unsafe URL schemes are rejected; only `http` and `https` are accepted.
- Unsupported sites get a clear failure message and an open-in-tab escape hatch.
- Scope guardrails exclude preloaded sites, bookmark-manager features, i18n, Firefox support, Playwright, and build-system overengineering.

## Work Objectives
### Core Objective
Create a minimal, maintainable Chrome/Edge MV3 extension that opens user-managed websites from a side panel and clearly handles browser/website limitations.

### Deliverables
- `manifest.json` MV3 extension.
- Vanilla JavaScript source modules for storage, validation, UI state, and navigation.
- English side-panel UI with empty state, add URL, remove URL, select/open URL, and open-in-tab fallback.
- npm + Jest/jsdom test setup.
- Compatibility evidence under `.omo/evidence/` and an English compatibility matrix in the project.

### Definition of Done (verifiable conditions with commands)
- `npm install` completes inside `extensions/SideBar`.
- `npm test` passes inside `extensions/SideBar`.
- `manifest.json` contains `manifest_version: 3` and only the permissions required for storage, side panel, and tabs fallback.
- Initial storage state returns an empty list.
- Invalid schemes (`javascript:`, `file:`, `chrome:`, malformed values) are rejected by tests.
- Adding and removing `https://example.com` passes persistence tests.
- Selecting a stored site calls the navigation strategy with the expected URL.
- Compatibility matrix exists and states direct side-panel, fallback, uBlock network filtering, uBlock cosmetic filtering, and Tampermonkey script behavior for Chrome and Edge.

### Must Have
- Vanilla MV3 extension; no framework.
- npm package with Jest/jsdom only.
- English code comments and UI copy.
- Empty initial site list.
- URL validation for `http`/`https` only.
- Explicit fallback UX for unsupported sites.
- Best-effort extension compatibility language.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- No guaranteed claim that uBlock Origin, cosmetic filtering, or Tampermonkey always works.
- No Playwright, Cypress, Selenium, or browser E2E framework.
- No preconfigured websites.
- No bookmark folders, import/export, favicon fetching, search, drag/drop, sync, or i18n in v1.
- No Firefox support in v1.
- No `webview` solution.
- No broad host permissions like `<all_urls>` in v1.
- No comments or documentation in Spanish inside source files or technical docs.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: Jest/jsdom only; browser side-panel behavior is validated by an agent-executed feasibility spike and evidence matrix, not Playwright.
- QA policy: Every task has agent-executed scenarios.
- Evidence: `.omo/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: Task 1 (browser feasibility spike)
Wave 2: Task 2 (project scaffold and shared contracts)
Wave 3: Tasks 3, 4 (storage/validation and navigation strategy can proceed from scaffold + feasibility)
Wave 4: Task 5 (panel UI after storage contract is implemented)
Wave 5: Task 6 (fallback UX after UI and navigation exist)
Wave 6: Task 7 (documentation after feasibility/fallback decisions are concrete)
Wave 7: Task 8 (hardening after implementation and docs are complete)

### Dependency Matrix (full, all tasks)
| Task | Blocks | Blocked By |
| --- | --- | --- |
| 1 | 2, 4, 6, 7 | None |
| 2 | 3, 4, 5, 8 | 1 |
| 3 | 5, 6, 8 | 2 |
| 4 | 6, 7, 8 | 1, 2 |
| 5 | 6, 8 | 2, 3 |
| 6 | 7, 8 | 3, 4, 5 |
| 7 | 8 | 1, 4, 6 |
| 8 | Final Verification | 2, 3, 4, 5, 6, 7 |

### Agent Dispatch Summary (wave → task count → categories)
| Wave | Task Count | Categories |
| --- | ---: | --- |
| 1 | 1 | `unspecified-high` |
| 2 | 1 | `unspecified-low` |
| 3 | 2 | `unspecified-low`, `unspecified-high` |
| 4 | 1 | `visual-engineering` |
| 5 | 1 | `unspecified-high` |
| 6 | 1 | `writing` |
| 7 | 1 | `unspecified-high` |

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [~] 1. Browser side-panel URL feasibility spike

  **What to do**: Create a minimal throwaway spike under `spikes/external-side-panel-url/` with an MV3 manifest, service worker, and side-panel trigger that attempts to set the side panel to `https://example.com`. Run the spike in latest stable Chrome and Edge with isolated user-data directories. The spike must log an agent-capturable JSON artifact for each browser containing `browser`, `version`, `setOptionsResult`, `lastError`, `panelOpenAttempted`, and `directModeDecision`; visual judgment is not allowed as the primary result. Record results in `.omo/evidence/task-1-side-panel-feasibility.md` and create/update `compatibility-matrix.md` with these exact outcomes: direct URL support, iframe fallback support, uBlock network filtering expectation, uBlock cosmetic filtering expectation, Tampermonkey script expectation, and open-in-tab fallback status. Branch rule: if direct external URL works in both browsers, mark direct mode as default; if it works in only one browser, store a per-browser capability map; if it works in neither, set fallback mode as default and document degraded extension compatibility.
  **Must NOT do**: Do not claim uBlock/Tampermonkey compatibility without evidence. Do not add Playwright. Do not use `webview`. Do not modify production extension files beyond the compatibility matrix and evidence.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: browser API behavior is version-sensitive and affects architecture.
  - Skills: [] - No specialized skill required.
  - Omitted: [`security-research`] - Not a vulnerability audit.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2, 4, 6, 7 | Blocked By: None

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `extensions/AnimeFLVEnhancements/manifest.json:1-29` - nearby MV3 manifest style and minimal unpacked extension structure.
  - External: `https://developer.chrome.com/docs/extensions/reference/api/sidePanel` - official sidePanel API reference.
  - External: `https://github.com/chromium/chromium/blob/d37257ad57ddf3a4a8cc4c5efc482911a85f39ed/chrome/browser/ui/views/side_panel/extensions/extension_side_panel_coordinator.cc#L46-L49` - Chromium source noting external HTTP/HTTPS side-panel URL support.
  - External: `https://github.com/chromium/chromium/blob/d37257ad57ddf3a4a8cc4c5efc482911a85f39ed/chrome/browser/ui/views/side_panel/extensions/extension_side_panel_browsertest.cc#L679-L703` - Chromium browser test for external side-panel URL behavior.
  - External: `https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options` - iframe fallback limitation reference.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `.omo/evidence/task-1-side-panel-feasibility.md` exists and contains separate Chrome and Edge results with fields `browser`, `version`, `setOptionsResult`, `lastError`, `panelOpenAttempted`, and `directModeDecision`.
  - [ ] `compatibility-matrix.md` exists and contains rows for direct side-panel URL, iframe fallback, uBlock network filtering, uBlock cosmetic filtering, Tampermonkey scripts, and open-in-tab fallback.
  - [ ] The matrix explicitly says `Best effort, not guaranteed` for extension compatibility.
  - [ ] If direct URL fails in either browser, the matrix identifies the fallback mode for that browser.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Direct URL spike recorded
    Tool: Bash
    Steps: Launch Chrome and Edge with isolated user data dirs and the spike extension; attempt to open https://example.com through chrome.sidePanel; write structured result fields browser, version, setOptionsResult, lastError, panelOpenAttempted, and directModeDecision to .omo/evidence/task-1-side-panel-feasibility.md.
    Expected: Evidence file contains Chrome and Edge entries; each entry has directModeDecision equal to DIRECT, FALLBACK, or UNKNOWN_FALLBACK with error details when not DIRECT.
    Evidence: .omo/evidence/task-1-side-panel-feasibility.md

  Scenario: Compatibility is not overpromised
    Tool: Bash
    Steps: Search compatibility-matrix.md for prohibited guarantee language such as "always works", "guaranteed compatibility", or "Tampermonkey always runs" while allowing the exact phrase "Best effort, not guaranteed".
    Expected: Prohibited guarantee language is absent; the phrase "Best effort, not guaranteed" appears.
    Evidence: .omo/evidence/task-1-side-panel-feasibility-language.txt
  ```

  **Commit**: YES | Message: `chore(spike): verify side panel external url support` | Files: [`spikes/external-side-panel-url/**`, `compatibility-matrix.md`]

- [x] 2. MV3 project scaffold and Jest baseline

  **What to do**: Create the production extension scaffold with `manifest.json`, `package.json`, `src/background.js`, `src/panel.html`, `src/panel.js`, `src/styles.css`, `src/constants.js`, `src/browserApi.js`, `tests/jest.config.js`, `tests/setup.js`, and `tests/__mocks__/chrome.js`. Use vanilla JavaScript and npm. Manifest must use MV3, `chrome.sidePanel`, storage, and tabs fallback permissions only. Add `npm test` script and one smoke test that imports constants and verifies the empty initial state contract.
  **Must NOT do**: Do not introduce Vite, Webpack, TypeScript, React, Vue, ESLint, Prettier, or broad host permissions. Do not prepopulate websites.

  **Recommended Agent Profile**:
  - Category: `unspecified-low` - Reason: straightforward scaffold using existing plain-extension conventions.
  - Skills: [] - No specialized skill required.
  - Omitted: [`security-research`] - Permissions are reviewed later, not a full audit.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 3, 4, 5, 8 | Blocked By: 1

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `extensions/AnimeFLVEnhancements/manifest.json:1-29` - MV3 manifest structure.
  - Pattern: `extensions/AnimeFLVEnhancements/content.js:1-31` - constants-first vanilla JS style.
  - Test: `TampermonkeyProjects/Youtube/YouTube Enchantments/tests/package.json:6-28` - npm/Jest dependency and script pattern.
  - Test: `TampermonkeyProjects/Youtube/YouTube Enchantments/tests/jest.config.js:1-53` - jsdom Jest configuration pattern.
  - External: `https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions` - permission guidance.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `manifest.json` has `manifest_version` equal to `3`.
  - [ ] `package.json` has a `test` script that runs Jest.
  - [ ] `npm install` completes in `extensions/SideBar`.
  - [ ] `npm test` passes with at least one smoke test.
  - [ ] No production file contains Spanish comments or UI strings.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Scaffold test baseline
    Tool: Bash
    Steps: Run npm install, then npm test from extensions/SideBar.
    Expected: Jest exits with code 0 and reports the smoke test passing.
    Evidence: .omo/evidence/task-2-jest-baseline.txt

  Scenario: Minimal permissions
    Tool: Bash
    Steps: Parse manifest.json and list permissions.
    Expected: Permissions include only storage/sidePanel/tabs or documented equivalents needed for fallback; no <all_urls> host permission exists.
    Evidence: .omo/evidence/task-2-manifest-permissions.json
  ```

  **Commit**: YES | Message: `chore(sidebar): scaffold mv3 extension` | Files: [`manifest.json`, `package.json`, `package-lock.json`, `src/**`, `tests/**`]

- [x] 3. URL validation and site storage module

  **What to do**: Implement `src/urlValidator.js` and `src/siteStore.js`. Accept only `http` and `https` URLs. Normalize missing protocol by converting `example.com` to `https://example.com` only when the value can be parsed as a hostname; reject `javascript:`, `file:`, `chrome:`, `chrome-extension:`, `data:`, empty strings, malformed URLs, and duplicates. Store sites in `chrome.storage.local` under one constant key with stable object shape `{ id, url, title, createdAt, updatedAt }`. Add Jest tests for empty initial state, add, remove, duplicate rejection, malformed input, missing protocol normalization, and storage error handling.
  **Must NOT do**: Do not fetch favicons. Do not add folders, tags, import/export, sync storage, or bookmarks API.

  **Recommended Agent Profile**:
  - Category: `unspecified-low` - Reason: deterministic data validation and storage logic.
  - Skills: [] - No specialized skill required.
  - Omitted: [`security-research`] - Security-sensitive cases are covered by validation tests and final review.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 5, 6, 8 | Blocked By: 2

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `extensions/AnimeFLVEnhancements/content.js:21-23` - storage key constants pattern.
  - Pattern: `extensions/AnimeFLVEnhancements/content.js:123-125` - `chrome.storage.local.set` usage pattern.
  - Test: `TampermonkeyProjects/Youtube/YouTube Enchantments/tests/__tests__/settings.test.js:37-67` - empty/corrupted settings test style.
  - External: `https://developer.chrome.com/docs/extensions/reference/api/storage` - Chrome storage API.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `npm test -- --runTestsByPath tests/urlValidator.test.js tests/siteStore.test.js` passes.
  - [ ] Empty storage returns `[]`.
  - [ ] Adding `https://example.com` persists exactly one site.
  - [ ] Adding `example.com` persists `https://example.com`.
  - [ ] Adding duplicate `https://example.com` is rejected with a deterministic English error message.
  - [ ] Unsafe schemes are rejected with deterministic English error messages.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Valid URL is persisted
    Tool: Bash
    Steps: Run the URL and storage Jest tests with https://example.com fixture.
    Expected: Stored array contains one object with url "https://example.com/" or the exact normalized form defined by urlValidator tests.
    Evidence: .omo/evidence/task-3-valid-storage.txt

  Scenario: Unsafe URL is rejected
    Tool: Bash
    Steps: Run Jest case for javascript:alert(1), file:///tmp/a, chrome://extensions, and empty string.
    Expected: Each case rejects with an English validation error and no storage write occurs.
    Evidence: .omo/evidence/task-3-invalid-storage.txt
  ```

  **Commit**: YES | Message: `feat(storage): add validated site persistence` | Files: [`src/urlValidator.js`, `src/siteStore.js`, `src/constants.js`, `tests/urlValidator.test.js`, `tests/siteStore.test.js`, `tests/__mocks__/chrome.js`]

- [x] 4. Navigation strategy and side-panel capability adapter

  **What to do**: Implement `src/navigationStrategy.js` and the relevant `src/background.js` handlers. The adapter must read Task 1 capability results and use this deterministic rule: direct external side-panel URL when browser capability is true; extension-hosted fallback panel when direct support is false; open-in-tab as the explicit escape hatch. Runtime browser resolution must be exact: classify Edge when `navigator.userAgent` or client hints contain `Edg`, classify Chrome when Chromium/Chrome appears without `Edg`, and classify all unknown browsers as fallback mode. Direct-mode return flow must be exact: clicking the extension action resets `chrome.sidePanel.setOptions` to `src/panel.html` and opens the panel so the editable list remains accessible after an external site occupies the side panel. Add Jest tests that mock `chrome.sidePanel.setOptions`, `chrome.tabs.create`, extension action handling, browser detection, and failure paths. Store capability constants in `src/constants.js` so UI and docs use the same source of truth.
  **Must NOT do**: Do not use `webview`. Do not silently open popups. Do not request host permissions just to navigate. Do not make the executor choose a fallback; use the Task 1 branch rule.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: browser API boundaries and fallback behavior are the core architecture risk.
  - Skills: [] - No specialized skill required.
  - Omitted: [`security-research`] - Not a security audit, but includes permission discipline.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 6, 7, 8 | Blocked By: 1, 2

  **References** (executor has NO interview context - be exhaustive):
  - External: `https://developer.chrome.com/docs/extensions/reference/api/sidePanel` - sidePanel API.
  - External: `https://github.com/chromium/chromium/blob/d37257ad57ddf3a4a8cc4c5efc482911a85f39ed/chrome/browser/ui/views/side_panel/extensions/extension_side_panel_coordinator.cc#L46-L49` - direct external URL support source.
  - External: `https://github.com/chromium/chromium/blob/d37257ad57ddf3a4a8cc4c5efc482911a85f39ed/chrome/browser/ui/views/side_panel/extensions/extension_side_panel_browsertest.cc#L679-L703` - direct external URL browser test source.
  - External: `https://developer.chrome.com/docs/extensions/reference/api/tabs` - tabs fallback API.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `npm test -- --runTestsByPath tests/navigationStrategy.test.js` passes.
  - [ ] Direct-capable mode calls `chrome.sidePanel.setOptions` with the selected `http/https` URL.
  - [ ] Direct-disabled mode routes to the extension fallback panel path.
  - [ ] Open-in-tab escape hatch calls `chrome.tabs.create({ url })`.
  - [ ] Errors from `chrome.sidePanel.setOptions` are converted to deterministic English failure state.
  - [ ] Browser detection returns `edge`, `chrome`, or `unknown`; `unknown` always uses fallback mode.
  - [ ] Extension action reset calls `chrome.sidePanel.setOptions` with `src/panel.html` so the editable list can be reopened after direct mode.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Direct side-panel navigation
    Tool: Bash
    Steps: Run navigationStrategy Jest test with capability map set to direct=true and URL https://example.com.
    Expected: Mock chrome.sidePanel.setOptions receives https://example.com and chrome.tabs.create is not called.
    Evidence: .omo/evidence/task-4-direct-navigation.txt

  Scenario: Side-panel navigation failure uses fallback state
    Tool: Bash
    Steps: Run navigationStrategy Jest test where chrome.sidePanel.setOptions rejects.
    Expected: Strategy returns an English failure object and exposes open-in-tab as the next action.
    Evidence: .omo/evidence/task-4-navigation-failure.txt

  Scenario: Direct-mode return to list
    Tool: Bash
    Steps: Run navigationStrategy Jest test that simulates the extension action click after direct mode is active.
    Expected: Mock chrome.sidePanel.setOptions receives src/panel.html and the editable list route is restored.
    Evidence: .omo/evidence/task-4-return-to-list.txt
  ```

  **Commit**: YES | Message: `feat(sidepanel): add navigation strategy` | Files: [`src/navigationStrategy.js`, `src/background.js`, `src/constants.js`, `tests/navigationStrategy.test.js`, `tests/__mocks__/chrome.js`]

- [ ] 5. Editable English side-panel UI

  **What to do**: Implement the visible panel in `src/panel.html`, `src/panel.js`, and `src/styles.css`. The UI must start with an English empty state, provide a URL input, Add button, list of saved sites, Remove button per item, Open button per item, and a persistent failure area for unsupported sites. Wire UI to `siteStore` and `navigationStrategy` contracts. Add Jest/jsdom tests using DOM events for empty state, valid add, invalid add, duplicate rejection, remove, and open action dispatch.
  **Must NOT do**: Do not add drag/drop, folders, search, favicon fetching, import/export, settings pages, i18n, or prepopulated websites.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: visible UI structure and user-facing states must be clear and accessible.
  - Skills: [] - No specialized skill required.
  - Omitted: [`security-research`] - UI implementation, not a vulnerability audit.

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: 6, 8 | Blocked By: 2, 3

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `extensions/AnimeFLVEnhancements/content.js:76-89` - vanilla DOM element creation style.
  - Pattern: `extensions/AnimeFLVEnhancements/content.js:146-160` - DOM creation plus storage hydration pattern.
  - Test: `TampermonkeyProjects/Youtube/YouTube Enchantments/tests/package.json:26-27` - Jest/jsdom dependency pattern; do not add Testing Library or other UI test libraries in v1.
  - External: `https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model` - DOM API reference.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `npm test -- --runTestsByPath tests/panel.test.js` passes.
  - [ ] First render with empty storage shows exact English text: `No sites yet. Add a website to open it from the sidebar.`
  - [ ] Adding `https://example.com` renders one list item with Open and Remove controls.
  - [ ] Adding `javascript:alert(1)` shows an English validation error and renders no site.
  - [ ] Removing the only site restores the empty state.
  - [ ] Clicking Open calls the navigation strategy with the selected URL.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Empty list and add flow
    Tool: Bash
    Steps: Run panel Jest/jsdom tests for empty storage, type https://example.com, click Add.
    Expected: Empty-state text disappears and one site row appears with Open and Remove buttons.
    Evidence: .omo/evidence/task-5-panel-add.txt

  Scenario: Invalid URL feedback
    Tool: Bash
    Steps: Run panel Jest/jsdom test for javascript:alert(1), then click Add.
    Expected: UI displays deterministic English validation error and no site row is created.
    Evidence: .omo/evidence/task-5-panel-invalid.txt
  ```

  **Commit**: YES | Message: `feat(panel): add editable website list` | Files: [`src/panel.html`, `src/panel.js`, `src/styles.css`, `tests/panel.test.js`]

- [ ] 6. Fallback panel and unsupported-site UX

  **What to do**: Implement the extension-hosted fallback panel path for browsers/sites where direct side-panel URL support is unavailable. The fallback panel may use an iframe only for frameable `http/https` sites and must show English explanatory text when embedding fails or is not supported. Always provide an Open in Tab button. Add tests for fallback rendering, iframe URL assignment, failure message, and open-in-tab action. The UI text must explicitly state that ad blockers and user scripts may behave differently in fallback mode.
  **Must NOT do**: Do not imply iframe fallback preserves uBlock/Tampermonkey behavior. Do not bypass X-Frame-Options or CSP. Do not inject scripts into arbitrary sites.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: fallback must be safe, honest, and deterministic under browser/site restrictions.
  - Skills: [] - No specialized skill required.
  - Omitted: [`security-research`] - Security review occurs in Task 8 and final verification.

  **Parallelization**: Can Parallel: NO | Wave 5 | Blocks: 7, 8 | Blocked By: 3, 4, 5

  **References** (executor has NO interview context - be exhaustive):
  - External: `https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options` - why many sites cannot be embedded.
  - External: `https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts` - content script/frame behavior reference.
  - External: `https://developer.chrome.com/docs/apps/reference/webviewTag` - `webview` is Chrome Apps/ChromeOS, not this extension solution.
  - API/Type: `src/navigationStrategy.js` - must consume the deterministic fallback result from Task 4.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `npm test -- --runTestsByPath tests/fallbackPanel.test.js` passes.
  - [ ] Fallback mode displays exact English warning: `Some browser extensions may not run in fallback mode. Use Open in Tab for full browser-extension behavior.`
  - [ ] Open in Tab calls the navigation strategy/tab fallback with the selected URL.
  - [ ] No code attempts to bypass X-Frame-Options, CSP, or same-origin restrictions.
  - [ ] No code uses `<webview>`.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Fallback warning and iframe path
    Tool: Bash
    Steps: Run fallbackPanel Jest test with fallback mode and URL https://example.com.
    Expected: Warning text appears and iframe src is set only after URL validation passes.
    Evidence: .omo/evidence/task-6-fallback-warning.txt

  Scenario: Open-in-tab escape hatch
    Tool: Bash
    Steps: Run fallbackPanel Jest test that clicks Open in Tab.
    Expected: chrome.tabs.create receives https://example.com and no unsupported scheme can be passed.
    Evidence: .omo/evidence/task-6-open-in-tab.txt
  ```

  **Commit**: YES | Message: `feat(fallback): add unsupported site escape hatch` | Files: [`src/fallbackPanel.js`, `src/panel.js`, `src/styles.css`, `tests/fallbackPanel.test.js`]

- [ ] 7. English documentation and compatibility matrix finalization

  **What to do**: Create `README.md` and finalize `compatibility-matrix.md`. README must explain installation as an unpacked Chrome/Edge extension, how to open the side panel, how to add/remove sites, what direct mode means, what fallback mode means, and why uBlock/Tampermonkey behavior is best-effort. Compatibility matrix must include the Task 1 observed browser results and must not promise universal extension behavior.
  **Must NOT do**: Do not add Spanish technical docs. Do not add a marketing claim that ad blocking or userscripts always work. Do not document preloaded sites.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: documentation clarity and accurate limitations are the deliverable.
  - Skills: [] - No specialized skill required.
  - Omitted: [`security-research`] - Documentation task, not exploit analysis.

  **Parallelization**: Can Parallel: NO | Wave 6 | Blocks: 8 | Blocked By: 1, 4, 6

  **References** (executor has NO interview context - be exhaustive):
  - Research: `.omo/evidence/task-1-side-panel-feasibility.md` - actual Chrome/Edge direct URL results.
  - Research: `compatibility-matrix.md` - matrix created in Task 1 and updated here.
  - External: `https://developer.chrome.com/docs/extensions/reference/api/sidePanel` - sidePanel reference.
  - External: `https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts` - why user scripts/content scripts are conditional.
  - External: `https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options` - why iframe fallback can fail.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `README.md` exists and is written in English.
  - [ ] `README.md` contains sections: `Install`, `Usage`, `Compatibility`, `Fallback Mode`, and `Limitations`.
  - [ ] `compatibility-matrix.md` contains separate Chrome and Edge rows.
  - [ ] Both docs contain the phrase `Best effort, not guaranteed`.
  - [ ] Neither doc contains prohibited guarantee language such as `always works`, `guaranteed compatibility`, or `Tampermonkey always runs`; the exact phrase `Best effort, not guaranteed` is allowed and required.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Documentation covers usage and limits
    Tool: Bash
    Steps: Search README.md for Install, Usage, Compatibility, Fallback Mode, Limitations, and Best effort, not guaranteed.
    Expected: All required sections and phrase are present.
    Evidence: .omo/evidence/task-7-readme-coverage.txt

  Scenario: Matrix avoids false guarantees
    Tool: Bash
    Steps: Search compatibility-matrix.md for prohibited guarantee language (`always works`, `guaranteed compatibility`, `Tampermonkey always runs`) and required Chrome/Edge rows.
    Expected: Chrome and Edge rows exist; prohibited guarantee language is absent except the required phrase "Best effort, not guaranteed".
    Evidence: .omo/evidence/task-7-matrix-language.txt
  ```

  **Commit**: YES | Message: `docs(sidebar): document compatibility limits` | Files: [`README.md`, `compatibility-matrix.md`]

- [ ] 8. Security, permission, and test hardening pass

  **What to do**: Review and harden the completed extension. Ensure URL validation is the only entry point for navigation, no unsafe schemes can reach side-panel/iframe/tab APIs, no broad host permissions are present, no remote scripts are loaded, no inline script is required by the extension CSP, and all tests run together. Add regression tests for any gaps found. Write `.omo/evidence/task-8-hardening.md` summarizing checks and results.
  **Must NOT do**: Do not add new features. Do not broaden permissions. Do not suppress failing tests. Do not remove fallback warnings.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: requires cross-file review and security-sensitive validation checks.
  - Skills: [] - No specialized skill required.
  - Omitted: [`security-research`] - Full team security audit is not requested; this is implementation hardening.

  **Parallelization**: Can Parallel: NO | Wave 7 | Blocks: Final Verification | Blocked By: 2, 3, 4, 5, 6, 7

  **References** (executor has NO interview context - be exhaustive):
  - API/Type: `src/urlValidator.js` - central scheme and normalization enforcement.
  - API/Type: `src/navigationStrategy.js` - side-panel/tab navigation boundary.
  - API/Type: `manifest.json` - permission and CSP boundary.
  - Test: `tests/urlValidator.test.js` - unsafe scheme regression cases.
  - Test: `tests/navigationStrategy.test.js` - API call boundary tests.
  - External: `https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions` - extension permission minimization.
  - External: `https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts` - frame/script behavior limitations.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `npm test` passes all tests.
  - [ ] `manifest.json` does not contain `<all_urls>`.
  - [ ] Source contains no `<webview>` string.
  - [ ] Source contains no `eval(`, `new Function`, or remote script URL loading.
  - [ ] Tests prove `javascript:`, `file:`, `data:`, `chrome:`, and `chrome-extension:` cannot reach navigation APIs.
  - [ ] `.omo/evidence/task-8-hardening.md` exists with permission, CSP, validation, and test results.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Full automated test suite
    Tool: Bash
    Steps: Run npm test from extensions/SideBar after all tasks are complete.
    Expected: Jest exits with code 0 and all suites pass.
    Evidence: .omo/evidence/task-8-npm-test.txt

  Scenario: Unsafe navigation audit
    Tool: Bash
    Steps: Search source and manifest for <all_urls>, <webview>, eval(, new Function, javascript:, file:, data:, chrome:, and chrome-extension: navigation paths; confirm unsafe schemes only appear in tests or validation rejection lists.
    Expected: No unsafe scheme can be passed to sidePanel, iframe, or tabs APIs; findings are documented.
    Evidence: .omo/evidence/task-8-hardening.md
  ```

  **Commit**: YES | Message: `test(sidebar): harden navigation safety` | Files: [`manifest.json`, `src/**`, `tests/**`, `.omo/evidence/task-8-hardening.md`]

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [ ] F1. Plan Compliance Audit — oracle
- [ ] F2. Code Quality Review — unspecified-high
- [ ] F3. Real Manual QA — unspecified-high
  - Required checks: load unpacked extension in latest stable Chrome and Edge with isolated user-data directories; record browser/version; add `https://example.com`; remove it; add it again; open it through the selected navigation mode; use extension action to return to the editable list; trigger open-in-tab fallback; save evidence to `.omo/evidence/f3-real-manual-qa.md`.
  - Pass condition: evidence contains Chrome and Edge sections with add/remove/open/return/fallback results and no step depends on human visual confirmation alone.
- [ ] F4. Scope Fidelity Check — deep

## Commit Strategy
- Commit per completed implementation task if repository policy allows commits during `/start-work`.
- Commit messages must be English and use conventional format from each task.
- Do not commit `.omo/evidence/` unless the repository already tracks evidence artifacts or the executor is instructed to include them.

## Success Criteria
- The extension can be loaded unpacked in latest stable Chrome and Edge.
- The side panel starts with an English empty state and no preloaded websites.
- A user can add, select, and remove `https://example.com`.
- Direct side-panel URL support is verified or rejected per browser with evidence.
- Fallback behavior is implemented exactly according to the capability matrix.
- Jest validates storage, URL validation, UI state, and navigation adapter behavior.
- Compatibility limitations are documented without overpromising.
