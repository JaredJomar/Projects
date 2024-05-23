// ==UserScript==
// @name         Netflix Enchantments
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  Enhancements for Netflix video player: skip intro, skip outro, and more.
// @author       JJJ
// @match        https://www.netflix.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=netflix.com
// @require      https://ajax.googleapis.com/ajax/libs/jquery/2.2.4/jquery.min.js
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @license     MIT
// ==/UserScript==

(function () {
  const config = {
    enableSkipRecap: GM_getValue('enableSkipRecap', true),
    enableSkipIntro: GM_getValue('enableSkipIntro', true),
    enableSkipOutro: GM_getValue('enableSkipOutro', true),
    cancelFullscreen: GM_getValue('cancelFullscreen', false),
  };

  const selectors = {
    skipRecapButton: '.button-primary.watch-video--skip-content-button.medium.hasLabel.default-ltr-cache-1mjzmhv',
    skipIntroButton: '.button-primary.watch-video--skip-content-button.medium.hasLabel.default-ltr-cache-1mjzmhv',
    skipOutroButton: '.color-primary.hasLabel.hasIcon.ltr-1jtux27',
    fullscreenView: '.watch-video--player-view',
  };

  function showSettingsDialog() {
    const dialogHTML = `
      <div id="netflixEnchantmentsDialog" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: black; border: 1px solid #ccc; padding: 20px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.3); z-index: 9999; color: white; width: 300px;">
        <h3 style="margin-top: 0; font-size: 1.2em;">Netflix Enchantments</h3>
        <br>
        <label style="display: block; margin-bottom: 10px; color: white; font-size: 1em;" title="Automatically skip episode recaps">
          <input type="checkbox" id="enableSkipRecap" ${config.enableSkipRecap ? 'checked' : ''}>
          <span style="color: white;">Skip Recap</span>
        </label>
        <br>
        <label style="display: block; margin-bottom: 10px; color: white; font-size: 1em;" title="Automatically skip the intro of episodes">
          <input type="checkbox" id="enableSkipIntro" ${config.enableSkipIntro ? 'checked' : ''}>
          <span style="color: white;">Skip Intro</span>
        </label>
        <br>
        <label style="display: block; margin-bottom: 10px; color: white; font-size: 1em;" title="Automatically skip the outro of episodes">
          <input type="checkbox" id="enableSkipOutro" ${config.enableSkipOutro ? 'checked' : ''}>
          <span style="color: white;">Skip Outro</span>
        </label>
        <br>
        <label style="display: block; margin-bottom: 10px; color: white; font-size: 1em;" title="Automatically exit fullscreen mode">
          <input type="checkbox" id="cancelFullscreen" ${config.cancelFullscreen ? 'checked' : ''}>
          <span style="color: white;">Cancel Fullscreen</span>
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
      config.enableSkipRecap = document.getElementById('enableSkipRecap').checked;
      config.enableSkipIntro = document.getElementById('enableSkipIntro').checked;
      config.enableSkipOutro = document.getElementById('enableSkipOutro').checked;
      config.cancelFullscreen = document.getElementById('cancelFullscreen').checked;
      saveSettings();
      closeSettingsDialog();
    });

    cancelSettingsButton.addEventListener('click', () => {
      console.log('Cancel button clicked');
      closeSettingsDialog();
    });
  }

  function closeSettingsDialog() {
    const dialog = document.getElementById('netflixEnchantmentsDialog');
    if (dialog) {
      dialog.remove();
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    }
  }

  function saveSettings() {
    GM_setValue('enableSkipRecap', config.enableSkipRecap);
    GM_setValue('enableSkipIntro', config.enableSkipIntro);
    GM_setValue('enableSkipOutro', config.enableSkipOutro);
    GM_setValue('cancelFullscreen', config.cancelFullscreen);
  }

  function clickButton(selector) {
    const button = document.querySelector(selector);
    if (button) {
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
      if (config.enableSkipRecap) {
        clickButton(selectors.skipRecapButton);
      }

      if (config.enableSkipIntro) {
        clickButton(selectors.skipIntroButton);
      }

      if (config.enableSkipOutro) {
        clickButton(selectors.skipOutroButton);
      }

      if (document.querySelector(selectors.fullscreenView)) {
        enterFullscreen();
      }

      if (config.cancelFullscreen && document.fullscreenElement) {
        exitFullscreen();
      }
    } catch (error) {
      console.error('An error occurred:', error);
    }
  }

  const observer = new MutationObserver(handleSkipActions);
  observer.observe(document.body, { childList: true, subtree: true });

  GM_registerMenuCommand('Netflix Enchantments', showSettingsDialog);

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