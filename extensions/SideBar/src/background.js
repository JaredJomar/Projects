((root) => {
  if (!root.SideBarNavigationStrategy && typeof importScripts === "function") {
    importScripts("./constants.js", "./browserApi.js", "./urlValidator.js", "./navigationStrategy.js");
  }

  const { configureDefaultPanel, navigateSidePanel, openInTab, resetPanelToList } = root.SideBarNavigationStrategy;
  const { getCommandsApi, getRuntimeApi, getSidePanelApi } = root.SideBarBrowserApi;
  const RETURN_TO_RAIL_COMMAND = "return-to-rail";

  function configurePanel() {
    const sidePanel = getSidePanelApi();

    sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: true })?.catch?.(() => undefined);
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
    const commands = getCommandsApi();
    const runtime = getRuntimeApi();
    const action = root.chrome?.action;

    runtime?.onMessage?.addListener?.(handleMessage);
    action?.onClicked?.addListener?.(() => {
      return resetPanelToList().catch(() => undefined);
    });
    commands?.onCommand?.addListener?.((command) => {
      if (command === RETURN_TO_RAIL_COMMAND) {
        return resetPanelToList().catch(() => undefined);
      }

      return undefined;
    });
  }

  configurePanel();
  registerExtensionActionReset();

  root.SideBarBackground = { RETURN_TO_RAIL_COMMAND, configurePanel, handleMessage, registerExtensionActionReset };
})(globalThis);
