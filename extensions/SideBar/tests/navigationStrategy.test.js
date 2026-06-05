const chromeMock = require("./__mocks__/chrome.js");
const { PANEL_PATH } = require("../src/constants.js");
const {
  NAVIGATION_STATUS,
  detectBrowser,
  navigateSidePanel,
  openInTab,
  resetPanelToList
} = require("../src/navigationStrategy.js");

function resetChromeMock() {
  chromeMock.runtime.lastError = undefined;
  chromeMock.sidePanel.setOptions.mockClear();
  chromeMock.sidePanel.open.mockClear();
  chromeMock.tabs.query.mockClear();
  chromeMock.tabs.create.mockClear();
  chromeMock.action.onClicked.addListener.mockClear();
  chromeMock.runtime.onMessage.addListener.mockClear();
  chromeMock.tabs.query.mockResolvedValue([{ windowId: 1 }]);
}

describe("navigationStrategy", () => {
  beforeEach(() => {
    resetChromeMock();
  });

  test("direct-capable mode sets the selected http/https URL as the side-panel path", async () => {
    const result = await navigateSidePanel("http://example.com/path", {
      directUrlEnabled: true,
      browser: "chrome"
    });

    expect(result).toEqual({
      status: NAVIGATION_STATUS.direct,
      ok: true,
      url: "http://example.com/path"
    });
    expect(chromeMock.sidePanel.setOptions).toHaveBeenCalledWith(
      { path: "http://example.com/path", enabled: true },
      expect.any(Function)
    );
    expect(chromeMock.sidePanel.open).toHaveBeenCalledWith({ windowId: 1 }, expect.any(Function));
  });

  test("direct-disabled mode routes to the extension fallback panel", async () => {
    const result = await navigateSidePanel("https://example.com", {
      directUrlEnabled: false,
      browser: "chrome"
    });

    expect(result).toEqual({
      status: NAVIGATION_STATUS.fallback,
      ok: true,
      path: PANEL_PATH
    });
    expect(chromeMock.sidePanel.setOptions).toHaveBeenCalledWith(
      { path: PANEL_PATH, enabled: true },
      expect.any(Function)
    );
  });

  test("open-in-tab validates and opens the normalized URL in a tab", async () => {
    const result = await openInTab("example.com/path");

    expect(result).toEqual({
      status: NAVIGATION_STATUS.tab,
      ok: true,
      url: "https://example.com/path"
    });
    expect(chromeMock.tabs.create).toHaveBeenCalledWith({ url: "https://example.com/path" });
  });

  test("unsafe URLs cannot reach side-panel or tabs APIs", async () => {
    await expect(navigateSidePanel("javascript:alert(1)", { directUrlEnabled: true, browser: "chrome" })).rejects.toThrow(
      /Unsupported URL scheme/
    );
    await expect(openInTab("chrome://settings")).rejects.toThrow(/Unsupported URL scheme/);
    expect(chromeMock.sidePanel.setOptions).not.toHaveBeenCalled();
    expect(chromeMock.tabs.create).not.toHaveBeenCalled();
  });

  test("side-panel setOptions errors return deterministic failure state with open-in-tab next action", async () => {
    chromeMock.sidePanel.setOptions.mockImplementationOnce((_options, callback) => {
      chromeMock.runtime.lastError = { message: "Direct URL panels are unavailable" };
      callback();
    });

    const result = await navigateSidePanel("https://example.com", {
      directUrlEnabled: true,
      browser: "edge"
    });

    expect(result).toEqual({
      status: NAVIGATION_STATUS.failure,
      ok: false,
      message: "Side panel navigation failed. Use open-in-tab instead. Direct URL panels are unavailable",
      nextAction: "open-in-tab"
    });
    expect(chromeMock.sidePanel.open).not.toHaveBeenCalled();
  });

  test("browser detection classifies Edge, Chrome, and unknown", () => {
    expect(detectBrowser({ userAgent: "Mozilla/5.0 Edg/125.0" })).toBe("edge");
    expect(detectBrowser({ userAgent: "Mozilla/5.0 Chrome/125.0 Safari/537.36" })).toBe("chrome");
    expect(
      detectBrowser({
        userAgent: "",
        userAgentData: { brands: [{ brand: "Chromium", version: "125" }] }
      })
    ).toBe("chrome");
    expect(detectBrowser({ userAgent: "Mozilla/5.0 Firefox/126.0" })).toBe("unknown");
  });

  test("unknown browser uses fallback mode even when direct mode is requested", async () => {
    const result = await navigateSidePanel("https://example.com", {
      directUrlEnabled: true,
      browser: "unknown"
    });

    expect(result.status).toBe(NAVIGATION_STATUS.fallback);
    expect(chromeMock.sidePanel.setOptions).toHaveBeenCalledWith(
      { path: PANEL_PATH, enabled: true },
      expect.any(Function)
    );
  });

  test("extension-action reset restores the list panel and opens it", async () => {
    const result = await resetPanelToList();

    expect(result).toEqual({
      status: NAVIGATION_STATUS.fallback,
      ok: true,
      path: PANEL_PATH
    });
    expect(chromeMock.sidePanel.setOptions).toHaveBeenCalledWith(
      { path: PANEL_PATH, enabled: true },
      expect.any(Function)
    );
    expect(chromeMock.sidePanel.open).toHaveBeenCalledWith({ windowId: 1 }, expect.any(Function));
  });

  test("background extension-action listener resets the side panel to the list", async () => {
    globalThis.importScripts = jest.fn();
    jest.resetModules();
    require("../src/constants.js");
    require("../src/browserApi.js");
    require("../src/urlValidator.js");
    require("../src/navigationStrategy.js");
    require("../src/background.js");
    await Promise.resolve();

    const onClicked = chromeMock.action.onClicked.addListener.mock.calls.at(-1)[0];
    chromeMock.sidePanel.setOptions.mockClear();
    chromeMock.sidePanel.open.mockClear();
    await onClicked();

    expect(chromeMock.sidePanel.setOptions).toHaveBeenCalledWith(
      { path: PANEL_PATH, enabled: true },
      expect.any(Function)
    );
    expect(chromeMock.sidePanel.open).toHaveBeenCalledWith({ windowId: 1 }, expect.any(Function));
  });
});
