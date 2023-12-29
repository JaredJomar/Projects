// ==UserScript==
// @name         Disney Plus Enhancements
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  Enhancements for Disney Plus video player: auto Fullscreen, skip intro, skip credits, and more.
// @author       JJJ
// @match        https://www.disneyplus.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=disneyplus.com
// @require      https://ajax.googleapis.com/ajax/libs/jquery/2.2.4/jquery.min.js
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
  const MAX_SKIP_ATTEMPTS = 5;
  let skipAttempts = 0;

  // Select elements on the page that we will interact with
  const skipIntroButtonSelector = '.skip__button:first-child';
  const autoPlayButtonSelector = '*[data-testid="up-next-play-button"]';

  // Function to create and show the settings dialog
  function showSettingsDialog() {
    const dialogHTML = `
      <div id="disneyPlusEnhancementsDialog" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #fff; padding: 20px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.3); z-index: 9999;">
        <h3>Disney Plus Enhancements - Settings</h3>
                  <br>
        <label>
          <input type="checkbox" id="enableAutoFullscreen" ${GM_getValue('enableAutoFullscreen', true) ? 'checked' : ''}>
          Enable Auto Fullscreen
        </label>
        <br>
        <label>
          <input type="checkbox" id="enableSkipIntro" ${GM_getValue('enableSkipIntro', true) ? 'checked' : ''}>
          Skip Intro
        </label>
        <br>
        <label>
          <input type="checkbox" id="enableAutoPlayNext" ${GM_getValue('enableAutoPlayNext', false) ? 'checked' : ''}>
          Auto Play Next Episode
        </label>
        <br>
        <button id="saveSettingsButton">Save</button>
      </div>
    `;

    const dialogWrapper = document.createElement('div');
    dialogWrapper.innerHTML = dialogHTML;

    document.body.appendChild(dialogWrapper);

    // Add event listener to the "Save" button
    const saveSettingsButton = document.getElementById('saveSettingsButton');
    saveSettingsButton.addEventListener('click', () => {
      // Save the state of each option to local storage
      GM_setValue('enableSkipIntro', document.getElementById('enableSkipIntro').checked);
      GM_setValue('enableAutoPlayNext', document.getElementById('enableAutoPlayNext').checked);
      GM_setValue('enableAutoFullscreen', document.getElementById('enableAutoFullscreen').checked);

      // Close the dialog after saving settings
      document.getElementById('disneyPlusEnhancementsDialog').remove();
    });
  }

  async function skipIntroAndFullscreen() {
    // Reset skipAttempts on every execution
    skipAttempts = 0;

    // Function to check if an element is visible
    function isElementVisible(element) {
      return element && element.offsetParent !== null;
    }

    // Helper function to dispatch keydown event
    function dispatchKeydownEvent(key) {
      const event = new KeyboardEvent('keydown', { key });
      document.dispatchEvent(event);
    }

    // Detect if a video is playing (example: checking if a video element exists)
    const videoElement = document.querySelector('video');

    if (videoElement) {
      // Request fullscreen if it hasn't been done yet and the "Enable Auto Fullscreen" option is enabled
      if (!document.fullscreenElement && GM_getValue('enableAutoFullscreen', true)) {
        document.documentElement.requestFullscreen();
      }
    }

    // Automatically skip intros or recaps if the button is present and visible
    const enableSkipIntro = GM_getValue('enableSkipIntro', true);
    const skipIntroButton = document.querySelector(skipIntroButtonSelector);
    if (enableSkipIntro && skipIntroButton && isElementVisible(skipIntroButton)) {
      skipIntroButton.firstChild.click();
      skipAttempts++;
    }

    // Automatically play the next episode if the button is present and visible
    const enableAutoPlayNext = GM_getValue('enableAutoPlayNext', false);
    const autoPlayButton = document.querySelector(autoPlayButtonSelector);
    if (enableAutoPlayNext && autoPlayButton && isElementVisible(autoPlayButton)) {
      autoPlayButton.click();
    }


    // Use requestAnimationFrame() to call this function at most once per frame,
    // which is more efficient and optimized for animations and timers compared to setInterval()
    window.requestAnimationFrame(skipIntroAndFullscreen);
  }

  // Add a custom menu "Disney Plus Enhancements - Settings"
  GM_registerMenuCommand('Disney Plus Enhancements - Settings', showSettingsDialog);

  // Call the skipIntroAndFullscreen() function for the first time
  window.requestAnimationFrame(skipIntroAndFullscreen);

  // Add an event listener for the hashchange event
  window.addEventListener('hashchange', () => {
    // When the hash (URL) changes, execute skipIntroAndFullscreen() again
    window.requestAnimationFrame(skipIntroAndFullscreen);
  });
})();
