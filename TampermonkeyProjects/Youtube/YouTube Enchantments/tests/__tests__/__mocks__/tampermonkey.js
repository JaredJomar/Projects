/**
 * Tampermonkey API Mock Helpers
 * Provides utilities for testing Tampermonkey-specific functionality
 */

/**
 * Creates a mock settings object
 * @param {Object} overrides - Settings to override
 * @returns {Object} Settings object
 */
export function createMockSettings(overrides = {}) {
  return {
    autoLikeEnabled: true,
    watchThreshold: 70,
    checkFrequency: 3,
    autoScrollEnabled: false,
    scrollSpeed: 50,
    adBlockBypassEnabled: true,
    loggerEnabled: true,
    autoLikeLiveStreams: false,
    autoLikeNonSubscribed: false,
    autoRedirectToVideos: true,
    hideGameSections: true,
    ...overrides
  };
}

/**
 * Sets up GM_getValue to return specific settings
 * @param {Object} settings - Settings object
 */
export function mockGMGetValue(settings = null) {
  const mockSettings = settings || createMockSettings();
  
  global.GM_getValue.mockImplementation((key, defaultValue) => {
    if (key === 'youtubeEnchantmentsSettings') {
      return JSON.stringify(mockSettings);
    }
    return defaultValue;
  });
  
  return mockSettings;
}

/**
 * Gets the last value passed to GM_setValue
 * @param {string} key - Storage key
 * @returns {any} Last saved value
 */
export function getLastGMSetValue(key = 'youtubeEnchantmentsSettings') {
  const calls = global.GM_setValue.mock.calls.filter(call => call[0] === key);
  if (calls.length === 0) {
    return null;
  }
  const lastCall = calls[calls.length - 1];
  const value = lastCall[1];
  
  // Try to parse if it's a JSON string
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/**
 * Asserts that GM_setValue was called with specific settings
 * @param {Object} expectedSettings - Expected settings object
 */
export function expectSettingsSaved(expectedSettings) {
  expect(global.GM_setValue).toHaveBeenCalledWith(
    'youtubeEnchantmentsSettings',
    JSON.stringify(expectedSettings)
  );
}

/**
 * Simulates corrupted settings in storage
 */
export function mockCorruptedSettings() {
  global.GM_getValue.mockImplementation((key, defaultValue) => {
    if (key === 'youtubeEnchantmentsSettings') {
      return 'invalid-json{corrupted';
    }
    return defaultValue;
  });
}

/**
 * Simulates empty settings in storage
 */
export function mockEmptySettings() {
  global.GM_getValue.mockImplementation((key, defaultValue) => {
    return defaultValue;
  });
}

/**
 * Resets all Tampermonkey mocks
 */
export function resetTampermonkeyMocks() {
  global.GM_getValue.mockClear();
  global.GM_setValue.mockClear();
  global.GM_registerMenuCommand.mockClear();
  if (global.GM_addStyle) {
    global.GM_addStyle.mockClear();
  }
}
