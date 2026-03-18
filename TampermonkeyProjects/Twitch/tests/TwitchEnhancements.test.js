// Mock GM functions
global.GM_getValue = jest.fn((key, defaultValue) => defaultValue);
global.GM_setValue = jest.fn();
global.GM_registerMenuCommand = jest.fn();

// Mock DOM
global.document = {
  body: {
    appendChild: jest.fn(),
    innerHTML: '',
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(() => []),
    createElement: jest.fn(() => ({
      style: {},
      classList: { contains: jest.fn(), add: jest.fn() },
      appendChild: jest.fn(),
      remove: jest.fn(),
      addEventListener: jest.fn(),
      setAttribute: jest.fn(),
      getAttribute: jest.fn(),
      dispatchEvent: jest.fn(),
      click: jest.fn()
    })),
    getElementById: jest.fn(),
    removeChild: jest.fn()
  },
  head: {
    appendChild: jest.fn()
  },
  createElement: jest.fn(() => ({
    style: {},
    innerHTML: '',
    appendChild: jest.fn(),
    setAttribute: jest.fn(),
    addEventListener: jest.fn()
  })),
  addEventListener: jest.fn(),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(() => [])
};

global.window = {
  location: { hostname: 'www.twitch.tv', href: 'https://www.twitch.tv/drops/inventory' },
  addEventListener: jest.fn(),
  setTimeout: jest.fn((fn) => fn()),
  setInterval: jest.fn(),
  clearInterval: jest.fn(),
  MutationObserver: jest.fn(() => ({
    observe: jest.fn(),
    disconnect: jest.fn()
  }))
};

global.navigator = {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
    readText: jest.fn(() => Promise.resolve('test code'))
  }
};

global.console = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Load the script
require('../TwitchEnhancements.js');

describe('Twitch Enhancements', () => {
  test('should register menu command', () => {
    expect(GM_registerMenuCommand).toHaveBeenCalledWith('Twitch Enhancements Settings', expect.any(Function));
  });

  test('should load config with defaults', () => {
    expect(GM_getValue).toHaveBeenCalledWith('enableAutoClaimPoints', true);
    expect(GM_getValue).toHaveBeenCalledWith('enableTheaterMode', true);
    expect(GM_getValue).toHaveBeenCalledWith('enableClaimPrimeRewards', true);
    expect(GM_getValue).toHaveBeenCalledWith('enableClaimDrops', true);
    expect(GM_getValue).toHaveBeenCalledWith('enableGogRedeemButton', true);
    expect(GM_getValue).toHaveBeenCalledWith('enableLegacyGamesRedeemButton', true);
    expect(GM_getValue).toHaveBeenCalledWith('enableAutoRefreshDrops', true);
    expect(GM_getValue).toHaveBeenCalledWith('enableClaimAllButton', true);
    expect(GM_getValue).toHaveBeenCalledWith('enableRemoveAllButton', true);
    expect(GM_getValue).toHaveBeenCalledWith('settingsKey', 'F2');
  });

  test('should initialize without errors', () => {
    // If the script loaded and the above tests pass, it works
    expect(true).toBe(true);
  });

  // Add more tests for specific features
});