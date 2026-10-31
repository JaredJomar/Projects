/**
 * Global Test Setup for YouTube Enchantments Tests
 * This file runs before all test files and sets up necessary mocks
 */

import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// ==============================================
// TAMPERMONKEY API MOCKS
// ==============================================

global.GM_getValue = vi.fn((key, defaultValue) => {
  const mockStorage = {
    youtubeEnchantmentsSettings: JSON.stringify({
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
      hideGameSections: true
    })
  };
  return mockStorage[key] !== undefined ? mockStorage[key] : defaultValue;
});

global.GM_setValue = vi.fn((key, value) => {
  // Mock implementation - just return success
  return Promise.resolve();
});

global.GM_registerMenuCommand = vi.fn((name, callback) => {
  // Mock implementation
  return 'mock-menu-id';
});

global.GM_addStyle = vi.fn((css) => {
  // Mock implementation - could add to document.head if needed
  return true;
});

// ==============================================
// BROWSER API MOCKS
// ==============================================

// Mock window methods
window.scrollBy = vi.fn();
window.scrollTo = vi.fn();
window.getComputedStyle = vi.fn(() => ({
  display: 'block',
  visibility: 'visible',
  zIndex: '1000'
}));

// Mock MutationObserver
global.MutationObserver = vi.fn(function(callback) {
  this.observe = vi.fn();
  this.disconnect = vi.fn();
  this.takeRecords = vi.fn(() => []);
  this._callback = callback; // Store callback for manual triggering
  this._trigger = (mutations) => {
    if (this._callback) {
      this._callback(mutations, this);
    }
  };
  // Store instance globally for test access
  if (!global._mutationObservers) {
    global._mutationObservers = [];
  }
  global._mutationObservers.push(this);
});

// ==============================================
// YOUTUBE PLAYER API MOCKS
// ==============================================

global.YT = {
  Player: vi.fn(function(elementId, config) {
    this.elementId = elementId;
    this.config = config;
    this.videoId = config.videoId || 'test123';
    
    // Mock player methods
    this.getCurrentTime = vi.fn(() => 30);
    this.getDuration = vi.fn(() => 100);
    this.playVideo = vi.fn();
    this.pauseVideo = vi.fn();
    this.stopVideo = vi.fn();
    this.seekTo = vi.fn();
    this.getPlayerState = vi.fn(() => YT.PlayerState.PLAYING);
    this.getVolume = vi.fn(() => 50);
    this.setVolume = vi.fn();
    this.mute = vi.fn();
    this.unMute = vi.fn();
    this.isMuted = vi.fn(() => false);
    
    // Store instance for test access
    if (!global._ytPlayers) {
      global._ytPlayers = [];
    }
    global._ytPlayers.push(this);
    
    // Trigger onReady callback asynchronously
    if (config.events && config.events.onReady) {
      setTimeout(() => config.events.onReady({ target: this }), 0);
    }
  }),
  
  PlayerState: {
    UNSTARTED: -1,
    ENDED: 0,
    PLAYING: 1,
    PAUSED: 2,
    BUFFERING: 3,
    CUED: 5,
    AD_STARTED: 1081
  },
  
  get: vi.fn(() => null)
};

// Mock YT.Player.prototype methods
if (global.YT && global.YT.Player) {
  Object.assign(global.YT.Player.prototype, {
    destroy: vi.fn(),
    getIframe: vi.fn(() => document.createElement('iframe'))
  });
}

// ==============================================
// DOM HELPERS
// ==============================================

/**
 * Creates a mock YouTube like button element
 * @param {boolean} isPressed - Whether button is pressed (liked)
 * @returns {HTMLElement}
 */
global.createMockLikeButton = (isPressed = false) => {
  const button = document.createElement('button');
  button.className = 'yt-spec-button-shape-next yt-spec-button-shape-next--tonal';
  button.setAttribute('aria-pressed', isPressed.toString());
  button.setAttribute('aria-label', 'like this video');
  
  const icon = document.createElement('div');
  icon.className = 'yt-spec-touch-feedback-shape__fill';
  button.appendChild(icon);
  
  return button;
};

/**
 * Creates a mock subscribe button element
 * @param {boolean} isSubscribed - Whether user is subscribed
 * @returns {HTMLElement}
 */
global.createMockSubscribeButton = (isSubscribed = false) => {
  const button = document.createElement('button');
  button.className = isSubscribed ? 'yt-spec-button-shape-next--mono' : 'yt-spec-button-shape-next--filled';
  button.setAttribute('aria-label', isSubscribed ? 'Unsubscribe' : 'Subscribe');
  
  const text = document.createElement('span');
  text.textContent = isSubscribed ? 'Subscribed' : 'Subscribe';
  button.appendChild(text);
  
  return button;
};

/**
 * Creates a mock video player element
 * @returns {HTMLElement}
 */
global.createMockVideoPlayer = () => {
  const player = document.createElement('div');
  player.id = 'movie_player';
  player.className = 'html5-video-player';
  
  const video = document.createElement('video');
  video.className = 'html5-main-video';
  
  // Mock readonly properties
  Object.defineProperty(video, 'currentTime', {
    value: 30,
    writable: true
  });
  Object.defineProperty(video, 'duration', {
    value: 100,
    writable: true
  });
  
  player.appendChild(video);
  return player;
};

/**
 * Creates a mock error screen element
 * @returns {HTMLElement}
 */
global.createMockErrorScreen = () => {
  const errorScreen = document.createElement('div');
  errorScreen.className = 'ytp-error';
  
  const errorMessage = document.createElement('div');
  errorMessage.className = 'ytp-error-content';
  errorMessage.textContent = 'An error occurred. Please try again later.';
  
  errorScreen.appendChild(errorMessage);
  return errorScreen;
};

/**
 * Creates a mock game section element
 * @param {string} language - Language for text content ('en' or 'es')
 * @returns {HTMLElement}
 */
global.createMockGameSection = (language = 'en') => {
  const section = document.createElement('div');
  section.className = 'ytd-rich-section-renderer';
  section.setAttribute('is-gaming', '');
  
  const title = document.createElement('h2');
  title.textContent = language === 'es' ? 'Gaming' : 'Gaming';
  section.appendChild(title);
  
  return section;
};

// ==============================================
// CONSOLE MOCKS
// ==============================================

// Store original console methods
global._originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info
};

// Mock console methods to suppress output during tests
// (can be restored in individual tests if needed)
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn()
};

// ==============================================
// TEST UTILITIES
// ==============================================

/**
 * Resets all global mocks to their initial state
 */
global.resetAllMocks = () => {
  vi.clearAllMocks();
  global._mutationObservers = [];
  global._ytPlayers = [];
  
  // Reset DOM
  document.body.innerHTML = '';
  document.head.innerHTML = '';
};

/**
 * Simulates time passing for async operations
 * @param {number} ms - Milliseconds to advance
 */
global.advanceTime = async (ms) => {
  vi.advanceTimersByTime(ms);
  await Promise.resolve(); // Flush promises
};

/**
 * Waits for next tick
 */
global.waitForNextTick = () => {
  return new Promise(resolve => setTimeout(resolve, 0));
};

// ==============================================
// CLEANUP
// ==============================================

// Reset mocks before each test
beforeEach(() => {
  global.resetAllMocks();
  window.history.replaceState({}, '', '/watch?v=dQw4w9WgXcQ');
  vi.useFakeTimers();
});

// Cleanup after each test
afterEach(() => {
  if (vi.isFakeTimers()) {
    vi.runOnlyPendingTimers();
  }
  vi.useRealTimers();
  vi.restoreAllMocks();
});
