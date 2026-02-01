/**
 * DOM Mock Helpers for YouTube Enchantments Tests
 * Provides reusable DOM element creation and manipulation utilities
 */

/**
 * Sets up a complete YouTube watch page DOM structure
 * @param {Object} options - Configuration options
 * @returns {Object} References to key DOM elements
 */
export function setupYouTubeWatchPage(options = {}) {
  const {
    isLiked = false,
    isDisliked = false,
    isSubscribed = false,
    hasPlayer = true,
    hasError = false,
    isLiveStream = false
  } = options;

  // Create main container
  const container = document.createElement('div');
  container.id = 'content';
  
  // Create player
  let player = null;
  if (hasPlayer) {
    player = global.createMockVideoPlayer();
    container.appendChild(player);
  }
  
  // Create error screen if needed
  let errorScreen = null;
  if (hasError) {
    errorScreen = global.createMockErrorScreen();
    container.appendChild(errorScreen);
  }
  
  // Create actions bar with like/dislike buttons
  const actionsBar = document.createElement('div');
  actionsBar.id = 'actions';
  actionsBar.className = 'ytd-menu-renderer';
  
  const likeButton = global.createMockLikeButton(isLiked);
  const dislikeButton = document.createElement('button');
  dislikeButton.className = 'yt-spec-button-shape-next yt-spec-button-shape-next--tonal';
  dislikeButton.setAttribute('aria-pressed', isDisliked.toString());
  dislikeButton.setAttribute('aria-label', 'Dislike this video');
  
  actionsBar.appendChild(likeButton);
  actionsBar.appendChild(dislikeButton);
  container.appendChild(actionsBar);
  
  // Create subscribe button
  const subscribeContainer = document.createElement('div');
  subscribeContainer.id = 'subscribe-container';
  const subscribeButton = global.createMockSubscribeButton(isSubscribed);
  subscribeContainer.appendChild(subscribeButton);
  container.appendChild(subscribeContainer);
  
  // Add live badge if live stream
  if (isLiveStream) {
    const liveBadge = document.createElement('span');
    liveBadge.className = 'ytp-live-badge';
    liveBadge.textContent = 'LIVE';
    liveBadge.style.display = 'block';
    if (player) {
      player.appendChild(liveBadge);
    }
  }
  
  // Add to document
  document.body.innerHTML = '';
  document.body.appendChild(container);
  
  return {
    container,
    player,
    errorScreen,
    likeButton,
    dislikeButton,
    subscribeButton,
    actionsBar
  };
}

/**
 * Sets up a YouTube channel page DOM structure
 * @param {Object} options - Configuration options
 * @returns {Object} References to key DOM elements
 */
export function setupYouTubeChannelPage(options = {}) {
  const { path = '/channel/UC123456/featured' } = options;
  
  // Update location
  window.location.pathname = path;
  
  const container = document.createElement('div');
  container.id = 'page-manager';
  
  document.body.innerHTML = '';
  document.body.appendChild(container);
  
  return { container };
}

/**
 * Sets up YouTube homepage with game sections
 * @param {Object} options - Configuration options
 * @returns {Object} References to key DOM elements
 */
export function setupYouTubeHomePage(options = {}) {
  const { hasGameSections = true, language = 'en' } = options;
  
  const container = document.createElement('div');
  container.id = 'contents';
  container.className = 'ytd-rich-grid-renderer';
  
  if (hasGameSections) {
    // Add regular content
    const regularSection = document.createElement('div');
    regularSection.className = 'ytd-rich-section-renderer';
    const regularTitle = document.createElement('h2');
    regularTitle.textContent = 'Recommended';
    regularSection.appendChild(regularTitle);
    container.appendChild(regularSection);
    
    // Add game section
    const gameSection = global.createMockGameSection(language);
    container.appendChild(gameSection);
    
    // Add more regular content
    const anotherSection = document.createElement('div');
    anotherSection.className = 'ytd-rich-section-renderer';
    container.appendChild(anotherSection);
  }
  
  document.body.innerHTML = '';
  document.body.appendChild(container);
  
  return { container };
}

/**
 * Simulates a button click event
 * @param {HTMLElement} button - Button element to click
 */
export function simulateClick(button) {
  const clickEvent = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    view: window
  });
  button.dispatchEvent(clickEvent);
}

/**
 * Simulates a keyboard event
 * @param {string} key - Key name (e.g., 'F2', 'PageDown')
 * @param {Object} options - Event options
 */
export function simulateKeydown(key, options = {}) {
  const event = new KeyboardEvent('keydown', {
    key,
    code: key,
    bubbles: true,
    cancelable: true,
    ...options
  });
  document.dispatchEvent(event);
  return event;
}

/**
 * Waits for an element to appear in the DOM
 * @param {string} selector - CSS selector
 * @param {number} timeout - Max wait time in ms
 * @returns {Promise<HTMLElement>}
 */
export async function waitForElement(selector, timeout = 1000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const element = document.querySelector(selector);
    if (element) {
      return element;
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  throw new Error(`Element ${selector} not found within ${timeout}ms`);
}

/**
 * Triggers a MutationObserver callback with mock mutations
 * @param {MutationObserver} observer - Observer instance
 * @param {Array} mutations - Array of mutation records
 */
export function triggerMutationObserver(observer, mutations = []) {
  if (observer && observer._trigger) {
    observer._trigger(mutations);
  }
}
