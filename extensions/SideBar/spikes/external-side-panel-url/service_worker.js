const DIRECT_SIDE_PANEL_URL = "https://example.com";

async function setStoredResult(partial) {
  const existing = await chrome.storage.local.get("latestResult");
  const latestResult = {
    browser: null,
    version: null,
    setOptionsResult: "not-run",
    lastError: null,
    panelOpenAttempted: false,
    panelOpenResult: "not-run",
    panelOpenLastError: null,
    directModeDecision: "UNKNOWN_FALLBACK",
    testedUrl: DIRECT_SIDE_PANEL_URL,
    timestamp: new Date().toISOString(),
    ...existing.latestResult,
    ...partial
  };

  await chrome.storage.local.set({ latestResult });
  return latestResult;
}

function sidePanelSetOptions(options) {
  return new Promise((resolve) => {
    try {
      chrome.sidePanel.setOptions(options, () => {
        const lastError = chrome.runtime.lastError?.message || null;
        resolve({ ok: !lastError, lastError });
      });
    } catch (error) {
      resolve({ ok: false, lastError: `${error.name}: ${error.message}` });
    }
  });
}

function sidePanelOpen(options) {
  return new Promise((resolve) => {
    try {
      chrome.sidePanel.open(options, () => {
        const lastError = chrome.runtime.lastError?.message || null;
        resolve({ ok: !lastError, lastError });
      });
    } catch (error) {
      resolve({ ok: false, lastError: `${error.name}: ${error.message}` });
    }
  });
}

async function runSetOptionsSpike(source) {
  const result = await sidePanelSetOptions({
    path: DIRECT_SIDE_PANEL_URL,
    enabled: true
  });

  return setStoredResult({
    setOptionsResult: result.ok ? "success" : "failure",
    lastError: result.lastError,
    directModeDecision: result.ok ? "DIRECT" : "FALLBACK",
    source
  });
}

async function runPanelOpenSpike(source) {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const windowId = tabs[0]?.windowId;
  const result = await sidePanelOpen(windowId ? { windowId } : {});

  return setStoredResult({
    panelOpenAttempted: true,
    panelOpenResult: result.ok ? "success" : "failure",
    panelOpenLastError: result.lastError,
    source
  });
}


globalThis.runSetOptionsSpike = runSetOptionsSpike;
globalThis.runPanelOpenSpike = runPanelOpenSpike;
chrome.runtime.onInstalled.addListener(() => {
  runSetOptionsSpike("onInstalled");
});

chrome.runtime.onStartup.addListener(() => {
  runSetOptionsSpike("onStartup");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "run-set-options") {
    runSetOptionsSpike("message").then(sendResponse);
    return true;
  }

  if (message?.type === "open-panel") {
    runPanelOpenSpike("message").then(sendResponse);
    return true;
  }

  return false;
});

