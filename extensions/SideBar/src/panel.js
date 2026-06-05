const { INITIAL_SITE_LIST } = globalThis.SideBarConstants;

const statusElement = document.getElementById("app-status");

if (statusElement) {
  statusElement.textContent = INITIAL_SITE_LIST.length === 0
    ? "The site list starts empty."
    : "Sites are ready.";
}

function getInitialSiteList() {
  return INITIAL_SITE_LIST;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { getInitialSiteList };
}

globalThis.SideBarPanel = { getInitialSiteList };
