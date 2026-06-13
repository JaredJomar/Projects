((root) => {
  const constants = root.SideBarConstants ?? require("./constants.js");
  const browserApi = root.SideBarBrowserApi ?? require("./browserApi.js");
  const urlValidator = root.SideBarUrlValidator ?? require("./urlValidator.js");

  const STORAGE_KEY = constants.STORAGE_KEYS.siteList;
  const SETTINGS_KEY = constants.STORAGE_KEYS.settings;
  const PANEL_UI_KEY = constants.STORAGE_KEYS.panelUi;
  const EMPTY_SITE_LIST = constants.INITIAL_SITE_LIST;
  const DEFAULT_SETTINGS = constants.DEFAULT_SETTINGS;
  const DEFAULT_PANEL_UI = constants.DEFAULT_PANEL_UI;
  const PANEL_UI_WIDTH = constants.PANEL_UI_WIDTH;
  const DEFAULT_SITE_VIEW_MODE = constants.DEFAULT_SITE_VIEW_MODE;
  const VIEW_MODES = constants.VIEW_MODES;
  const SITE_VIEW_MODES = constants.SITE_VIEW_MODES;

  function getStorageArea() {
    const storageArea = browserApi.getStorageArea?.() ?? root.chrome?.storage?.local ?? null;

    if (!storageArea) {
      throw new Error("chrome.storage.local is unavailable.");
    }

    return storageArea;
  }

  function getRuntimeLastError() {
    return root.chrome?.runtime?.lastError ?? null;
  }

  function normalizeError(error) {
    if (error instanceof Error) {
      return error;
    }

    return new Error(String(error));
  }

  function isSafeIconUrl(iconUrl) {
    if (typeof iconUrl !== "string") {
      return false;
    }

    const trimmed = iconUrl.trim();

    return /^(https?:|data:image\/|chrome:\/\/favicon2?\/)/i.test(trimmed);
  }

  function normalizeIconUrl(iconUrl) {
    return isSafeIconUrl(iconUrl) ? iconUrl.trim() : "";
  }

  function normalizeSiteViewMode(viewMode) {
    if (Object.values(SITE_VIEW_MODES).includes(viewMode)) {
      return viewMode;
    }

    return DEFAULT_SITE_VIEW_MODE;
  }

  function normalizeGlobalViewMode(viewMode) {
    if (Object.values(VIEW_MODES).includes(viewMode)) {
      return viewMode;
    }

    return DEFAULT_SETTINGS.globalViewMode;
  }

  function clampPanelWidth(width) {
    const numericWidth = Number(width);

    if (!Number.isFinite(numericWidth)) {
      return DEFAULT_PANEL_UI.width;
    }

    return Math.min(PANEL_UI_WIDTH.max, Math.max(PANEL_UI_WIDTH.min, Math.round(numericWidth)));
  }

  function normalizePanelUiRecord(record) {
    if (!record || typeof record !== "object") {
      return Object.freeze({ ...DEFAULT_PANEL_UI });
    }

    const pinned = record.pinned === true;

    return Object.freeze({
      open: pinned || record.open === true,
      pinned,
      selectedSiteId: typeof record.selectedSiteId === "string" ? record.selectedSiteId : DEFAULT_PANEL_UI.selectedSiteId,
      width: clampPanelWidth(record.width)
    });
  }

  function callStorageMethod(method, thisArg, args) {
    return new Promise((resolve, reject) => {
      let settled = false;

      const callback = (value) => {
        if (settled) {
          return;
        }

        settled = true;

        const runtimeError = getRuntimeLastError();

        if (runtimeError) {
          reject(normalizeError(runtimeError));
          return;
        }

        resolve(value);
      };

      try {
        const result = method.call(thisArg, ...args, callback);

        if (result && typeof result.then === "function") {
          result.then(
            (value) => {
              if (!settled) {
                settled = true;
                resolve(value);
              }
            },
            (error) => {
              if (!settled) {
                settled = true;
                reject(normalizeError(error));
              }
            }
          );
        }
      } catch (error) {
        settled = true;
        reject(normalizeError(error));
      }
    });
  }

  function createSiteId() {
    if (typeof root.crypto?.randomUUID === "function") {
      return root.crypto.randomUUID();
    }

    return `site_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function normalizeSiteRecord(record) {
    if (!record || typeof record !== "object") {
      return null;
    }

    const { id, url, title, createdAt, updatedAt } = record;

    if (
      typeof id !== "string" ||
      typeof url !== "string" ||
      typeof title !== "string" ||
      typeof createdAt !== "string" ||
      typeof updatedAt !== "string"
    ) {
      return null;
    }

    return Object.freeze({
      id,
      url,
      title,
      iconUrl: normalizeIconUrl(record.iconUrl),
      viewMode: normalizeSiteViewMode(record.viewMode),
      createdAt,
      updatedAt
    });
  }

  function normalizeSettingsRecord(record) {
    if (!record || typeof record !== "object") {
      return Object.freeze({ ...DEFAULT_SETTINGS });
    }

    return Object.freeze({
      globalViewMode: normalizeGlobalViewMode(record.globalViewMode)
    });
  }

  async function readSiteList() {
    const storageArea = getStorageArea();
    const result = await callStorageMethod(storageArea.get, storageArea, [STORAGE_KEY]);
    const siteList = Array.isArray(result?.[STORAGE_KEY]) ? result[STORAGE_KEY] : EMPTY_SITE_LIST;

    return siteList.map(normalizeSiteRecord).filter(Boolean);
  }

  async function writeSiteList(siteList) {
    const storageArea = getStorageArea();

    await callStorageMethod(storageArea.set, storageArea, [{ [STORAGE_KEY]: siteList }]);
  }

  async function readSettings() {
    const storageArea = getStorageArea();
    const result = await callStorageMethod(storageArea.get, storageArea, [SETTINGS_KEY]);

    return normalizeSettingsRecord(result?.[SETTINGS_KEY]);
  }

  async function writeSettings(settings) {
    const storageArea = getStorageArea();
    const normalizedSettings = normalizeSettingsRecord(settings);

    await callStorageMethod(storageArea.set, storageArea, [{ [SETTINGS_KEY]: normalizedSettings }]);

    return normalizedSettings;
  }

  async function readPanelUiSettings() {
    const storageArea = getStorageArea();
    const result = await callStorageMethod(storageArea.get, storageArea, [PANEL_UI_KEY]);

    return normalizePanelUiRecord(result?.[PANEL_UI_KEY]);
  }

  async function writePanelUiSettings(panelUiSettings) {
    const storageArea = getStorageArea();
    const normalizedSettings = normalizePanelUiRecord(panelUiSettings);

    await callStorageMethod(storageArea.set, storageArea, [{ [PANEL_UI_KEY]: normalizedSettings }]);

    return normalizedSettings;
  }

  async function updatePanelUiSettings(partialSettings = {}) {
    const existingSettings = await readPanelUiSettings();
    const nextSettings = normalizePanelUiRecord({ ...existingSettings, ...partialSettings });

    await writePanelUiSettings(nextSettings);

    return nextSettings;
  }

  async function listSites() {
    return readSiteList();
  }

  async function addSite(siteInput = {}) {
    const normalizedUrl = urlValidator.normalizeSiteUrl(siteInput.url);
    const existingSites = await readSiteList();

    if (existingSites.some((site) => site.url === normalizedUrl)) {
      throw new Error("Site URL already exists.");
    }

    const now = new Date().toISOString();
    const siteRecord = Object.freeze({
      id: createSiteId(),
      url: normalizedUrl,
      title: typeof siteInput.title === "string" ? siteInput.title.trim() : "",
      iconUrl: normalizeIconUrl(siteInput.iconUrl),
      viewMode: normalizeSiteViewMode(siteInput.viewMode),
      createdAt: now,
      updatedAt: now
    });

    await writeSiteList([...existingSites, siteRecord]);

    return siteRecord;
  }

  async function removeSite(siteId) {
    if (typeof siteId !== "string" || !siteId.trim()) {
      throw new TypeError("Site id must be a non-empty string.");
    }

    const existingSites = await readSiteList();
    const nextSites = existingSites.filter((site) => site.id !== siteId);

    if (nextSites.length === existingSites.length) {
      return false;
    }

    await writeSiteList(nextSites);

    return true;
  }

  async function reorderSites(orderedSiteIds) {
    if (!Array.isArray(orderedSiteIds)) {
      throw new TypeError("Site order must be an array of site ids.");
    }

    const existingSites = await readSiteList();
    const sitesById = new Map(existingSites.map((site) => [site.id, site]));
    const seenIds = new Set();
    const reorderedSites = [];

    for (const siteId of orderedSiteIds) {
      if (typeof siteId !== "string" || seenIds.has(siteId) || !sitesById.has(siteId)) {
        continue;
      }

      seenIds.add(siteId);
      reorderedSites.push(sitesById.get(siteId));
    }

    for (const site of existingSites) {
      if (!seenIds.has(site.id)) {
        reorderedSites.push(site);
      }
    }

    await writeSiteList(reorderedSites);

    return reorderedSites;
  }

  async function updateSiteViewMode(siteId, viewMode) {
    if (typeof siteId !== "string" || !siteId.trim()) {
      throw new TypeError("Site id must be a non-empty string.");
    }

    const normalizedViewMode = normalizeSiteViewMode(viewMode);
    const existingSites = await readSiteList();
    let updatedSite = null;
    const nextSites = existingSites.map((site) => {
      if (site.id !== siteId) {
        return site;
      }

      updatedSite = Object.freeze({
        ...site,
        viewMode: normalizedViewMode,
        updatedAt: new Date().toISOString()
      });

      return updatedSite;
    });

    if (!updatedSite) {
      throw new Error("Site was not found.");
    }

    await writeSiteList(nextSites);

    return updatedSite;
  }

  async function updateGlobalViewMode(viewMode) {
    const existingSettings = await readSettings();
    const nextSettings = Object.freeze({
      ...existingSettings,
      globalViewMode: normalizeGlobalViewMode(viewMode)
    });

    await writeSettings(nextSettings);

    return nextSettings;
  }

  function resolveSiteViewMode(site, settings = DEFAULT_SETTINGS) {
    const siteViewMode = normalizeSiteViewMode(site?.viewMode);

    if (siteViewMode !== DEFAULT_SITE_VIEW_MODE) {
      return siteViewMode;
    }

    return normalizeGlobalViewMode(settings?.globalViewMode);
  }

  const siteStore = Object.freeze({
    STORAGE_KEY,
    SETTINGS_KEY,
    PANEL_UI_KEY,
    listSites,
    addSite,
    removeSite,
    reorderSites,
    readSettings,
    writeSettings,
    readPanelUiSettings,
    writePanelUiSettings,
    updatePanelUiSettings,
    updateSiteViewMode,
    updateGlobalViewMode,
    resolveSiteViewMode,
    readSiteList,
    writeSiteList
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = siteStore;
  }

  root.SideBarSiteStore = siteStore;
})(globalThis);
