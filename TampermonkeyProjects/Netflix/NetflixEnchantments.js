// ==UserScript==
// @name         Netflix Enchantments
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Enhancements for Netflix video player: skip intro, skip outro, and more.
// @author       JJJ
// @match        https://www.netflix.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=netflix.com
// @require      https://ajax.googleapis.com/ajax/libs/jquery/2.2.4/jquery.min.js
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
  const MAX_SKIP_ATTEMPTS = 5;
  let skipIntroAttempts = 0;
  let skipOutroAttempts = 0;

  // Select elements on the page that we will interact with
  const skipIntroButtonSelector = '.button-primary.watch-video--skip-content-button.medium.hasLabel.ltr-1mjzmhv';
  const skipOutroButtonSelector = '.color-primary.hasLabel.hasIcon.ltr-1jtux27';

  // Function to create and show the settings dialog
  function showSettingsDialog() {
    const dialogHTML = `
      <div id="netflixEnchantmentsDialog" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: black; border: 1px solid #ccc; padding: 20px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.3); z-index: 9999; color: white;">
        <h3 style="margin-top: 0;">Netflix Enchantments - Configuración</h3>
        <label style="display: block; margin-bottom: 10px; color: white;">
          <input type="checkbox" id="enableSkipIntro" ${GM_getValue('enableSkipIntro', true) ? 'checked' : ''}>
          <span style="color: white;">Skip Intro</span>
        </label>
        <label style="display: block; margin-bottom: 10px; color: white;">
          <input type="checkbox" id="enableSkipOutro" ${GM_getValue('enableSkipOutro', true) ? 'checked' : ''}>
          <span style="color: white;">Skip Outro</span>
        </label>
        <label style="display: block; margin-bottom: 10px; color: white;">
          <input type="checkbox" id="cancelFullscreen" ${GM_getValue('cancelFullscreen', false) ? 'checked' : ''}>
          <span style="color: white;">Cancel Fullscreen</span>
        </label>
        <button id="saveSettingsButton" style="padding: 8px 12px; background-color: #0078d4; color: white; border: none; cursor: pointer;">Guardar</button>
      </div>
    `;

    const dialogWrapper = document.createElement('div');
    dialogWrapper.innerHTML = dialogHTML;

    document.body.appendChild(dialogWrapper);

    // Add event listener to the "Guardar" button
    const saveSettingsButton = document.getElementById('saveSettingsButton');
    saveSettingsButton.addEventListener('click', () => {
      // Save the state of each option to local storage
      GM_setValue('enableSkipIntro', document.getElementById('enableSkipIntro').checked);
      GM_setValue('enableSkipOutro', document.getElementById('enableSkipOutro').checked);
      GM_setValue('cancelFullscreen', document.getElementById('cancelFullscreen').checked);

      // Close the dialog after saving settings
      document.getElementById('netflixEnchantmentsDialog').remove();
    });
  }

  function sleep(ms) {
    // Define a promise to sleep for a given number of milliseconds
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function skipIntroAndOutro() {
    // Reset skipIntroAttempts and skipOutroAttempts on every execution
    skipIntroAttempts = 0;
    skipOutroAttempts = 0;

    // Helper function to click the skip intro or outro button
    function clickSkipButton(buttonSelector) {
      const skipButton = document.querySelector(buttonSelector);
      if (skipButton) {
        skipButton.click();
      }
    }

    // Helper function to enter fullscreen
    function enterFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      }
    }

    // Helper function to exit fullscreen
    function exitFullscreen() {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    }

    // Automatically skip intro if the button is present and visible
    const enableSkipIntro = GM_getValue('enableSkipIntro', true);
    if (enableSkipIntro) {
      clickSkipButton(skipIntroButtonSelector);
      skipIntroAttempts++;
    }

    // Automatically skip outro if the button is present and visible
    const enableSkipOutro = GM_getValue('enableSkipOutro', true);
    if (enableSkipOutro) {
      clickSkipButton(skipOutroButtonSelector);
      skipOutroAttempts++;
    }

    // Automatically enter fullscreen when a video starts playing
    if (document.querySelector('.watch-video--player-view')) {
      enterFullscreen();
    }

    // Automatically exit fullscreen if the cancelFullscreen option is enabled
    const cancelFullscreen = GM_getValue('cancelFullscreen', false);
    if (cancelFullscreen && document.fullscreenElement) {
      exitFullscreen();
    }

    // Use requestAnimationFrame() to call this function at most once per frame,
    // which is more efficient and optimized for animations and timers compared to setInterval()
    window.requestAnimationFrame(skipIntroAndOutro);
  }

  // Add a custom menu "Netflix Enchantments - Configuración"
  GM_registerMenuCommand('Netflix Enchantments - Configuración', showSettingsDialog);

  // Call the skipIntroAndOutro() function for the first time
  window.requestAnimationFrame(skipIntroAndOutro);

  // Add an event listener for the hashchange event
  window.addEventListener('hashchange', () => {
    // When the hash (URL) changes, execute skipIntroAndOutro() again
    window.requestAnimationFrame(skipIntroAndOutro);
  });
})();