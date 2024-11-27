// ==UserScript==
// @name         Disney Plus Enchantments
// @namespace    http://tampermonkey.net/
// @version      0.6.2
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
    enableAutoPlayNext: GM_getValue('enableAutoPlayNext', false)
  };

  const SELECTORS = {
    skipIntroButton: 'button.skip__button:not([class*="overlay_upnextlite"])',
    autoPlayButton: '.overlay_upnextlite_button-container button, *[data-testid="up-next-play-button"]',
    fullscreenButton: 'button.fullscreen-icon'
  };

  const CONSTANTS = {
    CLICK_DELAY: 5000,
    BUTTON_TRACKING_TIMEOUT: 30000
  };

  let lastSkipClickTime = 0;
  const clickedButtons = new Set();

  function createSettingsDialog() {
    const dialogHTML = `
          <div id="disneyPlusEnchantmentsDialog" class="dpe-dialog">
              <h3>Disney Plus Enchantments</h3>
              ${createToggle('enableAutoFullscreen', 'Auto Fullscreen', 'Automatically enter fullscreen mode')}
              ${createToggle('enableSkipIntro', 'Skip Intro', 'Automatically skip the intro of episodes')}
              ${createToggle('enableAutoPlayNext', 'Auto Play Next Episode', 'Automatically play the next episode')}
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
                  opacity: 0;
                  width: 0;
                  height: 0;
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
    dialogWrapper.innerHTML = styleSheet + dialogHTML;
    document.body.appendChild(dialogWrapper);

    document.getElementById('saveSettingsButton').addEventListener('click', saveAndCloseDialog);
    document.getElementById('cancelSettingsButton').addEventListener('click', closeDialog);
  }

  function createToggle(id, label, title) {
    return `
          <div class="dpe-toggle-container" title="${title}">
              <label for="${id}" class="dpe-toggle-label">${label}</label>
              <div class="dpe-toggle">
                  <input type="checkbox" id="${id}" ${CONFIG[id] ? 'checked' : ''}>
                  <span class="dpe-toggle-slider"></span>
              </div>
          </div>
      `;
  }


  function saveAndCloseDialog() {
    Object.keys(CONFIG).forEach(key => {
      CONFIG[key] = document.getElementById(key).checked;
      GM_setValue(key, CONFIG[key]);
    });
    closeDialog();
  }

  function closeDialog() {
    const dialog = document.getElementById('disneyPlusEnchantmentsDialog');
    if (dialog) {
      dialog.remove();
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    }
  }

  function isElementVisible(element) {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    return (
      element.offsetParent !== null &&
      rect.width > 0 &&
      rect.height > 0 &&
      rect.top >= 0 &&
      rect.left >= 0
    );
  }

  function clickButton(selector) {
    const button = document.querySelector(selector);
    if (button && isElementVisible(button)) {
      if (selector === SELECTORS.skipIntroButton) {
        handleSkipIntroButton(button);
      } else if (selector === SELECTORS.autoPlayButton) {
        button.click();
      }
    }
  }

  function handleSkipIntroButton(button) {
    const currentTime = Date.now();
    if (currentTime - lastSkipClickTime < CONSTANTS.CLICK_DELAY) return;

    const buttonText = button.textContent.toLowerCase();
    if (isValidSkipButton(buttonText) && !clickedButtons.has(buttonText)) {
      button.click();
      lastSkipClickTime = currentTime;
      clickedButtons.add(buttonText);

      setTimeout(() => clickedButtons.delete(buttonText), CONSTANTS.BUTTON_TRACKING_TIMEOUT);
    }
  }

  function isValidSkipButton(buttonText) {
    return (buttonText.includes('skip') || buttonText.includes('saltar')) &&
      !buttonText.includes('next') &&
      !buttonText.includes('próximo');
  }

  function enterFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    }
  }

  function exitFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  }

  function maintainFullscreen() {
    const fullscreenButton = document.querySelector(SELECTORS.fullscreenButton);
    if (fullscreenButton && !document.fullscreenElement) {
      fullscreenButton.click();
    }
  }

  function handleEnhancements() {
    try {
      if (CONFIG.enableAutoFullscreen) {
        enterFullscreen();
        maintainFullscreen();
      }

      if (CONFIG.enableSkipIntro) {
        clickButton(SELECTORS.skipIntroButton);
      }

      if (CONFIG.enableAutoPlayNext) {
        clickButton(SELECTORS.autoPlayButton);
      }
    } catch (error) {
      console.error('Disney Plus Enchantments error:', error);
    }
  }

  const observer = new MutationObserver(handleEnhancements);
  observer.observe(document.body, { childList: true, subtree: true });

  GM_registerMenuCommand('Disney Plus Enchantments Settings', createSettingsDialog);

  let isSettingsDialogOpen = false;

  function toggleSettingsDialog() {
    if (isSettingsDialogOpen) {
      closeDialog();
      isSettingsDialogOpen = false;
    } else {
      createSettingsDialog();
      isSettingsDialogOpen = true;
    }
  }

  document.addEventListener('keyup', (event) => {
    if (event.key === 'F2') {
      toggleSettingsDialog();
    } else if (event.key === 'Escape') {
      exitFullscreen();
      closeDialog();
    }
  });
})();