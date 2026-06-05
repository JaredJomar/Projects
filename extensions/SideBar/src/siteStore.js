const constants = globalThis.SideBarConstants ?? require("./constants.js");
const browserApi = globalThis.SideBarBrowserApi ?? require("./browserApi.js");
const urlValidator = globalThis.SideBarUrlValidator ?? require("./urlValidator.js");

const STORAGE_KEY = constants.STORAGE_KEYS.siteList;
const EMPTY_SITE_LIST = constants.INITIAL_SITE_LIST;

function getStorageArea() {
  const storageArea = browserApi.getStorageArea?.() ?? globalThis.chrome?.storage?.local ?? null;

  if (!storageArea) {
    throw new Error("chrome.storage.local is unavailable.");
  }

  return storageArea;
}

function getRuntimeLastError() {
  return globalThis.chrome?.runtime?.lastError ?? null;
}

function normalizeError(error) {
  if (error instanceof Error) {
    return error;
  }

  return new Error(String(error));
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
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
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
    createdAt,
    updatedAt
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

const siteStore = Object.freeze({
  STORAGE_KEY,
  listSites,
  addSite,
  removeSite,
  readSiteList,
  writeSiteList
});

if (typeof module !== "undefined" && module.exports) {
  module.exports = siteStore;
}

globalThis.SideBarSiteStore = siteStore;
