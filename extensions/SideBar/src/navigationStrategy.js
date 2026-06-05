const constants = globalThis.SideBarConstants ?? require("./constants.js");
const browserApi = globalThis.SideBarBrowserApi ?? require("./browserApi.js");
const urlValidator = globalThis.SideBarUrlValidator ?? require("./urlValidator.js");

const { PANEL_PATH, SIDE_PANEL_CAPABILITY } = constants;
const { getRuntimeApi, getSidePanelApi, getTabsApi } = browserApi;
const { normalizeSiteUrl } = urlValidator;

const NAVIGATION_STATUS = Object.freeze({
  direct: "direct-side-panel",
  fallback: "extension-panel-fallback",
  tab: "open-in-tab",
  failure: "side-panel-failure"
});

function readUserAgentData(userAgentData = globalThis.navigator?.userAgentData) {
  const brands = Array.isArray(userAgentData?.brands) ? userAgentData.brands : [];

  return brands
    .map((brand) => `${brand?.brand ?? ""} ${brand?.version ?? ""}`.trim())
    .filter(Boolean)
    .join(" ");
}

function detectBrowser(runtime = globalThis.navigator ?? {}) {
  const userAgent = typeof runtime.userAgent === "string" ? runtime.userAgent : "";
  const hints = readUserAgentData(runtime.userAgentData);
  const fingerprint = `${userAgent} ${hints}`;

  if (/Edg/i.test(fingerprint)) {
    return "edge";
  }

  if (/(Chromium|Chrome)/i.test(fingerprint)) {
    return "chrome";
  }

  return "unknown";
}

function getLastErrorMessage() {
  const lastError = getRuntimeApi()?.lastError;

  if (!lastError) {
    return "Side panel navigation failed.";
  }

  return lastError.message || String(lastError);
}

function callChromeCallbackApi(apiCall) {
  return new Promise((resolve, reject) => {
    apiCall(() => {
      const runtime = getRuntimeApi();
      const lastError = runtime?.lastError;

      if (lastError) {
        const message = lastError.message || String(lastError);
        reject(new Error(message));
        return;
      }

      resolve();
    });
  });
}

async function getActiveWindowId() {
  const tabs = getTabsApi();

  if (!tabs?.query) {
    return undefined;
  }

  const activeTabs = await tabs.query({ active: true, currentWindow: true });
  return activeTabs?.[0]?.windowId;
}

async function setSidePanelPath(path) {
  const sidePanel = getSidePanelApi();

  if (!sidePanel?.setOptions) {
    throw new Error("Side panel API is unavailable.");
  }

  await callChromeCallbackApi((callback) => sidePanel.setOptions({ path, enabled: true }, callback));
}

async function openSidePanel() {
  const sidePanel = getSidePanelApi();

  if (!sidePanel?.open) {
    throw new Error("Side panel open API is unavailable.");
  }

  const windowId = await getActiveWindowId();
  const options = typeof windowId === "number" ? { windowId } : {};

  await callChromeCallbackApi((callback) => sidePanel.open(options, callback));
}

function toFailureState(error) {
  const details = error?.message || getLastErrorMessage();

  return {
    status: NAVIGATION_STATUS.failure,
    ok: false,
    message: `Side panel navigation failed. Use open-in-tab instead. ${details}`,
    nextAction: "open-in-tab"
  };
}

function shouldUseDirectPanel(options = {}) {
  const browser = options.browser ?? detectBrowser(options.navigator);
  const directUrlEnabled = options.directUrlEnabled ?? SIDE_PANEL_CAPABILITY.directUrlEnabled;

  return directUrlEnabled === true && (browser === "chrome" || browser === "edge");
}

async function openExtensionPanelFallback() {
  await setSidePanelPath(PANEL_PATH);
  await openSidePanel();

  return {
    status: NAVIGATION_STATUS.fallback,
    ok: true,
    path: PANEL_PATH
  };
}

async function configureDefaultPanel() {
  await setSidePanelPath(PANEL_PATH);

  return {
    status: NAVIGATION_STATUS.fallback,
    ok: true,
    path: PANEL_PATH
  };
}

async function navigateSidePanel(rawUrl, options = {}) {
  const url = normalizeSiteUrl(rawUrl);

  if (!shouldUseDirectPanel(options)) {
    return openExtensionPanelFallback();
  }

  try {
    await setSidePanelPath(url);
    await openSidePanel();

    return {
      status: NAVIGATION_STATUS.direct,
      ok: true,
      url
    };
  } catch (error) {
    return toFailureState(error);
  }
}

async function openInTab(rawUrl) {
  const url = normalizeSiteUrl(rawUrl);
  const tabs = getTabsApi();

  if (!tabs?.create) {
    throw new Error("Tabs API is unavailable.");
  }

  await tabs.create({ url });

  return {
    status: NAVIGATION_STATUS.tab,
    ok: true,
    url
  };
}

async function resetPanelToList() {
  await setSidePanelPath(PANEL_PATH);
  await openSidePanel();

  return {
    status: NAVIGATION_STATUS.fallback,
    ok: true,
    path: PANEL_PATH
  };
}

const navigationStrategy = Object.freeze({
  NAVIGATION_STATUS,
  configureDefaultPanel,
  detectBrowser,
  navigateSidePanel,
  openInTab,
  resetPanelToList,
  shouldUseDirectPanel
});

if (typeof module !== "undefined" && module.exports) {
  module.exports = navigationStrategy;
}

globalThis.SideBarNavigationStrategy = navigationStrategy;
