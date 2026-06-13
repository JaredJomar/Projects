((root) => {
  function getChrome() {
    return root.chrome ?? {};
  }

  function getStorageArea() {
    return getChrome().storage?.local ?? null;
  }

  function getSidePanelApi() {
    return getChrome().sidePanel ?? null;
  }

  function getTabsApi() {
    return getChrome().tabs ?? null;
  }

  function getRuntimeApi() {
    return getChrome().runtime ?? null;
  }

  function getCommandsApi() {
    return getChrome().commands ?? null;
  }

  function normalizeError(error) {
    if (error instanceof Error) {
      return error;
    }

    if (error && typeof error === "object" && typeof error.message === "string") {
      return new Error(error.message);
    }

    return new Error(String(error));
  }

  function getRuntimeLastError() {
    return getRuntimeApi()?.lastError ?? null;
  }

  function callChromeMethod(method, thisArg, args = []) {
    return new Promise((resolve, reject) => {
      let settled = false;

      const callback = (value) => {
        if (settled) {
          return;
        }

        settled = true;

        const runtimeError = getRuntimeLastError();

        if (runtimeError) {
          reject(normalizeError(runtimeError));
          return;
        }

        resolve(value);
      };

      try {
        const result = method.call(thisArg, ...args, callback);

        if (result && typeof result.then === "function") {
          result.then(
            (value) => {
              if (!settled) {
                settled = true;
                resolve(value);
              }
            },
            (error) => {
              if (!settled) {
                settled = true;
                reject(normalizeError(error));
              }
            }
          );
        }
      } catch (error) {
        settled = true;
        reject(normalizeError(error));
      }
    });
  }

  async function getActiveTab() {
    const tabs = getTabsApi();

    if (!tabs?.query) {
      throw new Error("Tabs API is unavailable.");
    }

    const activeTabs = await callChromeMethod(tabs.query, tabs, [{ active: true, currentWindow: true }]);
    return Array.isArray(activeTabs) ? activeTabs[0] ?? null : null;
  }

  const browserApi = Object.freeze({
    callChromeMethod,
    getCommandsApi,
    getChrome,
    getStorageArea,
    getSidePanelApi,
    getTabsApi,
    getRuntimeApi,
    getActiveTab
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = browserApi;
  }

  root.SideBarBrowserApi = browserApi;
})(globalThis);
