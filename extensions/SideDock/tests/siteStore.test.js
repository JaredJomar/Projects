const chromeMock = require("./__mocks__/chrome.js");
const { STORAGE_KEYS } = require("../src/constants.js");
const {
  listSites,
  addSite,
  removeSite,
  reorderSites,
  readPanelUiSettings,
  readSettings,
  resolveSiteViewMode,
  updateGlobalViewMode,
  updatePanelUiSettings,
  updateSiteViewMode
} = require("../src/siteStore.js");

describe("siteStore", () => {
  beforeEach(() => {
    chromeMock.__resetStorageState();
    chromeMock.runtime.lastError = undefined;
    chromeMock.storage.local.get.mockClear();
    chromeMock.storage.local.set.mockClear();
    chromeMock.storage.local.remove.mockClear();
    chromeMock.storage.local.clear.mockClear();
  });

  test("starts with an empty site list", async () => {
    expect(await listSites()).toEqual([]);
  });

  test("adds a normalized site and persists it", async () => {
    const addedSite = await addSite({ url: "example.com", title: "Example" });
    const storedSites = await listSites();

    expect(addedSite).toMatchObject({
      url: "https://example.com",
      title: "Example",
      iconUrl: "",
      viewMode: "default"
    });
    expect(addedSite.id).toEqual(expect.any(String));
    expect(addedSite.createdAt).toEqual(expect.any(String));
    expect(addedSite.updatedAt).toEqual(expect.any(String));
    expect(storedSites).toEqual([addedSite]);
    expect(chromeMock.storage.local.set.mock.calls.at(-1)[0]).toEqual({
      [STORAGE_KEYS.siteList]: [addedSite]
    });
  });

  test("removes a persisted site", async () => {
    const addedSite = await addSite({ url: "example.com", title: "Example" });

    await expect(removeSite(addedSite.id)).resolves.toBe(true);
    expect(await listSites()).toEqual([]);
    expect(chromeMock.storage.local.set.mock.calls.at(-1)[0]).toEqual({
      [STORAGE_KEYS.siteList]: []
    });
  });

  test("reorders persisted sites by id", async () => {
    const firstSite = await addSite({ url: "one.example", title: "One" });
    const secondSite = await addSite({ url: "two.example", title: "Two" });

    const reorderedSites = await reorderSites([secondSite.id, firstSite.id]);

    expect(reorderedSites.map((site) => site.id)).toEqual([secondSite.id, firstSite.id]);
    expect((await listSites()).map((site) => site.id)).toEqual([secondSite.id, firstSite.id]);
  });

  test("rejects duplicate URLs after normalization", async () => {
    await addSite({ url: "example.com", title: "Example" });

    await expect(addSite({ url: "https://example.com", title: "Duplicate" })).rejects.toThrow(
      /already exists/
    );
  });

  test("rejects malformed input", async () => {
    await expect(addSite({ url: "not a real url", title: "Broken" })).rejects.toThrow(TypeError);
  });

  test("persists safe favicon URLs and display preferences", async () => {
    const addedSite = await addSite({
      url: "example.com",
      title: "Example",
      iconUrl: "https://example.com/favicon.ico",
      viewMode: "desktop"
    });

    expect(addedSite.iconUrl).toBe("https://example.com/favicon.ico");
    expect(addedSite.viewMode).toBe("desktop");
    expect(resolveSiteViewMode(addedSite, await readSettings())).toBe("desktop");
  });

  test("keeps missing or unsafe icon URLs empty instead of synthesizing a favicon", async () => {
    const missingIconSite = await addSite({ url: "missing.example", title: "Missing" });
    const unsafeIconSite = await addSite({
      url: "unsafe.example",
      title: "Unsafe",
      iconUrl: "javascript:alert(1)"
    });

    expect(missingIconSite.iconUrl).toBe("");
    expect(unsafeIconSite.iconUrl).toBe("");
    expect((await listSites()).map((site) => site.iconUrl)).toEqual(["", ""]);
  });

  test("defaults global display preference to mobile and updates it", async () => {
    expect(await readSettings()).toEqual({ globalViewMode: "mobile" });

    const settings = await updateGlobalViewMode("desktop");

    expect(settings).toEqual({ globalViewMode: "desktop" });
    expect(await readSettings()).toEqual({ globalViewMode: "desktop" });
  });

  test("defaults panel UI to rail-only and persists drawer state", async () => {
    expect(await readPanelUiSettings()).toEqual({ open: false, pinned: false, selectedSiteId: "", width: 360 });

    const settings = await updatePanelUiSettings({ open: true, pinned: true, selectedSiteId: "site-1", width: 420 });

    expect(settings).toEqual({ open: true, pinned: true, selectedSiteId: "site-1", width: 420 });
    expect(await readPanelUiSettings()).toEqual({ open: true, pinned: true, selectedSiteId: "site-1", width: 420 });
  });

  test("clamps panel drawer width and pinned state implies open", async () => {
    await updatePanelUiSettings({ open: false, pinned: true, width: 1000 });

    expect(await readPanelUiSettings()).toEqual({ open: true, pinned: true, selectedSiteId: "", width: 640 });

    await updatePanelUiSettings({ pinned: false, width: 40 });

    expect(await readPanelUiSettings()).toEqual({ open: true, pinned: false, selectedSiteId: "", width: 280 });
  });

  test("updates a saved site's display preference", async () => {
    const addedSite = await addSite({ url: "example.com", title: "Example" });
    const updatedSite = await updateSiteViewMode(addedSite.id, "desktop");

    expect(updatedSite.viewMode).toBe("desktop");
    expect(resolveSiteViewMode(updatedSite, { globalViewMode: "mobile" })).toBe("desktop");
  });

  test("propagates storage read errors", async () => {
    chromeMock.storage.local.get.mockRejectedValueOnce(new Error("read failed"));

    await expect(listSites()).rejects.toThrow("read failed");
  });

  test("propagates storage write errors", async () => {
    chromeMock.storage.local.set.mockRejectedValueOnce(new Error("write failed"));

    await expect(addSite({ url: "example.com", title: "Example" })).rejects.toThrow("write failed");
  });
});
