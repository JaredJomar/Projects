((root) => {
  const fallbackConstants = root.SideBarConstants ?? require("./constants.js");
  const fallbackUrlValidator = root.SideBarUrlValidator ?? require("./urlValidator.js");
  const fallbackNavigationStrategy = root.SideBarNavigationStrategy ?? require("./navigationStrategy.js");
  const { FALLBACK_VIEW_MODE_PARAM, VIEW_MODES } = fallbackConstants;

  const FALLBACK_WARNING_TEXT =
    "Some browser extensions may not run in fallback mode. Use Open in Tab for full browser-extension behavior.";
  const FALLBACK_EMBEDDING_TEXT = "If this site does not appear, it may block sidebar embedding. Use Open in Tab instead.";
  const FALLBACK_FAILURE_TEXT = "This site could not be embedded in fallback mode. Use Open in Tab instead.";

function readFallbackUrl(locationRef = globalThis.location) {
  const href = locationRef?.href ?? "";

  if (!href) {
    return "";
  }

  return new URL(href).searchParams.get(fallbackConstants.FALLBACK_URL_PARAM) ?? "";
}

function readFallbackViewMode(locationRef = globalThis.location) {
  const href = locationRef?.href ?? "";

  if (!href) {
    return VIEW_MODES.mobile;
  }

  const viewMode = new URL(href).searchParams.get(FALLBACK_VIEW_MODE_PARAM) ?? "";

  return Object.values(VIEW_MODES).includes(viewMode) ? viewMode : VIEW_MODES.mobile;
}

function isFallbackRequest(locationRef = globalThis.location) {
  return Boolean(readFallbackUrl(locationRef));
}

function createFallbackPanelApp(options = {}) {
  const documentRef = options.documentRef ?? globalThis.document;
  const locationRef = options.locationRef ?? globalThis.location;
  const navigationStrategy = options.navigationStrategy ?? fallbackNavigationStrategy;
  const urlValidator = options.urlValidator ?? fallbackUrlValidator;
  const listPanel = documentRef.getElementById("list-panel");
  const fallbackPanel = documentRef.getElementById("fallback-panel");
  const warning = documentRef.getElementById("fallback-warning");
  const message = documentRef.getElementById("fallback-message");
  const backRailButton = documentRef.getElementById("fallback-back-rail");
  const openTabButton = documentRef.getElementById("fallback-open-tab");
  const frame = documentRef.getElementById("fallback-frame");
  let currentUrl = "";
  let currentViewMode = VIEW_MODES.mobile;

  function showFallbackShell() {
    if (listPanel) {
      listPanel.hidden = true;
    }

    if (fallbackPanel) {
      fallbackPanel.hidden = false;
    }
  }

  function setMessage(text, tone = "neutral") {
    if (!message) {
      return;
    }

    message.textContent = text;
    message.dataset.tone = tone;
  }

  function applyViewMode() {
    currentViewMode = readFallbackViewMode(locationRef);

    if (fallbackPanel) {
      fallbackPanel.dataset.viewMode = currentViewMode;
    }

    if (frame) {
      frame.dataset.viewMode = currentViewMode;
    }
  }

  function showEmbeddingFailure() {
    setMessage(FALLBACK_FAILURE_TEXT, "error");
  }

  async function handleOpenInTab() {
    if (!currentUrl) {
      return null;
    }

    return navigationStrategy.openInTab(currentUrl);
  }

  async function handleReturnToRail() {
    return navigationStrategy.resetPanelToList();
  }

  function handleKeyDown(event) {
    if (event?.ctrlKey === true && String(event.key).toLowerCase() === "b") {
      event.preventDefault?.();
      return handleReturnToRail();
    }

    return undefined;
  }

  function init() {
    showFallbackShell();

    if (warning) {
      warning.textContent = FALLBACK_WARNING_TEXT;
    }

    try {
      currentUrl = urlValidator.normalizeSiteUrl(readFallbackUrl(locationRef));
      applyViewMode();
      setMessage(FALLBACK_EMBEDDING_TEXT);

      if (frame) {
        frame.src = currentUrl;
        frame.addEventListener("error", showEmbeddingFailure);
      }

      if (openTabButton) {
        openTabButton.disabled = false;
        openTabButton.addEventListener("click", handleOpenInTab);
      }

      if (backRailButton) {
        backRailButton.disabled = false;
        backRailButton.addEventListener("click", handleReturnToRail);
      }

      documentRef.addEventListener?.("keydown", handleKeyDown);
    } catch (error) {
      currentUrl = "";
      setMessage(error.message || FALLBACK_FAILURE_TEXT, "error");

      if (openTabButton) {
        openTabButton.disabled = true;
      }

      if (backRailButton) {
        backRailButton.disabled = false;
        backRailButton.addEventListener("click", handleReturnToRail);
      }
    }
  }

  return Object.freeze({
    init,
    handleOpenInTab,
    handleKeyDown,
    handleReturnToRail,
    showEmbeddingFailure,
    getCurrentUrl: () => currentUrl,
    getCurrentViewMode: () => currentViewMode
  });
}

const fallbackPanel = Object.freeze({
  FALLBACK_EMBEDDING_TEXT,
  FALLBACK_FAILURE_TEXT,
  FALLBACK_WARNING_TEXT,
  createFallbackPanelApp,
  isFallbackRequest,
  readFallbackViewMode,
  readFallbackUrl
});

  if (typeof module !== "undefined" && module.exports) {
    module.exports = fallbackPanel;
  }

  root.SideBarFallbackPanel = fallbackPanel;
})(globalThis);
