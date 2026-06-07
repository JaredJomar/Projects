const chromeMock = require("./__mocks__/chrome.js");
const siteStore = require("../src/siteStore.js");
const { EMPTY_STATE_TEXT, createPanelApp } = require("../src/panel.js");

function setPanelMarkup() {
  document.body.innerHTML = `
    <main class="panel">
      <section id="panel-drawer" class="panel__drawer" hidden>
        <button id="panel-resize-handle" type="button">Resize</button>
        <button id="pin-sidebar" type="button" aria-pressed="false">Pin</button>
        <button id="close-sidebar" type="button">Close</button>
        <select id="global-view-mode">
          <option value="mobile">Mobile</option>
          <option value="desktop">Desktop</option>
        </select>
        <p id="panel-status" role="status"></p>
        <p id="empty-state"></p>
        <div id="selected-site-details"></div>
        <section id="website-view" hidden>
          <iframe id="website-frame" title="Selected website"></iframe>
        </section>
      </section>
      <aside class="panel-rail">
        <ul id="site-list"></ul>
        <button id="add-current-site" type="button">+</button>
      </aside>
    </main>
  `;
}

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function addStoredSite(app, siteInput) {
  const site = await siteStore.addSite(siteInput);
  await app.refreshSites();
  return site;
}

describe("panel UI", () => {
  let navigationStrategy;

  beforeEach(() => {
    chromeMock.__resetStorageState();
    chromeMock.runtime.lastError = undefined;
    setPanelMarkup();
    navigationStrategy = {
      navigateSidePanel: jest.fn(async () => ({ ok: true, status: "extension-panel-fallback" }))
    };
  });

  test("renders the exact empty state when storage has no sites", async () => {
    const app = createPanelApp({ documentRef: document, siteStore, navigationStrategy });

    await app.init();

    expect(document.getElementById("empty-state").textContent).toBe(EMPTY_STATE_TEXT);
    expect(document.getElementById("empty-state").hidden).toBe(false);
    expect(document.querySelectorAll("#site-list li")).toHaveLength(0);
  });

  test("starts as rail-only with no visible app header", async () => {
    const app = createPanelApp({ documentRef: document, siteStore, navigationStrategy });

    await app.init();

    expect(document.getElementById("panel-drawer").hidden).toBe(true);
    expect(document.querySelector("h1")?.textContent || "").not.toBe("Rail");
    expect(document.getElementById("site-url")).toBeNull();
  });

  test("renders a stored site as a reorderable rail icon with controls", async () => {
    const app = createPanelApp({ documentRef: document, siteStore, navigationStrategy });
    await app.init();

    await addStoredSite(app, { url: "https://example.com", title: "Example" });
    document.querySelector(".site-list__rail-button").click();
    await flushPromises();

    expect(document.getElementById("empty-state").hidden).toBe(true);
    expect(document.getElementById("panel-drawer").hidden).toBe(false);
    expect(document.querySelectorAll("#site-list li")).toHaveLength(1);
    expect(document.querySelector("#site-list li").draggable).toBe(true);
    expect(document.querySelector(".site-list__rail-button").getAttribute("aria-label")).toBe("Open Example");
    expect(document.querySelector(".site-list__rail-button .site-list__icon-image")).toBeNull();
    expect(document.querySelector(".site-list__rail-button .site-list__icon").textContent).toBe("E");
    expect(document.querySelector(".site-list__url").textContent).toBe("https://example.com");
    expect([...document.querySelectorAll("button")].map((button) => button.textContent)).toEqual([
      "Resize",
      "Pin",
      "Close",
      "Open",
      "Remove",
      "E",
      "+"
    ]);
  });

  test("removes the only site and restores the empty state", async () => {
    const app = createPanelApp({ documentRef: document, siteStore, navigationStrategy });
    await app.init();

    await addStoredSite(app, { url: "https://example.com", title: "Example" });
    document.querySelector(".site-list__rail-button").click();
    await flushPromises();
    document.querySelector(".site-list__button--danger").click();
    await flushPromises();

    expect(document.querySelectorAll("#site-list li")).toHaveLength(0);
    expect(document.getElementById("empty-state").hidden).toBe(false);
    expect(document.getElementById("empty-state").textContent).toBe(EMPTY_STATE_TEXT);
  });

  test("clicking a rail icon opens the selected website in the left drawer", async () => {
    const app = createPanelApp({ documentRef: document, siteStore, navigationStrategy });
    await app.init();

    await addStoredSite(app, { url: "https://example.com", title: "Example" });
    await flushPromises();
    document.querySelector(".site-list__rail-button").click();
    await flushPromises();

    expect(document.getElementById("panel-drawer").hidden).toBe(false);
    expect(document.getElementById("panel-drawer").dataset.mode).toBe("website");
    expect(document.getElementById("website-view").hidden).toBe(false);
    expect(document.getElementById("website-frame").src).toBe("https://example.com/");
    expect(document.getElementById("website-frame").dataset.viewMode).toBe("mobile");
    expect(navigationStrategy.navigateSidePanel).not.toHaveBeenCalled();
    expect(document.querySelector(".site-list__rail-button").getAttribute("aria-current")).toBe("true");
    expect(await siteStore.readPanelUiSettings()).toMatchObject({ open: true });
  });

  test("clicking Open navigates the selected site", async () => {
    const app = createPanelApp({ documentRef: document, siteStore, navigationStrategy });
    await app.init();

    await addStoredSite(app, { url: "https://example.com", title: "Example" });
    document.querySelector(".site-list__rail-button").click();
    await flushPromises();
    document.querySelector(".site-list__button").click();
    await flushPromises();

    expect(navigationStrategy.navigateSidePanel).toHaveBeenCalledWith("https://example.com", {
      directUrlEnabled: false,
      viewMode: "mobile"
    });
    expect(document.getElementById("panel-status").textContent).toBe("Opening site from the sidebar.");
  });

  test("closing and reopening remembers the selected rail site without navigation", async () => {
    const app = createPanelApp({ documentRef: document, siteStore, navigationStrategy });
    await app.init();

    await addStoredSite(app, { url: "https://one.example", title: "One" });
    await addStoredSite(app, { url: "https://two.example", title: "Two" });
    await flushPromises();
    const secondRailButton = document.querySelectorAll(".site-list__rail-button")[1];

    secondRailButton.click();
    await flushPromises();
    document.getElementById("close-sidebar").click();
    await flushPromises();
    secondRailButton.click();
    await flushPromises();

    expect(navigationStrategy.navigateSidePanel).not.toHaveBeenCalled();
    expect(document.querySelectorAll(".site-list__rail-button")[1].getAttribute("aria-current")).toBe("true");
    expect(document.querySelector(".site-list__url").textContent).toBe("https://two.example");
  });

  test("reorders rail sites and persists the new order", async () => {
    const app = createPanelApp({ documentRef: document, siteStore, navigationStrategy });
    await app.init();
    const firstSite = await addStoredSite(app, { url: "https://one.example", title: "One" });
    const secondSite = await addStoredSite(app, { url: "https://two.example", title: "Two" });

    await app.handleReorderSites(secondSite.id, firstSite.id);

    expect([...document.querySelectorAll("#site-list li")].map((item) => item.dataset.siteId)).toEqual([
      secondSite.id,
      firstSite.id
    ]);
    expect((await siteStore.listSites()).map((site) => site.id)).toEqual([secondSite.id, firstSite.id]);
  });

  test("renders a fallback letter icon in the rail when a site has no favicon", async () => {
    const app = createPanelApp({ documentRef: document, siteStore, navigationStrategy });
    await app.init();

    app.renderSites([
      {
        id: "site-without-icon",
        url: "https://example.com",
        title: "Example",
        iconUrl: "",
        viewMode: "default",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]);

    expect(document.querySelector(".site-list__rail-button .site-list__icon").textContent).toBe("E");
  });

  test("bottom plus button adds the current active tab with its favicon", async () => {
    chromeMock.tabs.query.mockResolvedValueOnce([
      {
        windowId: 1,
        url: "https://example.com/current",
        title: "Current Example",
        favIconUrl: "https://example.com/favicon.ico"
      }
    ]);
    const app = createPanelApp({ documentRef: document, siteStore, navigationStrategy });
    await app.init();

    document.getElementById("add-current-site").click();
    await flushPromises();

    expect(document.querySelector(".site-list__title").textContent).toBe("Current Example");
    expect(document.getElementById("panel-drawer").hidden).toBe(false);
    expect(document.querySelector(".site-list__url").textContent).toBe("https://example.com/current");
    expect(document.querySelector(".site-list__rail-button .site-list__icon-image").src).toBe("https://example.com/favicon.ico");
    expect(document.getElementById("panel-status").textContent).toBe("Current page added.");
  });

  test("pin, close, and resize persist drawer state", async () => {
    const app = createPanelApp({ documentRef: document, siteStore, navigationStrategy });
    await app.init();

    await app.handleResizeTo(444);
    document.getElementById("pin-sidebar").click();
    await flushPromises();

    expect(document.getElementById("panel-drawer").style.getPropertyValue("--drawer-width")).toBe("444px");
    expect(document.getElementById("pin-sidebar").getAttribute("aria-pressed")).toBe("true");
    expect(await siteStore.readPanelUiSettings()).toEqual({ open: true, pinned: true, selectedSiteId: "", width: 444 });

    document.getElementById("close-sidebar").click();
    await flushPromises();

    expect(document.getElementById("panel-drawer").hidden).toBe(false);
  });

  test("remembers visible drawer width when the side panel is resized", async () => {
    const windowRef = new EventTarget();
    windowRef.innerWidth = 520;
    const app = createPanelApp({ documentRef: document, siteStore, navigationStrategy, windowRef });
    await app.init();

    await app.handleResizeTo(360);
    windowRef.innerWidth = 464;
    windowRef.dispatchEvent(new Event("resize"));
    await flushPromises();

    expect(await siteStore.readPanelUiSettings()).toEqual({ open: true, pinned: false, selectedSiteId: "", width: 400 });
  });

  test("Ctrl+B inside the rail drawer does not close the drawer", async () => {
    const app = createPanelApp({ documentRef: document, siteStore, navigationStrategy });
    await app.init();

    await app.handleResizeTo(360);
    document.dispatchEvent(new KeyboardEvent("keydown", { ctrlKey: true, bubbles: true, key: "b" }));
    await flushPromises();

    expect(document.getElementById("panel-drawer").hidden).toBe(false);
    expect(navigationStrategy.navigateSidePanel).not.toHaveBeenCalled();
  });

  test("global and per-site display preferences affect navigation", async () => {
    const app = createPanelApp({ documentRef: document, siteStore, navigationStrategy });
    await app.init();

    document.getElementById("global-view-mode").value = "desktop";
    document.getElementById("global-view-mode").dispatchEvent(new Event("change", { bubbles: true }));
    await flushPromises();
    await addStoredSite(app, { url: "https://example.com", title: "Example" });
    document.querySelector(".site-list__rail-button").click();
    await flushPromises();

    document.querySelector(".site-list__button").click();
    await flushPromises();

    expect(navigationStrategy.navigateSidePanel).toHaveBeenLastCalledWith("https://example.com", {
      directUrlEnabled: false,
      viewMode: "desktop"
    });

    document.querySelector(".site-list__select").value = "mobile";
    document.querySelector(".site-list__select").dispatchEvent(new Event("change", { bubbles: true }));
    await flushPromises();
    document.querySelector(".site-list__button").click();
    await flushPromises();

    expect(navigationStrategy.navigateSidePanel).toHaveBeenLastCalledWith("https://example.com", {
      directUrlEnabled: false,
      viewMode: "mobile"
    });
  });
});
