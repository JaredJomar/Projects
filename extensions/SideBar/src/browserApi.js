function getChrome() {
  return globalThis.chrome ?? {};
}

function getStorageArea() {
  return getChrome().storage?.local ?? null;
}

function getSidePanelApi() {
  return getChrome().sidePanel ?? null;
}

function getTabsApi() {
  return getChrome().tabs ?? null;
}

function getRuntimeApi() {
  return getChrome().runtime ?? null;
}

const browserApi = {
  getChrome,
  getStorageArea,
  getSidePanelApi,
  getTabsApi,
  getRuntimeApi
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = browserApi;
}

globalThis.SideBarBrowserApi = browserApi;
