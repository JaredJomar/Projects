// ==UserScript==
// @name         Disney Plus Enchantments
// @namespace    http://tampermonkey.net/
// @version      0.6.4
// @description  Enhancements for Disney Plus video player: auto fullscreen, skip intro, skip credits, and more.
// @author       JJJ
// @match        https://www.disneyplus.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=disneyplus.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  const CONFIG = {
    enableAutoFullscreen: GM_getValue('enableAutoFullscreen', true),
    enableSkipIntro: GM_getValue('enableSkipIntro', true),
    enableAutoPlayNext: GM_getValue('enableAutoPlayNext', false),
    autoPlayNextDelaySeconds: GM_getValue('autoPlayNextDelaySeconds', 0)
  };

  const SELECTORS = {
    skipIntroButton: [
      '.skip-overlay button',
      '.skip-overlay [role="button"]',
      '.skip-overlay skip-button',
      'skip-overlay button',
      'skip-overlay [role="button"]',
      'skip-overlay skip-button',
      '[data-testid="skip-overlay"] button',
      '[data-testid="skip-overlay"] [role="button"]',
      '[data-testid="skip-overlay"] skip-button',
      '.skip__button',
      '[aria-label*="skip intro" i]',
      '[aria-label*="skip the intro" i]',
      '[aria-label*="saltar intro" i]',
      '[aria-label*="saltar la intro" i]'
    ],
    fullscreenButton: [
      'toggle-fullscreen',
      'toggle-fullscreen button',
      'button.fullscreen-icon',
      '[aria-label*="fullscreen" i]',
      '[aria-label*="full screen" i]',
      '[aria-label*="pantalla completa" i]'
    ]
  };

  const ACTIONS = {
    SKIP_INTRO: 'skip-intro'
  };

  const CONSTANTS = {
    CLICK_DELAY: 100,
    ENHANCEMENTS_DEBOUNCE_MS: 120,
    SKIP_RETRY_INTERVAL_MS: 100,
    AUTOPLAY_RETRY_INTERVAL_MS: 500,
    DEFAULT_AUTOPLAY_DELAY_SECONDS: 0,
    MIN_AUTOPLAY_DELAY_SECONDS: 0,
    MAX_AUTOPLAY_DELAY_SECONDS: 120,
    AUTO_FULLSCREEN_COOLDOWN_MS: 10000
  };

  let lastSkipClickTime = 0;
  let autoPlayOverlayFirstSeenTime = 0;
  let lastAutoPlayClickTime = 0;
  let enhancementsDebounceTimer = null;
  let isSettingsDialogOpen = false;
  let restoreFullscreenAfterSettings = false;
  let lastFullscreenExitTime = 0;
  let lastSkipDebugTime = 0;
  let lastAutoPlayDebugTime = 0;

  function createSettingsDialog() {
    closeDialog(false);

    const dialogHTML = `
          <div id="disneyPlusEnchantmentsDialog" class="dpe-dialog">
              <h3>Disney Plus Enchantments</h3>
              ${createToggle('enableAutoFullscreen', 'Auto Fullscreen', 'Automatically enter fullscreen mode')}
              ${createToggle('enableSkipIntro', 'Skip Intro', 'Automatically skip the intro of episodes')}
              ${createToggle('enableAutoPlayNext', 'Auto Play Next Episode', 'Automatically play the next episode')}
              ${createNumberInput('autoPlayNextDelaySeconds', 'Play Next Delay', 'Seconds to wait before clicking the next episode button')}
              <div class="dpe-button-container">
                  <button id="saveSettingsButton" class="dpe-button dpe-button-save">Save</button>
                  <button id="cancelSettingsButton" class="dpe-button dpe-button-cancel">Cancel</button>
              </div>
          </div>
      `;

    const styleSheet = `
          <style>
              .dpe-dialog {
                  position: fixed;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%);
                  background: rgba(0, 0, 0, 0.8);
                  border: 1px solid #444;
                  border-radius: 8px;
                  padding: 20px;
                  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
                  z-index: 9999;
                  color: white;
                  width: 300px;
                  font-family: Arial, sans-serif;
              }
              .dpe-dialog h3 {
                  margin-top: 0;
                  font-size: 1.4em;
                  text-align: center;
                  margin-bottom: 20px;
              }
              .dpe-checkbox-container {
                  display: flex;
                  align-items: center;
                  margin-bottom: 15px;
              }
              .dpe-checkbox-container input[type="checkbox"] {
                  margin-right: 10px;
              }
              .dpe-button-container {
                  display: flex;
                  justify-content: space-between;
                  margin-top: 20px;
              }
              .dpe-button {
                  padding: 8px 16px;
                  border: none;
                  border-radius: 4px;
                  cursor: pointer;
                  font-size: 1em;
                  transition: background-color 0.3s;
              }
              .dpe-button-save {
                  background-color: #0078d4;
                  color: white;
              }
              .dpe-button-save:hover {
                  background-color: #005a9e;
              }
              .dpe-button-cancel {
                  background-color: #d41a1a;
                  color: white;
              }
              .dpe-button-cancel:hover {
                  background-color: #a61515;
              }
              .dpe-toggle-container {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  margin-bottom: 15px;
              }
              .dpe-number-container {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  gap: 12px;
                  margin-bottom: 15px;
              }
              .dpe-number-container input {
                  width: 72px;
                  padding: 6px;
                  border: 1px solid #666;
                  border-radius: 4px;
                  background: #111;
                  color: white;
              }
              .dpe-toggle-label {
                  flex-grow: 1;
              }
              .dpe-toggle {
                  position: relative;
                  display: inline-block;
                  width: 50px;
                  height: 24px;
              }
              .dpe-toggle input {
                  position: absolute;
                  width: 100%;
                  height: 100%;
                  opacity: 0;
                  cursor: pointer;
                  margin: 0;
              }
              .dpe-toggle-slider {
                  position: absolute;
                  cursor: pointer;
                  top: 0;
                  left: 0;
                  right: 0;
                  bottom: 0;
                  background-color: #ccc;
                  transition: .4s;
                  border-radius: 24px;
              }
              .dpe-toggle-slider:before {
                  position: absolute;
                  content: "";
                  height: 16px;
                  width: 16px;
                  left: 4px;
                  bottom: 4px;
                  background-color: white;
                  transition: .4s;
                  border-radius: 50%;
              }
              .dpe-toggle input:checked + .dpe-toggle-slider {
                  background-color: #0078d4;
              }
              .dpe-toggle input:checked + .dpe-toggle-slider:before {
                  transform: translateX(26px);
              }
          </style>
      `;

    const dialogWrapper = document.createElement('div');
    dialogWrapper.id = 'disneyPlusEnchantmentsDialogWrapper';
    dialogWrapper.innerHTML = styleSheet + dialogHTML;
    document.body.appendChild(dialogWrapper);

    document.getElementById('saveSettingsButton').addEventListener('click', saveAndCloseDialog);
    document.getElementById('cancelSettingsButton').addEventListener('click', closeDialog);
    isSettingsDialogOpen = true;
  }

  function createToggle(id, label, title) {
    return `
          <div class="dpe-toggle-container" title="${title}">
              <label class="dpe-toggle">
                  <input type="checkbox" id="${id}" ${CONFIG[id] ? 'checked' : ''}>
                  <span class="dpe-toggle-slider"></span>
              </label>
              <label for="${id}" class="dpe-toggle-label">${label}</label>
          </div>
      `;
  }

  function createNumberInput(id, label, title) {
    return `
          <div class="dpe-number-container" title="${title}">
              <label for="${id}" class="dpe-toggle-label">${label}</label>
              <input type="number" id="${id}" min="${CONSTANTS.MIN_AUTOPLAY_DELAY_SECONDS}" max="${CONSTANTS.MAX_AUTOPLAY_DELAY_SECONDS}" step="1" value="${getAutoPlayDelaySeconds()}">
          </div>
      `;
  }


  function saveAndCloseDialog() {
    CONFIG.enableAutoFullscreen = document.getElementById('enableAutoFullscreen').checked;
    CONFIG.enableSkipIntro = document.getElementById('enableSkipIntro').checked;
    CONFIG.enableAutoPlayNext = document.getElementById('enableAutoPlayNext').checked;
    CONFIG.autoPlayNextDelaySeconds = parseDelaySeconds(document.getElementById('autoPlayNextDelaySeconds').value);

    Object.keys(CONFIG).forEach(key => GM_setValue(key, CONFIG[key]));
    closeDialog();
  }

  function closeDialog(restoreFullscreen = true) {
    const dialogWrapper = document.getElementById('disneyPlusEnchantmentsDialogWrapper');
    if (dialogWrapper) {
      dialogWrapper.remove();
    } else {
      const dialog = document.getElementById('disneyPlusEnchantmentsDialog');
      if (dialog) {
        dialog.remove();
      }
    }
    isSettingsDialogOpen = false;

    if (restoreFullscreen && restoreFullscreenAfterSettings) {
      restoreFullscreenAfterSettings = false;
      lastFullscreenExitTime = 0;
      enterFullscreen();
    }
  }

  function isElementVisible(element) {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      rect.right >= 0 &&
      rect.bottom >= 0
    );
  }

  function collectShadowMatches(root, selector, results = [], visited = new WeakSet()) {
    if (!root || visited.has(root)) {
      return results;
    }

    visited.add(root);
    results.push(...root.querySelectorAll(selector));

    for (const element of root.querySelectorAll('*')) {
      if (element.shadowRoot) {
        collectShadowMatches(element.shadowRoot, selector, results, visited);
      }
    }

    return results;
  }

  function getButtonText(element) {
    if (!element) return '';
    return ((element.textContent || '') + ' ' + (element.getAttribute('aria-label') || '')).toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function findSkipIntroButton() {
    const skipOverlayHosts = collectShadowMatches(document, '.skip-overlay:not([hidden]), skip-overlay:not([hidden]), [data-testid="skip-overlay"]:not([hidden])');
    for (const skipOverlayHost of skipOverlayHosts) {
      const hostButton = findSkipOverlayHostButton(skipOverlayHost);
      if (hostButton) return hostButton;
    }

    const candidates = [
      ...collectShadowMatches(document, SELECTORS.skipIntroButton.join(', ')),
      ...collectShadowMatches(document, 'button, [role="button"]')
    ];

    for (const candidate of candidates) {
      if (!isElementVisible(candidate)) continue;

      const text = getButtonText(candidate);
      const container = candidate.closest('.button-container');

      if (container && text.includes('saltar') && text.includes('intro')) {
        return candidate;
      }

      if (text.includes('skip intro') || text.includes('skip the intro') || text.includes('saltar intro')) {
        return candidate;
      }
    }

    const textMatch = findSkipTextMatch();
    if (textMatch) return textMatch;

    return null;
  }

  function findSkipTextMatch() {
    const labels = collectShadowMatches(document, 'span, div').filter(isElementVisible);
    for (const label of labels) {
      const text = getButtonText(label);
      if (!isValidSkipButton(text)) continue;

      const clickable = getClosestComposed(label, 'button, [role="button"], skip-button, skip-overlay, .skip-overlay, .skip__button');
      if (clickable) return getClickableElement(clickable);
    }

    return null;
  }

  function findSkipOverlayHostButton(host) {
    const roots = [host];
    if (host.shadowRoot) roots.push(host.shadowRoot);

    for (const root of roots) {
      const button = collectShadowMatches(root, 'button, [role="button"]').find(candidate => {
        return isElementVisible(candidate) && isValidSkipElement(candidate, getButtonText(candidate));
      });
      if (button) return getClickableElement(button);

      const skipButton = collectShadowMatches(root, 'skip-button').find(candidate => {
        return isElementVisible(getClickableElement(candidate));
      });
      if (skipButton) return getClickableElement(skipButton);
    }

    return getClickableElement(host);
  }

  function findAutoPlayButton() {
    if (!isPlaybackRouteActive()) {
      debugAutoPlay('playback route inactive', { path: window.location.pathname });
      return null;
    }

    const directButton = collectShadowMatches(document, 'button[data-testid="up-next-play-button"], [data-testid="up-next-play-button"]').find(isElementVisible);
    if (directButton) {
      debugAutoPlay('found direct up-next button', directButton);
      return getClickableElement(directButton);
    }

    const restartIcon = collectShadowMatches(document, '[data-testid="icon-restart"]').find(isElementVisible);
    if (restartIcon && restartIcon.parentElement && isWithinUpNextOverlay(restartIcon)) {
      debugAutoPlay('found restart icon up-next fallback', restartIcon.parentElement);
      return getClickableElement(restartIcon.parentElement);
    }

    const upNextContainer = collectShadowMatches(document, '.overlay_upnextlite_button-container').find(isElementVisible);
    if (upNextContainer && upNextContainer.firstElementChild) {
      debugAutoPlay('found up-next container fallback', upNextContainer.firstElementChild);
      return getClickableElement(upNextContainer.firstElementChild);
    }

    const upNextHosts = collectShadowMatches(document, 'up-next-lite-v1:not([hidden]), [data-gv2containerkey="playerUpNext"]:not([hidden])');
    for (const upNextHost of upNextHosts) {
      const hostButton = findUpNextHostButton(upNextHost);
      if (hostButton) {
        debugAutoPlay('found up-next host fallback', hostButton);
        return hostButton;
      }
    }

    debugAutoPlay('up-next overlay not found');
    return null;
  }

  function findUpNextHostButton(host) {
    const roots = [host];
    if (host.shadowRoot) roots.push(host.shadowRoot);

    for (const root of roots) {
      const button = collectShadowMatches(root, 'button, [role="button"], [data-testid="up-next-play-button"]').find(isElementVisible);
      if (button) return getClickableElement(button);
    }

    return null;
  }

  function isPlaybackRouteActive() {
    const path = window.location.pathname.toLowerCase();
    const routeSegments = path.split('/').filter(Boolean);
    const playbackSegmentIndex = routeSegments.findIndex(segment => segment === 'play' || segment === 'video');
    return playbackSegmentIndex !== -1;
  }

  function getActiveVideo() {
    return collectShadowMatches(document, 'video').find(video => {
      return isElementVisible(video) && Number.isFinite(video.duration) && video.duration > 0;
    });
  }

  function getVisibleVideo() {
    return collectShadowMatches(document, 'video').find(isElementVisible);
  }

  function wakePlayerControls() {
    const target = getVisibleVideo() || document.querySelector('main') || document.body;
    if (!target) return;

    const eventView = getEventView(target);
    const rect = target.getBoundingClientRect();
    const clientX = rect.width > 0 ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const clientY = rect.height > 0 ? rect.top + rect.height / 2 : window.innerHeight / 2;
    const eventOptions = {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: eventView,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX,
      clientY
    };

    if (typeof eventView.PointerEvent === 'function') {
      target.dispatchEvent(new eventView.PointerEvent('pointermove', eventOptions));
    }
    if (typeof eventView.MouseEvent === 'function') {
      target.dispatchEvent(new eventView.MouseEvent('mousemove', eventOptions));
    }
  }

  function isWithinUpNextOverlay(element) {
    return Boolean(getClosestComposed(element, 'up-next-lite-v1, play-next, .overlay_upnextlite, [data-testid="up-next-play-button"]'));
  }

  function getClickableElement(element) {
    if (element.matches('button, [role="button"]')) return element;
    if (element.shadowRoot) {
      const shadowButton = collectShadowMatches(element.shadowRoot, 'button, [role="button"]').find(isElementVisible);
      if (shadowButton) return shadowButton;
    }

    return element.querySelector('button, [role="button"]') || element;
  }

  function getClosestComposed(element, selector) {
    for (let node = element; node; node = getComposedParent(node)) {
      if (node.nodeType === Node.ELEMENT_NODE && node.matches(selector)) {
        return node;
      }
    }

    return null;
  }

  function getComposedParent(node) {
    if (node.parentElement) return node.parentElement;

    const root = node.getRootNode && node.getRootNode();
    return root && root.host ? root.host : null;
  }

  function parseDelaySeconds(value) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return CONSTANTS.DEFAULT_AUTOPLAY_DELAY_SECONDS;

    return Math.min(
      CONSTANTS.MAX_AUTOPLAY_DELAY_SECONDS,
      Math.max(CONSTANTS.MIN_AUTOPLAY_DELAY_SECONDS, parsed)
    );
  }

  function getAutoPlayDelaySeconds() {
    CONFIG.autoPlayNextDelaySeconds = parseDelaySeconds(CONFIG.autoPlayNextDelaySeconds);
    return CONFIG.autoPlayNextDelaySeconds;
  }

  function findVisibleElement(selectors) {
    const list = Array.isArray(selectors) ? selectors : [selectors];
    for (const selector of list) {
      const element = document.querySelector(selector);
      if (element && isElementVisible(element)) {
        return element;
      }
    }
    return null;
  }

  function clickButton(actionOrSelectors) {
    if (actionOrSelectors === ACTIONS.SKIP_INTRO) {
      const button = findSkipIntroButton();
      if (button) handleSkipIntroButton(button);
      else debugSkipClick('skip button not found');
      return;
    }

    const button = findVisibleElement(actionOrSelectors);
    if (button) {
      clickElement(button);
    }
  }

  function clickElement(element) {
    const clicked = new Set();

    for (const target of getClickTargets(element)) {
      if (!target || clicked.has(target)) continue;

      dispatchClickSequence(target);
      clicked.add(target);
    }
  }

  function getClickTargets(element) {
    const targets = [];
    const addTarget = (target) => {
      if (target && !targets.includes(target)) targets.push(target);
    };

    addTarget(getClickableElement(element));
    addTarget(element);

    if (element.shadowRoot) {
      collectShadowMatches(element.shadowRoot, 'button, [role="button"]').forEach(addTarget);
    }

    if (element.querySelectorAll) {
      element.querySelectorAll('button, [role="button"]').forEach(addTarget);
    }

    for (let node = element; node; node = getComposedParent(node)) {
      if (node.nodeType !== Node.ELEMENT_NODE) continue;
      if (node.matches('skip-button, skip-overlay, .skip-overlay, play-next, up-next-lite-v1')) {
        addTarget(getClickableElement(node));
        addTarget(node);
      }
    }

    return targets;
  }

  function dispatchClickSequence(element) {
    if (typeof element.scrollIntoView === 'function') {
      element.scrollIntoView({ block: 'center', inline: 'center' });
    }
    if (typeof element.focus === 'function') {
      element.focus({ preventScroll: true });
    }

    const eventView = getEventView(element);
    const rect = element.getBoundingClientRect();
    const clientX = rect.width > 0 ? rect.left + rect.width / 2 : 0;
    const clientY = rect.height > 0 ? rect.top + rect.height / 2 : 0;
    const eventOptions = {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: eventView,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX,
      clientY
    };

    if (typeof eventView.PointerEvent === 'function') {
      element.dispatchEvent(new eventView.PointerEvent('pointerdown', eventOptions));
    }
    if (typeof eventView.MouseEvent === 'function') {
      element.dispatchEvent(new eventView.MouseEvent('mousedown', eventOptions));
    }
    if (typeof eventView.PointerEvent === 'function') {
      element.dispatchEvent(new eventView.PointerEvent('pointerup', eventOptions));
    }
    if (typeof eventView.MouseEvent === 'function') {
      element.dispatchEvent(new eventView.MouseEvent('mouseup', eventOptions));
      element.dispatchEvent(new eventView.MouseEvent('click', eventOptions));
    }
    if (typeof element.click === 'function') {
      element.click();
    }
  }

  function getEventView(element) {
    return (element.ownerDocument && element.ownerDocument.defaultView) || window;
  }

  function handleSkipIntroButton(button) {
    const currentTime = Date.now();
    if (currentTime - lastSkipClickTime < CONSTANTS.CLICK_DELAY) return;

    const buttonText = getButtonText(button);
    if (isValidSkipElement(button, buttonText)) {
      debugSkipClick('clicking skip button', button);
      clickElement(button);
      lastSkipClickTime = currentTime;
    }
  }

  function debugSkipClick(message, element) {
    if (localStorage.getItem('dpeDebugClicks') !== '1') return;

    const currentTime = Date.now();
    if (currentTime - lastSkipDebugTime < 1000) return;
    lastSkipDebugTime = currentTime;

    console.debug('Disney Plus Enchantments:', message, element || null);
  }

  function isValidSkipElement(button, buttonText) {
    return isValidSkipButton(buttonText) || Boolean(getClosestComposed(button, '.skip-overlay, skip-overlay, [data-testid="skip-overlay"]'));
  }

  function isValidSkipButton(buttonText) {
    return (buttonText.includes('skip') || buttonText.includes('saltar') || buttonText.includes('intro')) &&
      !buttonText.includes('next') &&
      !buttonText.includes('próximo') &&
      !buttonText.includes('siguiente');
  }

  function enterFullscreen(bypassActivationCheck) {
    if (!document.fullscreenElement && document.fullscreenEnabled && (bypassActivationCheck || canRequestFullscreen())) {
      document.documentElement.requestFullscreen().catch(error => {
        console.error('Disney Plus Enchantments fullscreen error:', error);
      });
    }
  }

  function canRequestFullscreen() {
    return !navigator.userActivation || navigator.userActivation.isActive;
  }

  function exitFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(error => {
        console.error('Disney Plus Enchantments fullscreen error:', error);
      });
    }
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      lastFullscreenExitTime = Date.now();
      exitFullscreen();
    } else {
      enterFullscreen(true);
    }
  }

  function openSettingsDialog() {
    restoreFullscreenAfterSettings = Boolean(document.fullscreenElement);
    if (document.fullscreenElement) {
      lastFullscreenExitTime = Date.now();
      exitFullscreen();
    }
    createSettingsDialog();
  }

  function maintainFullscreen() {
    const fullscreenButton = findVisibleElement(SELECTORS.fullscreenButton);
    if (fullscreenButton && !document.fullscreenElement && canRequestFullscreen()) {
      fullscreenButton.click();
    }
  }

  function attemptAutoPlay() {
    if (!CONFIG.enableAutoPlayNext) {
      debugAutoPlay('disabled in settings');
      return;
    }
    if (!isPlaybackRouteActive()) {
      debugAutoPlay('route/video gate blocked autoplay', { path: window.location.pathname });
      resetAutoPlayClickState();
      return;
    }

    const button = findAutoPlayButton();
    if (!button) {
      resetAutoPlayClickState();
      return;
    }

    const currentTime = Date.now();
    if (!autoPlayOverlayFirstSeenTime) {
      autoPlayOverlayFirstSeenTime = currentTime;
      debugAutoPlay('up-next overlay first seen', button);
    }

    const delayMs = getAutoPlayDelaySeconds() * 1000;
    if (currentTime - autoPlayOverlayFirstSeenTime < delayMs) {
      debugAutoPlay('waiting play-next delay', { delayMs, elapsedMs: currentTime - autoPlayOverlayFirstSeenTime });
      return;
    }
    if (currentTime - lastAutoPlayClickTime < CONSTANTS.AUTOPLAY_RETRY_INTERVAL_MS) return;

    debugAutoPlay('clicking next episode', button);
    clickElement(button);
    lastAutoPlayClickTime = currentTime;
  }

  function debugAutoPlay(message, details) {
    if (localStorage.getItem('dpeDebugNext') !== '1') return;

    const currentTime = Date.now();
    if (currentTime - lastAutoPlayDebugTime < 1000) return;
    lastAutoPlayDebugTime = currentTime;

    console.log('Disney Plus Enchantments Next:', message, details || null);
  }

  function logAutoPlayDebugStartup() {
    if (localStorage.getItem('dpeDebugNext') !== '1') return;

    console.log('Disney Plus Enchantments Next: debug active', {
      path: window.location.pathname,
      enableAutoPlayNext: CONFIG.enableAutoPlayNext,
      autoPlayNextDelaySeconds: getAutoPlayDelaySeconds()
    });
  }

  function resetAutoPlayClickState() {
    autoPlayOverlayFirstSeenTime = 0;
    lastAutoPlayClickTime = 0;
  }

  function handleEnhancements() {
    try {
      const playbackRouteActive = isPlaybackRouteActive();

      if (playbackRouteActive && CONFIG.enableAutoFullscreen && !isSettingsDialogOpen) {
        if (!document.fullscreenElement && canRequestFullscreen() && Date.now() - lastFullscreenExitTime >= CONSTANTS.AUTO_FULLSCREEN_COOLDOWN_MS) {
          enterFullscreen();
        }
        maintainFullscreen();
      }

      if (CONFIG.enableSkipIntro) {
        wakePlayerControls();
        clickButton(ACTIONS.SKIP_INTRO);
      }

      if (CONFIG.enableAutoPlayNext) {
        attemptAutoPlay();
      }
    } catch (error) {
      console.error('Disney Plus Enchantments error:', error);
    }
  }

  // Detect SPA navigation (pushState/replaceState/popstate) and re-run enhancements
  (function patchHistoryEvents() {
    const wrap = (orig) => function () {
      const ret = orig.apply(this, arguments);
      handleEnhancements();
      return ret;
    };
    if (history.pushState) history.pushState = wrap(history.pushState);
    if (history.replaceState) history.replaceState = wrap(history.replaceState);
    window.addEventListener('popstate', handleEnhancements);
  })();

  const observer = new MutationObserver(() => {
    clearTimeout(enhancementsDebounceTimer);
    enhancementsDebounceTimer = setTimeout(handleEnhancements, CONSTANTS.ENHANCEMENTS_DEBOUNCE_MS);
  });
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  logAutoPlayDebugStartup();

  setInterval(() => {
    if (CONFIG.enableSkipIntro) {
      wakePlayerControls();
      clickButton(ACTIONS.SKIP_INTRO);
    }
  }, CONSTANTS.SKIP_RETRY_INTERVAL_MS);

  setInterval(() => {
    attemptAutoPlay();
  }, CONSTANTS.AUTOPLAY_RETRY_INTERVAL_MS);

  GM_registerMenuCommand('Disney Plus Enchantments Settings', createSettingsDialog);

  function toggleSettingsDialog() {
    if (isSettingsDialogOpen) {
      closeDialog();
    } else {
      openSettingsDialog();
    }
  }

  document.addEventListener('keyup', (event) => {
    if (event.key === 'F2') {
      toggleSettingsDialog();
    } else if (event.key === 'Escape') {
      toggleFullscreen();
    }
  }, true);
})();
