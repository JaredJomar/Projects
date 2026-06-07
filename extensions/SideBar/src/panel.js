((root) => {
  const panelConstants = root.SideBarConstants ?? require("./constants.js");
  const defaultBrowserApi = root.SideBarBrowserApi ?? require("./browserApi.js");
  const defaultSiteStore = root.SideBarSiteStore ?? require("./siteStore.js");
  const defaultNavigationStrategy = root.SideBarNavigationStrategy ?? require("./navigationStrategy.js");

  const EMPTY_STATE_TEXT = "No sites yet. Add a website to open it from the sidebar.";
  const { DEFAULT_PANEL_UI, DEFAULT_SETTINGS, DEFAULT_SITE_VIEW_MODE, PANEL_UI_WIDTH, SITE_VIEW_MODES, VIEW_MODES } = panelConstants;

function getInitialSiteList() {
  return panelConstants.INITIAL_SITE_LIST;
}

function createElement(documentRef, tagName, attributes = {}, textContent = "") {
  const element = documentRef.createElement(tagName);

  for (const [name, value] of Object.entries(attributes)) {
    if (name === "className") {
      element.className = value;
    } else if (name.startsWith("aria-") || name.startsWith("data-")) {
      element.setAttribute(name, value);
    } else {
      element[name] = value;
    }
  }

  if (textContent) {
    element.textContent = textContent;
  }

  return element;
}

function createPanelApp(options = {}) {
  const documentRef = options.documentRef ?? globalThis.document;
  const windowRef = options.windowRef ?? globalThis;
  const browserApi = options.browserApi ?? defaultBrowserApi;
  const siteStore = options.siteStore ?? defaultSiteStore;
  const navigationStrategy = options.navigationStrategy ?? defaultNavigationStrategy;
  const panelRoot = documentRef.getElementById("list-panel");
  const drawer = documentRef.getElementById("panel-drawer");
  const list = documentRef.getElementById("site-list");
  const emptyState = documentRef.getElementById("empty-state");
  const selectedSiteDetails = documentRef.getElementById("selected-site-details");
  const status = documentRef.getElementById("panel-status");
  const websiteView = documentRef.getElementById("website-view");
  const websiteFrame = documentRef.getElementById("website-frame");
  const addCurrentSiteButton = documentRef.getElementById("add-current-site");
  const closeSidebarButton = documentRef.getElementById("close-sidebar");
  const globalViewModeSelect = documentRef.getElementById("global-view-mode");
  const pinSidebarButton = documentRef.getElementById("pin-sidebar");
  const resizeHandle = documentRef.getElementById("panel-resize-handle");
  let currentSettings = DEFAULT_SETTINGS;
  let currentPanelUi = DEFAULT_PANEL_UI;
  let currentSites = [];
  let draggedSiteId = "";
  let selectedSiteId = "";

  function setStatus(message, tone = "neutral") {
    if (!status) {
      return;
    }

    status.textContent = message;
    status.dataset.tone = tone;
  }

  function createSiteIcon(site) {
    const iconWrapper = createElement(documentRef, "div", { className: "site-list__icon" }, "");

    if (!site.iconUrl) {
      iconWrapper.textContent = (site.title || site.url || "S").slice(0, 1).toUpperCase();
      return iconWrapper;
    }

    const icon = createElement(documentRef, "img", {
      alt: "",
      className: "site-list__icon-image",
      loading: "lazy",
      referrerPolicy: "no-referrer",
      src: site.iconUrl
    });

    icon.addEventListener("error", () => {
      iconWrapper.replaceChildren((site.title || site.url || "S").slice(0, 1).toUpperCase());
    });
    iconWrapper.appendChild(icon);

    return iconWrapper;
  }

  function applyPanelUi(panelUi) {
    currentPanelUi = panelUi ?? DEFAULT_PANEL_UI;
    selectedSiteId = typeof currentPanelUi.selectedSiteId === "string" ? currentPanelUi.selectedSiteId : selectedSiteId;
    const drawerOpen = currentPanelUi.open === true || currentPanelUi.pinned === true;

    if (drawer) {
      drawer.hidden = !drawerOpen;
      drawer.style.setProperty("--drawer-width", `${currentPanelUi.width}px`);
    }

    if (panelRoot) {
      panelRoot.dataset.drawerOpen = drawerOpen ? "true" : "false";
      panelRoot.dataset.sidebarPinned = currentPanelUi.pinned ? "true" : "false";
    }

    if (pinSidebarButton) {
      pinSidebarButton.setAttribute("aria-pressed", currentPanelUi.pinned ? "true" : "false");
      pinSidebarButton.textContent = currentPanelUi.pinned ? "Unpin" : "Pin";
    }
  }

  async function updatePanelUi(partialSettings) {
    const nextPanelUi = await siteStore.updatePanelUiSettings(partialSettings);
    applyPanelUi(nextPanelUi);

    return nextPanelUi;
  }

  async function openDrawer() {
    return updatePanelUi({ open: true });
  }

  function showControlsMode() {
    if (drawer) {
      drawer.dataset.mode = "controls";
    }

    if (websiteView) {
      websiteView.hidden = true;
    }
  }

  function showWebsiteMode(site) {
    const viewMode = siteStore.resolveSiteViewMode(site, currentSettings);

    if (drawer) {
      drawer.dataset.mode = "website";
    }

    if (websiteView) {
      websiteView.hidden = false;
    }

    if (websiteFrame) {
      websiteFrame.src = site.url;
      websiteFrame.dataset.viewMode = viewMode;
    }
  }

  function createSiteViewModeSelect(site) {
    const label = createElement(documentRef, "label", { className: "site-list__view-mode" });
    const labelText = createElement(documentRef, "span", {}, "View");
    const select = createElement(documentRef, "select", { className: "site-list__select" });
    const options = [
      [SITE_VIEW_MODES.default, "Use default"],
      [SITE_VIEW_MODES.mobile, "Mobile"],
      [SITE_VIEW_MODES.desktop, "Desktop"]
    ];

    for (const [value, text] of options) {
      const option = createElement(documentRef, "option", { value }, text);
      select.appendChild(option);
    }

    select.value = site.viewMode || DEFAULT_SITE_VIEW_MODE;
    select.addEventListener("change", () => handleSiteViewModeChange(site.id, select.value));
    label.append(labelText, select);

    return label;
  }

  function renderSelectedSite(site) {
    if (!selectedSiteDetails) {
      return;
    }

    selectedSiteDetails.replaceChildren();

    if (!site) {
      selectedSiteDetails.appendChild(
        createElement(documentRef, "p", { className: "selected-site-details__hint" }, "Select a saved site from the rail.")
      );
      return;
    }

    const main = createElement(documentRef, "div", { className: "selected-site-details__main" });
    const details = createElement(documentRef, "div", { className: "site-list__details" });
    const title = createElement(documentRef, "span", { className: "site-list__title" }, site.title || site.url);
    const url = createElement(documentRef, "span", { className: "site-list__url" }, site.url);
    const actions = createElement(documentRef, "div", { className: "site-list__actions" });
    const openButton = createElement(documentRef, "button", { type: "button", className: "site-list__button" }, "Open");
    const removeButton = createElement(documentRef, "button", { type: "button", className: "site-list__button site-list__button--danger" }, "Remove");

    openButton.addEventListener("click", () => handleOpenSite(site));
    removeButton.addEventListener("click", () => handleRemoveSite(site.id));

    details.append(title, url);
    main.append(createSiteIcon(site), details);
    actions.append(createSiteViewModeSelect(site), openButton, removeButton);
    selectedSiteDetails.append(main, actions);
  }

  function renderSettings(settings) {
    currentSettings = settings ?? DEFAULT_SETTINGS;

    if (globalViewModeSelect) {
      globalViewModeSelect.value = currentSettings.globalViewMode || VIEW_MODES.mobile;
    }
  }

  function renderSites(sites) {
    currentSites = sites;
    list.replaceChildren();
    emptyState.textContent = EMPTY_STATE_TEXT;
    emptyState.hidden = sites.length > 0;

    if (sites.length === 0) {
      selectedSiteId = "";
      showControlsMode();
      renderSelectedSite(null);
      return;
    }

    if (!sites.some((site) => site.id === selectedSiteId)) {
      selectedSiteId = sites[0].id;
    }

    for (const site of sites) {
      const selected = site.id === selectedSiteId;
      const item = createElement(documentRef, "li", {
        className: "site-list__item",
        draggable: true,
        "data-site-id": site.id
      });
      const railButton = createElement(documentRef, "button", {
        type: "button",
        className: selected ? "site-list__rail-button site-list__rail-button--selected" : "site-list__rail-button",
        "aria-label": `Open ${site.title || site.url}`,
        title: site.title || site.url
      });

      if (selected) {
        railButton.setAttribute("aria-current", "true");
      }

      railButton.appendChild(createSiteIcon(site));
      item.addEventListener("dragstart", (event) => handleRailDragStart(event, site.id));
      item.addEventListener("dragover", handleRailDragOver);
      item.addEventListener("drop", (event) => handleRailDrop(event, site.id));
      railButton.addEventListener("click", async () => {
        selectedSiteId = site.id;
        renderSites(sites);
        showWebsiteMode(site);
        await updatePanelUi({ open: true, selectedSiteId: site.id });
      });
      item.appendChild(railButton);
      list.appendChild(item);
    }

    renderSelectedSite(sites.find((site) => site.id === selectedSiteId));
  }

  function handleRailDragStart(event, siteId) {
    draggedSiteId = siteId;
    event?.dataTransfer?.setData?.("text/plain", siteId);
  }

  function handleRailDragOver(event) {
    event?.preventDefault?.();
  }

  async function handleRailDrop(event, targetSiteId) {
    event?.preventDefault?.();
    const sourceSiteId = event?.dataTransfer?.getData?.("text/plain") || draggedSiteId;
    draggedSiteId = "";

    return handleReorderSites(sourceSiteId, targetSiteId);
  }

  async function handleReorderSites(sourceSiteId, targetSiteId) {
    if (!sourceSiteId || !targetSiteId || sourceSiteId === targetSiteId) {
      return currentSites;
    }

    const orderedSiteIds = currentSites.map((site) => site.id);
    const sourceIndex = orderedSiteIds.indexOf(sourceSiteId);
    const targetIndex = orderedSiteIds.indexOf(targetSiteId);

    if (sourceIndex === -1 || targetIndex === -1) {
      return currentSites;
    }

    orderedSiteIds.splice(sourceIndex, 1);
    orderedSiteIds.splice(targetIndex, 0, sourceSiteId);
    const reorderedSites = await siteStore.reorderSites(orderedSiteIds);
    renderSites(reorderedSites);

    return reorderedSites;
  }

  async function refreshSites() {
    const [sites, settings] = await Promise.all([siteStore.listSites(), siteStore.readSettings()]);
    renderSettings(settings);
    renderSites(sites);
    return sites;
  }

  async function handleRemoveSite(siteId) {
    await siteStore.removeSite(siteId);
    setStatus("Site removed.", "success");
    await refreshSites();
  }

  async function handleOpenSite(site) {
    const viewMode = siteStore.resolveSiteViewMode(site, currentSettings);
    const result = await navigationStrategy.navigateSidePanel(site.url, { directUrlEnabled: false, viewMode });

    if (result?.ok === false) {
      setStatus(result.message || "Unable to open this site from the sidebar.", "error");
      return result;
    }

    setStatus("Opening site from the sidebar.", "success");
    return result;
  }

  async function handleAddCurrentSite() {
    try {
      const activeTab = await browserApi.getActiveTab();

      if (!activeTab?.url) {
        throw new Error("Current tab URL is unavailable.");
      }

      const site = await siteStore.addSite({
        url: activeTab.url,
        title: activeTab.title || "",
        iconUrl: activeTab.favIconUrl || "",
        viewMode: DEFAULT_SITE_VIEW_MODE
      });
      selectedSiteId = site.id;
      setStatus("Current page added.", "success");
      await updatePanelUi({ open: true, selectedSiteId: site.id });
      await refreshSites();
    } catch (error) {
      setStatus(error.message || "Unable to add the current page.", "error");
    }
  }

  async function handleGlobalViewModeChange() {
    try {
      const settings = await siteStore.updateGlobalViewMode(globalViewModeSelect.value);
      renderSettings(settings);
      setStatus("Default display preference saved.", "success");
    } catch (error) {
      setStatus(error.message || "Unable to save display preference.", "error");
    }
  }

  async function handleSiteViewModeChange(siteId, viewMode) {
    try {
      await siteStore.updateSiteViewMode(siteId, viewMode);
      setStatus("Site display preference saved.", "success");
      await refreshSites();
    } catch (error) {
      setStatus(error.message || "Unable to save site display preference.", "error");
    }
  }

  async function handlePinSidebar() {
    await updatePanelUi({ pinned: !currentPanelUi.pinned, open: true });
  }

  async function handleCloseSidebar() {
    if (currentPanelUi.pinned) {
      return;
    }

    await updatePanelUi({ open: false });
  }

  function getVisibleDrawerWidth() {
    if (drawer?.hidden || typeof windowRef.innerWidth !== "number") {
      return currentPanelUi.width;
    }

    return clampWidth(windowRef.innerWidth - 64);
  }

  function clampWidth(width) {
    const numericWidth = Number(width);

    if (!Number.isFinite(numericWidth)) {
      return currentPanelUi.width;
    }

    return Math.min(PANEL_UI_WIDTH.max, Math.max(PANEL_UI_WIDTH.min, Math.round(numericWidth)));
  }

  async function handleResizeTo(width) {
    return updatePanelUi({ width: clampWidth(width), open: true });
  }

  async function handleRememberVisibleWidth() {
    if (currentPanelUi.open !== true && currentPanelUi.pinned !== true) {
      return currentPanelUi;
    }

    return updatePanelUi({ width: getVisibleDrawerWidth() });
  }

  function handleKeyDown(event) {
    return undefined;
  }

  function handleResizeStart(event) {
    event?.preventDefault?.();

    const startX = event?.clientX ?? 0;
    const startWidth = currentPanelUi.width;
    const ownerDocument = documentRef;

    const handleMove = (moveEvent) => {
      const nextWidth = clampWidth(startWidth + startX - (moveEvent?.clientX ?? startX));
      currentPanelUi = { ...currentPanelUi, width: nextWidth };

      if (drawer) {
        drawer.style.setProperty("--drawer-width", `${nextWidth}px`);
      }
    };

    const handleEnd = async () => {
      ownerDocument.removeEventListener("mousemove", handleMove);
      ownerDocument.removeEventListener("mouseup", handleEnd);
      await handleResizeTo(currentPanelUi.width);
    };

    ownerDocument.addEventListener("mousemove", handleMove);
    ownerDocument.addEventListener("mouseup", handleEnd);
  }

  async function init() {
    const panelUi = await siteStore.readPanelUiSettings();
    applyPanelUi(panelUi);
    addCurrentSiteButton?.addEventListener("click", handleAddCurrentSite);
    closeSidebarButton?.addEventListener("click", handleCloseSidebar);
    documentRef.addEventListener?.("keydown", handleKeyDown);
    globalViewModeSelect?.addEventListener("change", handleGlobalViewModeChange);
    pinSidebarButton?.addEventListener("click", handlePinSidebar);
    resizeHandle?.addEventListener("mousedown", handleResizeStart);
    windowRef.addEventListener?.("resize", handleRememberVisibleWidth);
    await refreshSites();
  }

  return Object.freeze({
    init,
    refreshSites,
    renderSites,
    handleAddCurrentSite,
    handleGlobalViewModeChange,
    handleCloseSidebar,
    handleKeyDown,
    handlePinSidebar,
    handleRememberVisibleWidth,
    handleReorderSites,
    handleResizeTo,
    handleSiteViewModeChange,
    handleRemoveSite,
    handleOpenSite,
    setStatus
  });
}

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { EMPTY_STATE_TEXT, createPanelApp, getInitialSiteList };
  } else {
    root.SideBarPanel = { EMPTY_STATE_TEXT, createPanelApp, getInitialSiteList };
    root.addEventListener("DOMContentLoaded", () => {
      if (root.SideBarFallbackPanel?.isFallbackRequest()) {
        root.SideBarFallbackPanel.createFallbackPanelApp().init();
        return;
      }

      createPanelApp().init();
    });
  }
})(globalThis);
