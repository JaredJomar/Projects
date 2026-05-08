// ==UserScript==
// @name         Apple TV Enhancements
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @description  Enhancements for Apple TV video player: auto Fullscreen, skip intro, skip credits, and more.
// @author       JJJ
// @match        https://tv.apple.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=apple.com
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
    let nextEpisode = 0;
    let nextEpisodeClickScheduled = false;

    // Select elements on the page that we will interact with
    const skipRecapButtonSelector = '.skip-intro__button';
    const skipIntroButtonSelector = [
        '.skip-intro__button',
        'button[data-testid="skip-overlay-button-skip-button"]'
    ];
    const nextEpisodeButtonSelector = '.color-primary.hasLabel.hasIcon.ltr-1jtux27';
    const fullscreenButtonSelector = [
        '.footer__control--full-screen',
        'amp-playback-controls-full-screen.fullscreen'
    ];

    // Function to create and show the settings dialog
    function showSettingsDialog() {
        const existingDialog = document.getElementById('AppleTVEnchantmentsDialog');
        if (existingDialog) {
            existingDialog.remove();
        }

                function createToggle(id, label) {
                        return `
                            <div class="dpe-toggle-container" title="${label}">
                                <label class="dpe-toggle">
                                    <input type="checkbox" id="${id}" ${GM_getValue(id, true) ? 'checked' : ''}>
                                    <span class="dpe-toggle-slider"></span>
                                </label>
                                <label for="${id}" class="dpe-toggle-label">${label}</label>
                            </div>
                        `;
                }

                const styleSheet = `
                    <style>
                        .dpe-dialog {
                            position: fixed;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -50%);
                            background: rgba(0, 0, 0, 0.82);
                            border: 1px solid #444;
                            border-radius: 8px;
                            padding: 20px;
                            box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
                            z-index: 9999;
                            color: white;
                            width: 320px;
                            font-family: Arial, sans-serif;
                        }
                        .dpe-dialog h3 {
                            margin: 0 0 20px;
                            font-size: 1.4em;
                            text-align: center;
                        }
                        .dpe-toggle-container {
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            margin-bottom: 15px;
                            gap: 12px;
                        }
                        .dpe-toggle-label {
                            flex-grow: 1;
                            color: white;
                            font-size: 1em;
                        }
                        .dpe-toggle {
                            position: relative;
                            display: inline-block;
                            width: 50px;
                            height: 24px;
                            flex-shrink: 0;
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
                        .dpe-button-container {
                            display: flex;
                            justify-content: space-between;
                            margin-top: 20px;
                            gap: 10px;
                        }
                        .dpe-button {
                            flex: 1;
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
                    </style>
                `;

        const dialogHTML = `
                <div id="AppleTVEnchantmentsDialog" class="dpe-dialog">
                    <h3>Apple TV Enchantments</h3>
                    ${createToggle('enableSkipRecap', 'Skip Recap')}
                    ${createToggle('enableSkipIntro', 'Skip Intro')}
                    ${createToggle('enableNextEpisode', 'Play Next Episode')}
                    ${createToggle('enableFullscreen', 'Auto Full Screen')}
                    <div class="dpe-button-container">
                        <button id="saveSettingsButton" type="button" class="dpe-button dpe-button-save">Save</button>
                        <button id="cancelSettingsButton" type="button" class="dpe-button dpe-button-cancel">Cancel</button>
                    </div>
                </div>
      `;

        const dialogWrapper = document.createElement('div');
                dialogWrapper.innerHTML = styleSheet + dialogHTML;
        document.body.appendChild(dialogWrapper);
        isSettingsDialogOpen = true;

        const dialog = dialogWrapper.querySelector('#AppleTVEnchantmentsDialog');
        const saveSettingsButton = dialog.querySelector('#saveSettingsButton');
        const cancelSettingsButton = dialog.querySelector('#cancelSettingsButton');

        saveSettingsButton.addEventListener('click', () => {
            console.log('Save button clicked');
            GM_setValue('enableSkipRecap', document.getElementById('enableSkipRecap').checked);
            GM_setValue('enableSkipIntro', document.getElementById('enableSkipIntro').checked);
            GM_setValue('enableNextEpisode', document.getElementById('enableNextEpisode').checked);
            GM_setValue('enableFullscreen', document.getElementById('enableFullscreen').checked);
            closeSettingsDialog(); // Close the dialog after saving the settings
        });

        cancelSettingsButton.addEventListener('click', () => {
            console.log('Cancel button clicked');
            closeSettingsDialog(); // Close the dialog without saving the settings
        });
    }

    function closeSettingsDialog() {
        const dialog = document.getElementById('AppleTVEnchantmentsDialog');
        if (dialog) {
            dialog.remove();
            // Exit fullscreen mode if active
            if (document.fullscreenElement) {
                document.exitFullscreen();
            }
            isSettingsDialogOpen = false;
            requestAnimationFrame(() => {
                if (document.body) {
                    document.body.click();
                }
            });
        }
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function skipRecap() {
        function clickSkipButton(buttonSelector) {
            const selectors = Array.isArray(buttonSelector) ? buttonSelector : [buttonSelector];
            const skipButton = selectors
                .map(selector => document.querySelector(selector))
                .find(Boolean);

            if (skipButton) {
                skipButton.click();
            }
        }

        clickSkipButton(skipRecapButtonSelector);
    }

    async function skipIntroAndOutro() {
        skipIntroAttempts = 0;
        nextEpisode = 0;

        function clickSkipButton(buttonSelector) {
            const selectors = Array.isArray(buttonSelector) ? buttonSelector : [buttonSelector];
            const skipButton = selectors
                .map(selector => document.querySelector(selector))
                .find(Boolean);

            if (skipButton) {
                skipButton.click();
            }
        }

        function findPlayNextEpisodeButton() {
            const buttonLabels = ['Play Next Episode', 'Next Episode'];

            return Array.from(document.querySelectorAll('button')).find(button => {
                const text = (button.textContent || '').replace(/\s+/g, ' ').trim();
                return buttonLabels.some(label => text.includes(label));
            });
        }

        function enterFullscreen() {
            const fullscreenControl = document.querySelector(fullscreenButtonSelector.join(','));

            if (fullscreenControl) {
                fullscreenControl.click();
                return;
            }

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

        const enableNextEpisode = GM_getValue('enableNextEpisode', true);
        if (enableNextEpisode) {
            const nextEpisodeButton = document.querySelector(nextEpisodeButtonSelector) || findPlayNextEpisodeButton();

            if (nextEpisodeButton && !nextEpisodeClickScheduled) {
                nextEpisodeClickScheduled = true;
                setTimeout(() => {
                    const nextEpisodeButton = document.querySelector(nextEpisodeButtonSelector) || findPlayNextEpisodeButton();

                    if (nextEpisodeButton) {
                        nextEpisodeButton.click();
                    }

                    nextEpisodeClickScheduled = false;
                }, 5000);
            }

            if (!nextEpisodeButton) {
                nextEpisodeClickScheduled = false;
            }

            nextEpisode++;
        }

        const enableFullscreen = GM_getValue('enableFullscreen', true);
        if (enableFullscreen) {
            enterFullscreen();
        }
    }

    setInterval(skipRecap, 1000);
    setInterval(skipIntroAndOutro, 1000);

    GM_registerMenuCommand('Apple TV Enchantments', showSettingsDialog);

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
