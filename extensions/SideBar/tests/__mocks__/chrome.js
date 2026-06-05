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
    onInstalled: { addListener: jest.fn() },
    onStartup: { addListener: jest.fn() },
    onMessage: { addListener: jest.fn() }
  },
  action: {
    onClicked: { addListener: jest.fn() }
  },
  storage: {
    local: {
      get: jest.fn(async (keys) => {
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
      set: jest.fn(async (items) => {
        Object.assign(storageState, items);
        return undefined;
      }),
      remove: jest.fn(async (keys) => {
        const keyList = Array.isArray(keys) ? keys : [keys];

        for (const key of keyList) {
          delete storageState[key];
        }

        return undefined;
      }),
      clear: jest.fn(async () => {
        resetStorageState();
        return undefined;
      })
    }
  },
  sidePanel: {
    setOptions: jest.fn((_options, callback) => callback?.()),
    open: jest.fn((_options, callback) => callback?.())
  },
  tabs: {
    query: jest.fn(async () => [{ windowId: 1 }]),
    create: jest.fn(async () => undefined)
  },
  __storageState: storageState,
  __resetStorageState: resetStorageState
};

module.exports = chrome;
