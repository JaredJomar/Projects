/**
 * YouTube Player API Mock Helpers
 * Provides utilities for testing YouTube IFrame Player API functionality
 */

/**
 * Creates a mock YT.Player instance with custom behavior
 * @param {Object} options - Player configuration
 * @returns {Object} Mock player instance
 */
export function createMockYTPlayer(options = {}) {
  const {
    currentTime = 30,
    duration = 100,
    state = global.YT.PlayerState.PLAYING,
    videoId = 'test123'
  } = options;

  const mockPlayer = {
    elementId: 'player',
    videoId,
    getCurrentTime: jest.fn(() => currentTime),
    getDuration: jest.fn(() => duration),
    getPlayerState: jest.fn(() => state),
    playVideo: jest.fn(),
    pauseVideo: jest.fn(),
    stopVideo: jest.fn(),
    seekTo: jest.fn(),
    getVolume: jest.fn(() => 50),
    setVolume: jest.fn(),
    mute: jest.fn(),
    unMute: jest.fn(),
    isMuted: jest.fn(() => false),
    destroy: jest.fn(),
    getIframe: jest.fn(() => {
      const iframe = document.createElement('iframe');
      iframe.id = 'player-iframe';
      return iframe;
    })
  };

  return mockPlayer;
}

/**
 * Mocks the YT.Player constructor to return a specific instance
 * @param {Object} mockPlayer - Mock player to return
 */
export function mockYTPlayerConstructor(mockPlayer) {
  global.YT.Player = jest.fn((elementId, config) => {
    mockPlayer.elementId = elementId;
    mockPlayer.config = config;
    
    // Trigger onReady callback if provided
    if (config.events && config.events.onReady) {
      setTimeout(() => config.events.onReady({ target: mockPlayer }), 0);
    }
    
    return mockPlayer;
  });
}

/**
 * Simulates YouTube IFrame API script load
 * @param {boolean} shouldSucceed - Whether load should succeed
 */
export function simulateIFrameAPILoad(shouldSucceed = true) {
  // Mock script element
  const script = document.createElement('script');
  script.src = 'https://www.youtube.com/iframe_api';
  
  if (shouldSucceed) {
    // Simulate successful load
    setTimeout(() => {
      if (window.onYouTubeIframeAPIReady) {
        window.onYouTubeIframeAPIReady();
      }
      script.dispatchEvent(new Event('load'));
    }, 0);
  } else {
    // Simulate load error
    setTimeout(() => {
      script.dispatchEvent(new Event('error'));
    }, 0);
  }
  
  return script;
}

/**
 * Creates a mock iframe element for player
 * @param {string} videoId - YouTube video ID
 * @param {number} startTime - Start time in seconds
 * @returns {HTMLIFrameElement}
 */
export function createMockPlayerIframe(videoId = 'test123', startTime = 0) {
  const iframe = document.createElement('iframe');
  iframe.id = 'youtube-player-iframe';
  iframe.width = '100%';
  iframe.height = '100%';
  iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&start=${startTime}`;
  iframe.frameBorder = '0';
  iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
  iframe.allowFullscreen = true;
  
  return iframe;
}

/**
 * Gets the last created YT.Player instance
 * @returns {Object|null} Last player instance
 */
export function getLastYTPlayer() {
  if (!global._ytPlayers || global._ytPlayers.length === 0) {
    return null;
  }
  return global._ytPlayers[global._ytPlayers.length - 1];
}

/**
 * Clears all YT.Player instances
 */
export function clearYTPlayers() {
  global._ytPlayers = [];
}

/**
 * Simulates player state change
 * @param {Object} player - Player instance
 * @param {number} newState - New player state
 */
export function simulatePlayerStateChange(player, newState) {
  if (player && player.config && player.config.events && player.config.events.onStateChange) {
    player.getPlayerState.mockReturnValue(newState);
    player.config.events.onStateChange({ data: newState, target: player });
  }
}

/**
 * Simulates player error
 * @param {Object} player - Player instance
 * @param {number} errorCode - YouTube error code
 */
export function simulatePlayerError(player, errorCode = 150) {
  if (player && player.config && player.config.events && player.config.events.onError) {
    player.config.events.onError({ data: errorCode, target: player });
  }
}

/**
 * Resets YouTube Player API mocks
 */
export function resetYouTubeAPIMocks() {
  clearYTPlayers();
  global.YT.Player.mockClear();
  if (window.onYouTubeIframeAPIReady) {
    delete window.onYouTubeIframeAPIReady;
  }
}
