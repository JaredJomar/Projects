((root) => {
  const constants = root.SideBarConstants ?? require("./constants.js");
  const browserApi = root.SideBarBrowserApi ?? require("./browserApi.js");
  const urlValidator = root.SideBarUrlValidator ?? require("./urlValidator.js");

  const { FALLBACK_URL_PARAM, FALLBACK_VIEW_MODE_PARAM, PANEL_PATH, SIDE_PANEL_CAPABILITY, VIEW_MODES } = constants;
  const { callChromeMethod, getActiveTab, getRuntimeApi, getSidePanelApi, getTabsApi } = browserApi;
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

async function getActiveWindowId() {
  const activeTab = await getActiveTab().catch(() => null);
  return activeTab?.windowId;
}

async function setSidePanelPath(path) {
  const sidePanel = getSidePanelApi();

  if (!sidePanel?.setOptions) {
    throw new Error("Side panel API is unavailable.");
  }

  await callChromeMethod(sidePanel.setOptions, sidePanel, [{ path, enabled: true }]);
}

async function openSidePanel() {
  const sidePanel = getSidePanelApi();

  if (!sidePanel?.open) {
    throw new Error("Side panel open API is unavailable.");
  }

  const windowId = await getActiveWindowId();
  const options = typeof windowId === "number" ? { windowId } : {};

  await callChromeMethod(sidePanel.open, sidePanel, [options]);
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
    const directUrlEnabled = options.directUrlEnabled ?? SIDE_PANEL_CAPABILITY.directUrlByBrowser?.[browser] ?? SIDE_PANEL_CAPABILITY.directUrlEnabled;

    return directUrlEnabled === true && (browser === "chrome" || browser === "edge");
  }

function normalizeViewMode(viewMode) {
  if (Object.values(VIEW_MODES).includes(viewMode)) {
    return viewMode;
  }

  return VIEW_MODES.mobile;
}

function buildFallbackPanelPath(url, viewMode = VIEW_MODES.mobile) {
  const normalizedViewMode = normalizeViewMode(viewMode);

  return `${PANEL_PATH}?${FALLBACK_URL_PARAM}=${encodeURIComponent(url)}&${FALLBACK_VIEW_MODE_PARAM}=${encodeURIComponent(normalizedViewMode)}`;
}

async function openExtensionPanelFallback(url, viewMode = VIEW_MODES.mobile) {
  const path = buildFallbackPanelPath(url, viewMode);

  await setSidePanelPath(path);
  await openSidePanel();

  return {
    status: NAVIGATION_STATUS.fallback,
    ok: true,
    path,
    url,
    viewMode: normalizeViewMode(viewMode)
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
  const viewMode = normalizeViewMode(options.viewMode);

  if (!shouldUseDirectPanel(options)) {
    return openExtensionPanelFallback(url, viewMode);
  }

  try {
    await setSidePanelPath(url);
    await openSidePanel();

    return {
      status: NAVIGATION_STATUS.direct,
      ok: true,
      url,
      viewMode
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

  await callChromeMethod(tabs.create, tabs, [{ url }]);

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
  buildFallbackPanelPath,
  configureDefaultPanel,
  detectBrowser,
  navigateSidePanel,
  normalizeViewMode,
  openInTab,
  resetPanelToList,
  shouldUseDirectPanel
});

  if (typeof module !== "undefined" && module.exports) {
    module.exports = navigationStrategy;
  }

  root.SideBarNavigationStrategy = navigationStrategy;
})(globalThis);
