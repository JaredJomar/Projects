// ==UserScript==
// @name         Netflix Enchantments
// @namespace    http://tampermonkey.net/
// @version      0.3
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
  const Max_Skip_Attempts = 5;
  let skipRecapAttempts = 0;
  let skipIntroAttempts = 0;
  let skipOutroAttempts = 0;

  // Select elements on the page that we will interact with
  const skipRecapButtonSelector = '.button-primary.watch-video--skip-content-button.medium.hasLabel.default-ltr-cache-1mjzmhv';
  const skipIntroButtonSelector = '.button-primary.watch-video--skip-content-button.medium.hasLabel.default-ltr-cache-1mjzmhv';
  const skipOutroButtonSelector = '.color-primary.hasLabel.hasIcon.ltr-1jtux27';

  // Function to create and show the settings dialog
  function showSettingsDialog() {
    const dialogHTML = `
      <div id="netflixEnchantmentsDialog" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: black; border: 1px solid #ccc; padding: 20px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.3); z-index: 9999; color: white; width: 300px;">
        <h3 style="margin-top: 0; font-size: 1.2em;">Netflix Enchantments</h3>
        <br>
        <label style="display: block; margin-bottom: 10px; color: white; font-size: 1em;">
          <input type="checkbox" id="enableSkipRecap" ${GM_getValue('enableSkipRecap', true) ? 'checked' : ''}>
          <span style="color: white;">Skip Recap</span>
        </label>
        <br>
        <label style="display: block; margin-bottom: 10px; color: white; font-size: 1em;">
          <input type="checkbox" id="enableSkipIntro" ${GM_getValue('enableSkipIntro', true) ? 'checked' : ''}>
          <span style="color: white;">Skip Intro</span>
        </label>
        <br>
        <label style="display: block; margin-bottom: 10px; color: white; font-size: 1em;">
          <input type="checkbox" id="enableSkipOutro" ${GM_getValue('enableSkipOutro', true) ? 'checked' : ''}>
          <span style="color: white;">Skip Outro</span>
        </label>
        <br>
        <label style="display: block; margin-bottom: 10px; color: white; font-size: 1em;">
          <input type="checkbox" id="cancelFullscreen" ${GM_getValue('cancelFullscreen', false) ? 'checked' : ''}>
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
      GM_setValue('enableSkipRecap', document.getElementById('enableSkipRecap').checked);
      GM_setValue('enableSkipIntro', document.getElementById('enableSkipIntro').checked);
      GM_setValue('enableSkipOutro', document.getElementById('enableSkipOutro').checked);
      GM_setValue('cancelFullscreen', document.getElementById('cancelFullscreen').checked);
      closeSettingsDialog(); // Close the dialog after saving the settings
    });

    cancelSettingsButton.addEventListener('click', () => {
      console.log('Cancel button clicked');
      closeSettingsDialog(); // Close the dialog without saving the settings
    });
  }

  function closeSettingsDialog() {
    const dialog = document.getElementById('netflixEnchantmentsDialog');
    if (dialog) {
      dialog.remove();
      // Exit fullscreen mode if active
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    }
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function skipRecap() {
    function clickSkipButton(buttonSelector) {
      const skipButton = document.querySelector(buttonSelector);
      if (skipButton) {
        skipButton.click();
      }
    }

    clickSkipButton(skipRecapButtonSelector);
  }

  async function skipIntroAndOutro() {
    skipIntroAttempts = 0;
    skipOutroAttempts = 0;

    function clickSkipButton(buttonSelector) {
      const skipButton = document.querySelector(buttonSelector);
      if (skipButton) {
        skipButton.click();
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

    const enableSkipRecap = GM_getValue('enableSkipRecap', true);
    if (enableSkipRecap) {
      clickSkipButton(skipRecapButtonSelector);
      skipRecapAttempts++;
    }

    const enableSkipIntro = GM_getValue('enableSkipIntro', true);
    if (enableSkipIntro) {
      clickSkipButton(skipIntroButtonSelector);
      skipIntroAttempts++;
    }

    const enableSkipOutro = GM_getValue('enableSkipOutro', true);
    if (enableSkipOutro) {
      clickSkipButton(skipOutroButtonSelector);
      skipOutroAttempts++;
    }

    if (document.querySelector('.watch-video--player-view')) {
      enterFullscreen();
    }

    const cancelFullscreen = GM_getValue('cancelFullscreen', false);
    if (cancelFullscreen && document.fullscreenElement) {
      exitFullscreen();
    }
  }

  setInterval(skipRecap, 1000);
  setInterval(skipIntroAndOutro, 1000);

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
