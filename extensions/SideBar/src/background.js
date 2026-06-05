importScripts("./constants.js", "./browserApi.js", "./urlValidator.js", "./navigationStrategy.js");

const { configureDefaultPanel, navigateSidePanel, openInTab, resetPanelToList } = globalThis.SideBarNavigationStrategy;
const { getRuntimeApi } = globalThis.SideBarBrowserApi;

function configurePanel() {
  return configureDefaultPanel().catch(() => undefined);
}

function handleMessage(message, _sender, sendResponse) {
  if (!message || typeof message !== "object") {
    return false;
  }

  if (message.type === "navigate-side-panel") {
    navigateSidePanel(message.url).then(sendResponse, (error) => sendResponse({ ok: false, message: error.message }));
    return true;
  }

  if (message.type === "open-in-tab") {
    openInTab(message.url).then(sendResponse, (error) => sendResponse({ ok: false, message: error.message }));
    return true;
  }

  if (message.type === "reset-panel") {
    resetPanelToList().then(sendResponse, (error) => sendResponse({ ok: false, message: error.message }));
    return true;
  }

  return false;
}

function registerExtensionActionReset() {
  const runtime = getRuntimeApi();
  const action = globalThis.chrome?.action;

  runtime?.onMessage?.addListener?.(handleMessage);
  action?.onClicked?.addListener?.(() => {
    return resetPanelToList().catch(() => undefined);
  });
}

configurePanel();
registerExtensionActionReset();

globalThis.SideBarBackground = { configurePanel, handleMessage, registerExtensionActionReset };
