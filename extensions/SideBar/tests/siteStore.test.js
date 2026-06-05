const chromeMock = require("./__mocks__/chrome.js");
const { STORAGE_KEYS } = require("../src/constants.js");
const { listSites, addSite, removeSite } = require("../src/siteStore.js");

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
      title: "Example"
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

  test("rejects duplicate URLs after normalization", async () => {
    await addSite({ url: "example.com", title: "Example" });

    await expect(addSite({ url: "https://example.com", title: "Duplicate" })).rejects.toThrow(
      /already exists/
    );
  });

  test("rejects malformed input", async () => {
    await expect(addSite({ url: "not a real url", title: "Broken" })).rejects.toThrow(TypeError);
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
