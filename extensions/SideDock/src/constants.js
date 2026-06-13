((root) => {
  const SITE_STORAGE_KEY = "siteList";
  const SETTINGS_STORAGE_KEY = "sidebarSettings";
  const PANEL_UI_STORAGE_KEY = "panelUiSettings";
  const VIEW_MODES = Object.freeze({
    mobile: "mobile",
    desktop: "desktop"
  });
  const SITE_VIEW_MODES = Object.freeze({
    default: "default",
    mobile: VIEW_MODES.mobile,
    desktop: VIEW_MODES.desktop
  });

  const constants = Object.freeze({
    SITE_STORAGE_KEY,
    SETTINGS_STORAGE_KEY,
    PANEL_UI_STORAGE_KEY,
    STORAGE_KEYS: Object.freeze({
      siteList: SITE_STORAGE_KEY,
      settings: SETTINGS_STORAGE_KEY,
      panelUi: PANEL_UI_STORAGE_KEY
    }),
    INITIAL_SITE_LIST: Object.freeze([]),
    DEFAULT_SETTINGS: Object.freeze({
      globalViewMode: VIEW_MODES.mobile
    }),
    DEFAULT_PANEL_UI: Object.freeze({
      open: false,
      pinned: false,
      selectedSiteId: "",
      width: 360
    }),
    PANEL_UI_WIDTH: Object.freeze({
      min: 280,
      max: 640
    }),
    DEFAULT_SITE_VIEW_MODE: SITE_VIEW_MODES.default,
    VIEW_MODES,
    SITE_VIEW_MODES,
    PANEL_PATH: "src/panel.html",
    FALLBACK_URL_PARAM: "fallbackUrl",
    FALLBACK_VIEW_MODE_PARAM: "viewMode",
    SIDE_PANEL_CAPABILITY: Object.freeze({
      directUrlEnabled: false,
      directUrlByBrowser: Object.freeze({
        chrome: false,
        edge: true
      }),
      fallbackMode: "extension-panel"
    }),
    PERMISSIONS: Object.freeze(["sidePanel", "storage", "tabs"])
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = constants;
  }

  root.SideBarConstants = constants;
})(globalThis);
