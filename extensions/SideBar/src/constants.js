const SITE_STORAGE_KEY = "siteList";

const constants = Object.freeze({
  SITE_STORAGE_KEY,
  STORAGE_KEYS: Object.freeze({
    siteList: SITE_STORAGE_KEY
  }),
  INITIAL_SITE_LIST: Object.freeze([]),
  PANEL_PATH: "src/panel.html",
  SIDE_PANEL_CAPABILITY: Object.freeze({
    directUrlEnabled: false,
    fallbackMode: "extension-panel"
  }),
  PERMISSIONS: Object.freeze(["sidePanel", "storage", "tabs"])
});

if (typeof module !== "undefined" && module.exports) {
  module.exports = constants;
}

globalThis.SideBarConstants = constants;
