const storageState = {};

function cloneStorageState() {
  return JSON.parse(JSON.stringify(storageState));
}

function resetStorageState() {
  for (const key of Object.keys(storageState)) {
    delete storageState[key];
  }
}

const chrome = {
  runtime: {
    lastError: undefined,
    onInstalled: { addListener: vi.fn() },
    onStartup: { addListener: vi.fn() },
    onMessage: { addListener: vi.fn() }
  },
  action: {
    onClicked: { addListener: vi.fn() }
  },
  commands: {
    onCommand: { addListener: vi.fn() }
  },
  storage: {
    local: {
      get: vi.fn(async (keys) => {
        if (keys === undefined) {
          return cloneStorageState();
        }

        if (typeof keys === "string") {
          return { [keys]: storageState[keys] };
        }

        if (Array.isArray(keys)) {
          return keys.reduce((result, key) => {
            result[key] = storageState[key];
            return result;
          }, {});
        }

        if (keys && typeof keys === "object") {
          return Object.keys(keys).reduce((result, key) => {
            result[key] = key in storageState ? storageState[key] : keys[key];
            return result;
          }, {});
        }

        return {};
      }),
      set: vi.fn(async (items) => {
        Object.assign(storageState, items);
        return undefined;
      }),
      remove: vi.fn(async (keys) => {
        const keyList = Array.isArray(keys) ? keys : [keys];

        for (const key of keyList) {
          delete storageState[key];
        }

        return undefined;
      }),
      clear: vi.fn(async () => {
        resetStorageState();
        return undefined;
      })
    }
  },
  sidePanel: {
    setPanelBehavior: vi.fn(async () => undefined),
    setOptions: vi.fn((_options, callback) => callback?.()),
    open: vi.fn((_options, callback) => callback?.())
  },
  tabs: {
    query: vi.fn(async () => [{ windowId: 1 }]),
    create: vi.fn(async () => undefined)
  },
  __storageState: storageState,
  __resetStorageState: resetStorageState
};

module.exports = chrome;
