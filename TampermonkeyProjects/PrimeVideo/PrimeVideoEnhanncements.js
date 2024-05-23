// ==UserScript==
// @name         Prime Video Enchantments
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Enhancements for Prime Video player: auto Fullscreen, skip intro, skip credits, and more.
// @author       JJJ
// @match        https://www.amazon.com/gp/video/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=amazon.com
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
        //enableSkipOutro: GM_getValue('enableSkipOutro', true),
        enableAutoFullscreen: GM_getValue('enableAutoFullscreen', true),
    };

    const selectors = {
        skipRecapButton: 'button.fqye4e3.f1ly7q5u.fk9c3ap.fz9ydgy.f1xrlb00.f1hy0e6n.fgbpje3.f1uteees.f1h2a8xb.atvwebplayersdk-skipelement-button.fjgzbz9.fiqc9rt.fg426ew.f1ekwadg',
        skipIntroButton: 'button.fqye4e3.f1ly7q5u.fk9c3ap.fz9ydgy.f1xrlb00.f1hy0e6n.fgbpje3.f1uteees.f1h2a8xb.atvwebplayersdk-skipelement-button.fjgzbz9.fiqc9rt.fg426ew.f1ekwadg',
        fullscreenVideo: 'video',
    };

    function showSettingsDialog() {
        const dialogHTML = `
        <div id="primeVideoEnchantmentsDialog" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: black; border: 1px solid #ccc; padding: 20px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.3); z-index: 9999; color: white; width: 300px;">
          <h3 style="margin-top: 0; font-size: 1.2em;">Prime Video Enchantments</h3>
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
          <label style="display: block; margin-bottom: 10px; color: white; font-size: 1em;" title="Automatically enter fullscreen mode">
            <input type="checkbox" id="enableAutoFullscreen" ${config.enableAutoFullscreen ? 'checked' : ''}>
            <span style="color: white;">Auto Fullscreen</span>
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
            config.enableAutoFullscreen = document.getElementById('enableAutoFullscreen').checked;
            saveSettings();
            closeSettingsDialog();
        });

        cancelSettingsButton.addEventListener('click', () => {
            console.log('Cancel button clicked');
            closeSettingsDialog();
        });
    }

    function closeSettingsDialog() {
        const dialog = document.getElementById('primeVideoEnchantmentsDialog');
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
        GM_setValue('enableAutoFullscreen', config.enableAutoFullscreen);
    }

    function clickButton(selector) {
        const button = document.querySelector(selector);
        if (button) {
            button.click();
        }
    }

    function enterFullscreen() {
        const videoElement = document.querySelector(selectors.fullscreenVideo);
        if (videoElement) {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            }
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
                // Add selector for skip outro button if available
            }

            if (config.enableAutoFullscreen && !config.cancelFullscreen) {
                enterFullscreen();
            }

        } catch (error) {
            console.error('An error occurred:', error);
        }
    }

    const observer = new MutationObserver(handleSkipActions);
    observer.observe(document.body, { childList: true, subtree: true });

    GM_registerMenuCommand('Prime Video Enchantments', showSettingsDialog);

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