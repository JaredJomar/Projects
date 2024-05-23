// ==UserScript==
// @name         Disney Plus Enchantments
// @namespace    http://tampermonkey.net/
// @version      0.6
// @description  Enhancements for Disney Plus video player: auto Fullscreen, skip intro, skip credits, and more.
// @author       JJJ
// @match        https://www.disneyplus.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=disneyplus.com
// @require      https://ajax.googleapis.com/ajax/libs/jquery/2.2.4/jquery.min.js
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @license     MIT
// ==/UserScript==

(function () {
  const config = {
    enableAutoFullscreen: GM_getValue('enableAutoFullscreen', true),
    enableSkipIntro: GM_getValue('enableSkipIntro', true),
    enableAutoPlayNext: GM_getValue('enableAutoPlayNext', false),
  };

  const selectors = {
    skipIntroButton: '.skip__button:first-child',
    autoPlayButton: '*[data-testid="up-next-play-button"]',
  };

  function showSettingsDialog() {
    const dialogHTML = `
      <div id="disneyPlusEnchantmentsDialog" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: black; border: 1px solid #ccc; padding: 20px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.3); z-index: 9999; color: white; width: 300px;">
        <h3 style="margin-top: 0; font-size: 1.2em;">Disney Plus Enchantments</h3>
        <br>
        <label style="display: block; margin-bottom: 10px; color: white; font-size: 1em;" title="Automatically enter fullscreen mode">
          <input type="checkbox" id="enableAutoFullscreen" ${config.enableAutoFullscreen ? 'checked' : ''}>
          <span style="color: white;">Auto Fullscreen</span>
        </label>
        <br>
        <label style="display: block; margin-bottom: 10px; color: white; font-size: 1em;" title="Automatically skip the intro of episodes">
          <input type="checkbox" id="enableSkipIntro" ${config.enableSkipIntro ? 'checked' : ''}>
          <span style="color: white;">Skip Intro</span>
        </label>
        <br>
        <label style="display: block; margin-bottom: 10px; color: white; font-size: 1em;" title="Automatically play the next episode">
          <input type="checkbox" id="enableAutoPlayNext" ${config.enableAutoPlayNext ? 'checked' : ''}>
          <span style="color: white;">Auto Play Next Episode</span>
        </label>
        <br>
        <button id="saveSettingsButton" style="padding: 8px 12px; background-color: #0078d4; color: white; border: none; cursor: pointer; font-size: 1em;">Save</button>
        <button id="cancelSettingsButton" style="padding: 8px 12px; background-color: #d41a1a; color: white; border: none; cursor: pointer; margin-left: 10px; font-size: 1em;">Cancel</button>
      </div>
    `;

    const dialogWrapper = document.createElement('div');
    dialogWrapper.innerHTML = dialogHTML;
    document.body.appendChild(dialogWrapper);

    const saveSettingsButton = document.getElementById('saveSettingsButton');
    const cancelSettingsButton = document.getElementById('cancelSettingsButton');

    saveSettingsButton.addEventListener('click', () => {
      console.log('Save button clicked');
      config.enableAutoFullscreen = document.getElementById('enableAutoFullscreen').checked;
      config.enableSkipIntro = document.getElementById('enableSkipIntro').checked;
      config.enableAutoPlayNext = document.getElementById('enableAutoPlayNext').checked;
      saveSettings();
      closeSettingsDialog();
    });

    cancelSettingsButton.addEventListener('click', () => {
      console.log('Cancel button clicked');
      closeSettingsDialog();
    });
  }

  function closeSettingsDialog() {
    const dialog = document.getElementById('disneyPlusEnchantmentsDialog');
    if (dialog) {
      dialog.remove();
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    }
  }

  function saveSettings() {
    GM_setValue('enableAutoFullscreen', config.enableAutoFullscreen);
    GM_setValue('enableSkipIntro', config.enableSkipIntro);
    GM_setValue('enableAutoPlayNext', config.enableAutoPlayNext);
  }

  function isElementVisible(element) {
    return element && element.offsetParent !== null;
  }

  function clickButton(selector) {
    const button = document.querySelector(selector);
    if (button && isElementVisible(button)) {
      button.click();
    }
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

  function handleSkipActions() {
    try {
      if (config.enableAutoFullscreen) {
        enterFullscreen();
      }

      if (config.enableSkipIntro) {
        clickButton(selectors.skipIntroButton);
      }

      if (config.enableAutoPlayNext) {
        clickButton(selectors.autoPlayButton);
      }
    } catch (error) {
      console.error('An error occurred:', error);
    }
  }

  const observer = new MutationObserver(handleSkipActions);
  observer.observe(document.body, { childList: true, subtree: true });

  GM_registerMenuCommand('Disney Plus Enchantments', showSettingsDialog);

  let isSettingsDialogOpen = false;

  function toggleSettingsDialog() {
    if (isSettingsDialogOpen) {
      closeSettingsDialog();
      isSettingsDialogOpen = false;
    } else {
      showSettingsDialog();
      isSettingsDialogOpen = true;
    }
  }

  document.addEventListener('keyup', (event) => {
    if (event.key === 'F2') {
      toggleSettingsDialog();
    } else if (event.key === 'Escape') {
      exitFullscreen();
    }
  });

})();