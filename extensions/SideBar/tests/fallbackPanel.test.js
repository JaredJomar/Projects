const {
  FALLBACK_EMBEDDING_TEXT,
  FALLBACK_FAILURE_TEXT,
  FALLBACK_WARNING_TEXT,
  createFallbackPanelApp,
  isFallbackRequest,
  readFallbackViewMode,
  readFallbackUrl
} = require("../src/fallbackPanel.js");

function setFallbackMarkup() {
  document.body.innerHTML = `
    <main id="list-panel"></main>
    <section id="fallback-panel" hidden>
      <p id="fallback-warning"></p>
      <p id="fallback-message"></p>
      <button id="fallback-back-rail" type="button">Back to Rail</button>
      <button id="fallback-open-tab" type="button">Open in Tab</button>
      <iframe id="fallback-frame" title="Selected website fallback preview"></iframe>
    </section>
  `;
}

describe("fallback panel", () => {
  let navigationStrategy;

  beforeEach(() => {
    setFallbackMarkup();
    navigationStrategy = {
      openInTab: jest.fn(async (url) => ({ ok: true, status: "open-in-tab", url })),
      resetPanelToList: jest.fn(async () => ({ ok: true, status: "extension-panel-fallback", path: "src/panel.html" }))
    };
  });

  test("reads fallback URL requests from the panel query string", () => {
    const locationRef = { href: "chrome-extension://test/src/panel.html?fallbackUrl=https%3A%2F%2Fexample.com&viewMode=desktop" };

    expect(isFallbackRequest(locationRef)).toBe(true);
    expect(readFallbackUrl(locationRef)).toBe("https://example.com");
    expect(readFallbackViewMode(locationRef)).toBe("desktop");
  });

  test("renders fallback warning and assigns a validated iframe URL", () => {
    const app = createFallbackPanelApp({
      documentRef: document,
      locationRef: { href: "chrome-extension://test/src/panel.html?fallbackUrl=https%3A%2F%2Fexample.com&viewMode=mobile" },
      navigationStrategy
    });

    app.init();

    expect(document.getElementById("list-panel").hidden).toBe(true);
    expect(document.getElementById("fallback-panel").hidden).toBe(false);
    expect(document.getElementById("fallback-warning").textContent).toBe(FALLBACK_WARNING_TEXT);
    expect(document.getElementById("fallback-message").textContent).toBe(FALLBACK_EMBEDDING_TEXT);
    expect(document.getElementById("fallback-frame").src).toBe("https://example.com/");
    expect(document.getElementById("fallback-frame").dataset.viewMode).toBe("mobile");
  });

  test("shows an embedding failure message when the iframe cannot load", () => {
    const app = createFallbackPanelApp({
      documentRef: document,
      locationRef: { href: "chrome-extension://test/src/panel.html?fallbackUrl=https%3A%2F%2Fexample.com" },
      navigationStrategy
    });

    app.init();
    document.getElementById("fallback-frame").dispatchEvent(new Event("error"));

    expect(document.getElementById("fallback-message").textContent).toBe(FALLBACK_FAILURE_TEXT);
    expect(document.getElementById("fallback-message").dataset.tone).toBe("error");
  });

  test("Open in Tab validates and opens the fallback URL", async () => {
    const app = createFallbackPanelApp({
      documentRef: document,
      locationRef: { href: "chrome-extension://test/src/panel.html?fallbackUrl=example.com" },
      navigationStrategy
    });

    app.init();
    document.getElementById("fallback-open-tab").click();
    await Promise.resolve();

    expect(navigationStrategy.openInTab).toHaveBeenCalledWith("https://example.com");
  });

  test("Back to Rail button returns from fallback website view to the rail", async () => {
    const app = createFallbackPanelApp({
      documentRef: document,
      locationRef: { href: "chrome-extension://test/src/panel.html?fallbackUrl=https%3A%2F%2Fexample.com" },
      navigationStrategy
    });

    app.init();
    document.getElementById("fallback-back-rail").click();
    await Promise.resolve();

    expect(navigationStrategy.resetPanelToList).toHaveBeenCalledTimes(1);
  });

  test("Ctrl+B returns from fallback website view to the rail", async () => {
    const app = createFallbackPanelApp({
      documentRef: document,
      locationRef: { href: "chrome-extension://test/src/panel.html?fallbackUrl=https%3A%2F%2Fexample.com" },
      navigationStrategy
    });

    app.init();
    document.dispatchEvent(new KeyboardEvent("keydown", { ctrlKey: true, bubbles: true, key: "b" }));
    await Promise.resolve();

    expect(navigationStrategy.resetPanelToList).toHaveBeenCalledTimes(1);
  });

  test("unsafe fallback URLs do not reach Open in Tab or the iframe", () => {
    const unsafeUrls = [
      "javascript:alert(1)",
      "file:///tmp/test",
      "data:text/plain,hello",
      "chrome://settings",
      "chrome-extension://abc123/panel.html"
    ];

    for (const unsafeUrl of unsafeUrls) {
      setFallbackMarkup();

      const app = createFallbackPanelApp({
        documentRef: document,
        locationRef: { href: `chrome-extension://test/src/panel.html?fallbackUrl=${encodeURIComponent(unsafeUrl)}` },
        navigationStrategy
      });

      app.init();
      document.getElementById("fallback-open-tab").click();

      expect(document.getElementById("fallback-frame").src).toBe("");
      expect(document.getElementById("fallback-message").textContent).toMatch(/Unsupported URL scheme/);
      expect(document.getElementById("fallback-open-tab").disabled).toBe(true);
    }

    expect(navigationStrategy.openInTab).not.toHaveBeenCalled();
  });
});
