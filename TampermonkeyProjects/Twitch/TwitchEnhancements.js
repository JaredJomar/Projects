// ==UserScript==
// @name         Twitch Enhancements
// @namespace    http://tampermonkey.net/
// @version      0.5.6
// @description  Automatically claim channel points, enable theater mode, claim prime rewards, claim drops, and add redeem buttons for GOG and Legacy Games on Twitch and Amazon Gaming websites.
// @author       JJJ
// @match        https://www.twitch.tv/*
// @match        https://gaming.amazon.com/*
// @match        https://luna.amazon.com/*
// @match        https://www.twitch.tv/drops/inventory*
// @match        https://www.gog.com/en/redeem
// @match        https://www.gog.com/redeem/*
// @match        https://promo.legacygames.com/*
// @icon         https://th.bing.com/th/id/R.d71be224f193da01e7e499165a8981c5?rik=uBYlAxJ4XyXmJg&riu=http%3a%2f%2fpngimg.com%2fuploads%2ftwitch%2ftwitch_PNG28.png&ehk=PMc5m5Fil%2bhyq1zilk3F3cuzxSluXFBE80XgxVIG0rM%3d&risl=&pid=ImgRaw&r=0
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    // Twitch Constants
    const PLAYER_SELECTOR = '.video-player';
    const THEATER_MODE_BUTTON_SELECTOR = [
        'button[aria-label="Modo cine (alt+t)"]',
        'button[aria-label="Theater Mode (alt+t)"]'
    ].join(',');
    const CLOSE_MENU_BUTTON_SELECTOR = [
        'button[aria-label="Close Menu"]',
        'button[aria-label="Cerrar Menú"]'
    ].join(',');
    const CLOSE_MODAL_BUTTON_SELECTOR = [
        'button[aria-label="Close modal"]',
        'button[aria-label="Cerrar modal"]'
    ].join(',');
    const THEATER_MODE_CLASS = 'theater-mode';
    const CLAIMABLE_BONUS_SELECTOR = '.claimable-bonus__icon';
    const CLAIM_DROPS_SELECTOR = [
        'button.ScCoreButton-sc-ocjdkq-0.eWlfQB',
        'button[data-test-selector="DropsCampaignInProgressRewardPresentation-claim-button"]'
    ].join(',');
    const PRIME_REWARD_SELECTOR = [
        'button.tw-interactive.tw-button.tw-button--full-width[data-a-target="buy-box_call-to-action"] span.tw-button__text div.tw-inline-block p.tw-font-size-5.tw-md-font-size-4[title="Get game"]',
        'button.tw-interactive.tw-button.tw-button--full-width[data-a-target="buy-box_call-to-action"] span.tw-button__text div.tw-inline-block p.tw-font-size-5.tw-md-font-size-4[title="Obtener juego"]',
        'p.tw-font-size-5.tw-md-font-size-4[data-a-target="buy-box_call-to-action-text"][title="Get game"]',
        'p.tw-font-size-5.tw-md-font-size-4[data-a-target="buy-box_call-to-action-text"][title="Obtener juego"]'
    ].join(',');

    // Redeem on GOG Constants
    const GOG_REDEEM_CODE_INPUT_SELECTOR = '#codeInput';
    const GOG_CONTINUE_BUTTON_SELECTOR = 'button[type="submit"][aria-label="Proceed to the next step"]';
    const GOG_FINAL_REDEEM_BUTTON_SELECTOR = 'button[type="submit"][aria-label="Redeem the code"]';

    // Redeem on Legacy Games Constants
    const LEGACY_GAMES_REDEEM_URL = 'https://promo.legacygames.com/gallery-of-things-reveries-prime-deal/';
    const LEGACY_GAMES_CODE_INPUT_SELECTOR = '#primedeal_game_code';
    const LEGACY_GAMES_EMAIL_INPUT_SELECTOR = '#primedeal_email';
    const LEGACY_GAMES_EMAIL_VALIDATE_INPUT_SELECTOR = '#primedeal_email_validate';
    const LEGACY_GAMES_SUBMIT_BUTTON_SELECTOR = '#submitbutton';
    const LEGACY_GAMES_NEWSLETTER_CHECKBOX_SELECTOR = '#primedeal_newsletter';

    // SettingsManager Class
    class SettingsManager {
        static CONFIG = {
            enableAutoClaimPoints: GM_getValue('enableAutoClaimPoints', true),
            enableTheaterMode: GM_getValue('enableTheaterMode', true),
            enableClaimPrimeRewards: GM_getValue('enableClaimPrimeRewards', true),
            enableClaimDrops: GM_getValue('enableClaimDrops', true),
            enableGogRedeemButton: GM_getValue('enableGogRedeemButton', true),
            enableLegacyGamesRedeemButton: GM_getValue('enableLegacyGamesRedeemButton', true),
            enableHideGlobalMenu: GM_getValue('enableHideGlobalMenu', true),
            enableAutoRefreshDrops: GM_getValue('enableAutoRefreshDrops', true),
            enableClaimAllButton: GM_getValue('enableClaimAllButton', true),
            enableRemoveAllButton: GM_getValue('enableRemoveAllButton', true),
            enableDebugLogs: GM_getValue('enableDebugLogs', false),
            settingsKey: GM_getValue('settingsKey', 'F2') // Default to F2 if not set
        };

        static loadConfig() {
            // Already loaded in static CONFIG
        }

        static saveConfig(key, value) {
            this.CONFIG[key] = value;
            GM_setValue(key, value);
        }

        static createSettingsDialog() {
            const dialogHTML = `
                <div id="twitchEnhancementsDialog" class="te-dialog">
                    <h3>Twitch Enhancements Settings</h3>
                    ${this.createToggle('enableAutoClaimPoints', 'Auto Claim Channel Points', 'Automatically claim channel points')}
                    ${this.createToggle('enableTheaterMode', 'Auto Theater Mode', 'Automatically enable theater mode')}
                    ${this.createToggle('enableClaimPrimeRewards', 'Auto Claim Prime Rewards', 'Automatically claim prime rewards')}
                    ${this.createToggle('enableClaimDrops', 'Auto Claim Drops', 'Automatically claim Twitch drops')}
                    ${this.createToggle('enableGogRedeemButton', 'GOG Redeem Button', 'Add GOG redeem button on Amazon Gaming')}
                    ${this.createToggle('enableLegacyGamesRedeemButton', 'Legacy Games Button', 'Add Legacy Games redeem button on Amazon Gaming')}
                    ${this.createToggle('enableHideGlobalMenu', 'Hide Global Menu', 'Hide the global menu on Twitch')}
                    ${this.createToggle('enableAutoRefreshDrops', 'Auto Refresh Drops', 'Automatically refresh drops inventory page every 15 minutes')}
                    ${this.createToggle('enableClaimAllButton', 'Enable Claim All Button', 'Add Claim All button on Amazon Gaming')}
                    ${this.createToggle('enableRemoveAllButton', 'Enable Remove All Button', 'Add Remove All button on Amazon Gaming')}
                    ${this.createToggle('enableDebugLogs', 'Enable Debug Logs', 'Show informational logs in console')}
                    <div class="te-key-setting">
                        <label for="settingsKey" class="te-key-label">Settings Toggle Key:</label>
                        <div class="te-key-input-container">
                            <input type="text" id="settingsKey" class="te-key-input" value="${this.CONFIG.settingsKey}" readonly>
                            <button id="changeKeyButton" class="te-key-button">Change Key</button>
                        </div>
                        <div id="keyInstructions" class="te-key-instructions" style="display:none;">Press any key...</div>
                    </div>
                    <div class="te-button-container">
                        <button id="saveSettingsButton" class="te-button te-button-save">Save</button>
                        <button id="cancelSettingsButton" class="te-button te-button-cancel">Cancel</button>
                    </div>
                </div>
            `;

            const styleSheet = `
                <style>
                    .te-dialog {
                        position: fixed;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        background: rgba(18, 16, 24, 0.9);
                        border: 1px solid #772ce8;
                        border-radius: 8px;
                        padding: 20px;
                        box-shadow: 0 0 20px rgba(0, 0, 0, 0.7);
                        z-index: 9999999; /* Increased z-index to ensure it appears above all elements */
                        color: white;
                        width: 350px;
                        font-family: 'Roobert', 'Inter', Helvetica, Arial, sans-serif;
                    }
                    .te-dialog h3 {
                        margin-top: 0;
                        font-size: 1.4em;
                        text-align: center;
                        margin-bottom: 20px;
                        color: #bf94ff;
                    }
                    .te-toggle-container {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 15px;
                    }
                    .te-toggle-label {
                        flex-grow: 1;
                        font-size: 0.95em;
                    }
                    .te-toggle {
                        position: relative;
                        display: inline-block;
                        width: 50px;
                        height: 24px;
                    }
                    .te-toggle input {
                        position: absolute;
                        width: 100%;
                        height: 100%;
                        opacity: 0;
                        cursor: pointer;
                        margin: 0;
                    }
                    .te-toggle-slider {
                        position: absolute;
                        cursor: pointer;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background-color: #333;
                        transition: .4s;
                        border-radius: 24px;
                    }
                    .te-toggle-slider:before {
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
                    .te-toggle input:checked + .te-toggle-slider {
                        background-color: #9147ff;
                    }
                    .te-toggle input:checked + .te-toggle-slider:before {
                        transform: translateX(26px);
                    }
                    .te-button-container {
                        display: flex;
                        justify-content: space-between;
                        margin-top: 20px;
                    }
                    .te-button {
                        padding: 8px 16px;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 0.95em;
                        transition: background-color 0.3s;
                    }
                    .te-button-save {
                        background-color: #9147ff;
                        color: white;
                    }
                    .te-button-save:hover {
                        background-color: #772ce8;
                    }
                    .te-button-cancel {
                        background-color: #464649;
                        color: white;
                    }
                    .te-button-cancel:hover {
                        background-color: #2d2d30;
                    }
                    .te-key-setting {
                        margin-top: 20px;
                        padding-top: 15px;
                        border-top: 1px solid #464649;
                    }
                    .te-key-label {
                        display: block;
                        margin-bottom: 10px;
                        font-size: 0.95em;
                    }
                    .te-key-input-container {
                        display: flex;
                        gap: 10px;
                    }
                    .te-key-input {
                        flex: 1;
                        background-color: #18181b;
                        color: white;
                        border: 1px solid #464649;
                        border-radius: 4px;
                        padding: 8px;
                        text-align: center;
                        font-size: 14px;
                    }
                    .te-key-button {
                        background-color: #464649;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        padding: 8px 12px;
                        cursor: pointer;
                        font-size: 0.85em;
                    }
                    .te-key-button:hover {
                        background-color: #5c5c5f;
                    }
                    .te-key-instructions {
                        margin-top: 10px;
                        font-size: 0.85em;
                        color: #bf94ff;
                        text-align: center;
                    }
                </style>
            `;

            const dialogWrapper = document.createElement('div');
            dialogWrapper.innerHTML = styleSheet + dialogHTML;
            document.body.appendChild(dialogWrapper);

            // Add event listeners to toggles with improved feedback - MODIFIED
            // Store toggle changes in memory instead of immediately updating CONFIG
            const pendingChanges = {}; // Object to track pending changes

            document.querySelectorAll('.te-toggle input').forEach(toggle => {
                toggle.addEventListener('change', (event) => {
                    const { id, checked } = event.target;
                    Logger.info(`Toggle changed: ${id} = ${checked}`);
                    // Instead of updating CONFIG directly, store the pending change
                    pendingChanges[id] = checked;
                });
            });

            // Add event listeners to buttons
            document.getElementById('saveSettingsButton').addEventListener('click', () => this.saveAndCloseDialog(pendingChanges));
            document.getElementById('cancelSettingsButton').addEventListener('click', this.closeDialog);

            // Add event listener for change key button
            const changeKeyButton = document.getElementById('changeKeyButton');
            changeKeyButton.addEventListener('click', function () {
                const keyInput = document.getElementById('settingsKey');
                const keyInstructions = document.getElementById('keyInstructions');

                // Show instructions and focus on input
                keyInstructions.style.display = 'block';
                keyInstructions.textContent = 'Press key combination (e.g. Ctrl+Shift+K)...';
                keyInput.value = 'Press keys...';

                // Change button text to indicate canceling is possible
                changeKeyButton.textContent = 'Cancel';

                // Flag to track if we're in key capture mode
                let capturingKey = true;

                // Variables to store key combination
                let modifiers = {
                    ctrl: false,
                    alt: false,
                    shift: false,
                    meta: false
                };
                let mainKey = '';

                // Function to format current key combination
                const formatKeyCombination = () => {
                    const parts = [];
                    if (modifiers.ctrl) parts.push('Ctrl');
                    if (modifiers.alt) parts.push('Alt');
                    if (modifiers.shift) parts.push('Shift');
                    if (modifiers.meta) parts.push('Meta');
                    if (mainKey && !['Control', 'Alt', 'Shift', 'Meta'].includes(mainKey)) {
                        parts.push(mainKey);
                    }
                    return parts.join('+');
                };

                // Function to update the input with current combination
                const updateKeyDisplay = () => {
                    const combination = formatKeyCombination();
                    if (combination) {
                        keyInput.value = combination;
                    } else {
                        keyInput.value = 'Press keys...';
                    }
                };

                // Function to handle key down
                const handleKeyDown = function (e) {
                    if (!capturingKey) return;

                    e.preventDefault();
                    e.stopPropagation();

                    // Track modifier keys
                    if (e.key === 'Control' || e.key === 'Alt' || e.key === 'Shift' || e.key === 'Meta') {
                        switch (e.key) {
                            case 'Control': modifiers.ctrl = true; break;
                            case 'Alt': modifiers.alt = true; break;
                            case 'Shift': modifiers.shift = true; break;
                            case 'Meta': modifiers.meta = true; break;
                        }
                    } else {
                        // Track main key
                        mainKey = e.key;
                    }

                    // Update the display
                    updateKeyDisplay();
                };

                // Function to handle key up
                const handleKeyUp = function (e) {
                    if (!capturingKey) return;

                    e.preventDefault();
                    e.stopPropagation();

                    // Handle modifier keys being released
                    if (e.key === 'Control' || e.key === 'Alt' || e.key === 'Shift' || e.key === 'Meta') {
                        switch (e.key) {
                            case 'Control': modifiers.ctrl = false; break;
                            case 'Alt': modifiers.alt = false; break;
                            case 'Shift': modifiers.shift = false; break;
                            case 'Meta': modifiers.meta = false; break;
                        }

                        // Update the display
                        updateKeyDisplay();
                    } else {
                        // If a non-modifier key was released, complete the capture
                        const keyCombination = formatKeyCombination();

                        // Only save if we have a valid combination (at least one key)
                        if (keyCombination && keyCombination !== 'Press keys...') {
                            keyInput.value = keyCombination;

                            // Exit key capture mode
                            document.removeEventListener('keydown', handleKeyDown, true);
                            document.removeEventListener('keyup', handleKeyUp, true);
                            keyInstructions.style.display = 'none';
                            changeKeyButton.textContent = 'Change Key';
                            capturingKey = false;

                            // Log the captured combination
                            Logger.info(`Key combination captured: ${keyCombination}`);
                        }
                    }
                };

                // Function to cancel key capture
                const cancelCapture = function () {
                    if (!capturingKey) return;

                    document.removeEventListener('keydown', handleKeyDown, true);
                    document.removeEventListener('keyup', handleKeyUp, true);
                    keyInput.value = SettingsManager.CONFIG.settingsKey;
                    keyInstructions.style.display = 'none';
                    changeKeyButton.textContent = 'Change Key';
                    capturingKey = false;
                };

                // Allow canceling key capture by clicking the button again
                changeKeyButton.addEventListener('click', cancelCapture, { once: true });

                // Capture key events
                document.addEventListener('keydown', handleKeyDown, true);
                document.addEventListener('keyup', handleKeyUp, true);
            });
        }

        static createToggle(id, label, title) {
            return `
                <div class="te-toggle-container" title="${title}">
                    <label class="te-toggle">
                        <input type="checkbox" id="${id}" ${this.CONFIG[id] ? 'checked' : ''}>
                        <span class="te-toggle-slider"></span>
                    </label>
                    <label for="${id}" class="te-toggle-label">${label}</label>
                </div>
            `;
        }

        // Modified saveAndCloseDialog function to apply changes dynamically
        static saveAndCloseDialog(pendingChanges = {}) {
            // Create a deep copy of the CONFIG object before any changes are made
            const oldConfig = JSON.parse(JSON.stringify(this.CONFIG));
            let changesMade = false;

            // Improved debugging output
            Logger.info("Checking for settings changes...");

            // Save toggle settings
            Object.keys(this.CONFIG).forEach(key => {
                if (key === 'settingsKey') return; // Handle separately

                // Check if this setting has a pending change
                if (pendingChanges.hasOwnProperty(key)) {
                    const oldValue = oldConfig[key];
                    const newValue = pendingChanges[key];

                    // Log the comparison for debugging
                    Logger.info(`Comparing ${key}: old=${oldValue} (${typeof oldValue}), new=${newValue} (${typeof newValue})`);

                    // Compare values - both should be booleans for toggle settings
                    if (oldValue !== newValue) {
                        changesMade = true;
                        Logger.info(`Changed ${key} from ${oldValue} to ${newValue}`);
                        this.CONFIG[key] = newValue;
                        GM_setValue(key, newValue);
                    }
                } else {
                    // If no pending change, get value from form element
                    const element = document.getElementById(key);
                    if (element) {
                        const oldValue = oldConfig[key];
                        const newValue = element.checked;

                        // Log the comparison for debugging
                        Logger.info(`Comparing ${key}: old=${oldValue} (${typeof oldValue}), new=${newValue} (${typeof newValue})`);

                        // Compare values
                        if (oldValue !== newValue) {
                            changesMade = true;
                            Logger.info(`Changed ${key} from ${oldValue} to ${newValue}`);
                            this.CONFIG[key] = newValue;
                            GM_setValue(key, newValue);
                        }
                    }
                }
            });

            // Save settings key
            const keyInput = document.getElementById('settingsKey');
            if (keyInput && keyInput.value !== oldConfig.settingsKey) {
                changesMade = true;
                Logger.info(`Changed settings key from ${oldConfig.settingsKey} to ${keyInput.value}`);
                this.CONFIG.settingsKey = keyInput.value;
                GM_setValue('settingsKey', keyInput.value);
            }

            this.closeDialog();

            if (changesMade) {
                Logger.success('Settings saved and applied immediately');
                // Note: applySettingsChanges will be called by FeatureInitializer
            } else {
                // Show more helpful message when no changes are detected
                Logger.info('No changes detected. Settings remain the same.');
            }
        }

        static closeDialog() {
            const dialog = document.getElementById('twitchEnhancementsDialog');
            if (dialog) {
                dialog.remove();
            }
        }

        static toggleSettingsDialog() {
            const dialog = document.getElementById('twitchEnhancementsDialog');
            if (dialog) {
                dialog.remove();
            } else {
                this.createSettingsDialog();
            }
        }
    }

    // Logger Class
    class Logger {
        static styles = {
            info: 'color: #2196F3; font-weight: bold',
            warning: 'color: #FFC107; font-weight: bold',
            success: 'color: #4CAF50; font-weight: bold',
            error: 'color: #F44336; font-weight: bold'
        };
        static prefix = '[TwitchEnhancements]';

        static getTimestamp() {
            return new Date().toISOString().split('T')[1].slice(0, -1);
        }

        static info(msg) {
            if (!SettingsManager.CONFIG.enableDebugLogs) return;
            console.log(`%c${this.prefix} ${this.getTimestamp()} - ${msg}`, this.styles.info);
        }

        static warning(msg) {
            if (!SettingsManager.CONFIG.enableDebugLogs) return;
            console.warn(`%c${this.prefix} ${this.getTimestamp()} - ${msg}`, this.styles.warning);
        }

        static success(msg) {
            if (!SettingsManager.CONFIG.enableDebugLogs) return;
            console.log(`%c${this.prefix} ${this.getTimestamp()} - ${msg}`, this.styles.success);
        }

        static error(msg) {
            console.error(`%c${this.prefix} ${this.getTimestamp()} - ${msg}`, this.styles.error);
        }
    }

    // Backward-compat alias used by legacy helper functions in this file.
    const CONFIG = SettingsManager.CONFIG;

    // Register menu command
    GM_registerMenuCommand('Twitch Enhancements Settings', () => SettingsManager.toggleSettingsDialog());

    // ObserverManager Class
    class ObserverManager {
        static observers = new Map();

        static createObserver(id, selector, callback) {
            if (!MutationObserver) return null;

            const observer = new MutationObserver(callback);
            observer.observe(document.body, { childList: true, subtree: true });
            this.observers.set(id, observer);
            return observer;
        }

        static disconnectObserver(id) {
            const observer = this.observers.get(id);
            if (observer) {
                observer.disconnect();
                this.observers.delete(id);
            }
        }

        static disconnectAll() {
            for (const [id, observer] of this.observers) {
                observer.disconnect();
            }
            this.observers.clear();
        }

        static restartObserver(id, selector, callback) {
            this.disconnectObserver(id);
            return this.createObserver(id, selector, callback);
        }
    }

    // AutoClaimer Class
    class AutoClaimer {
        static claiming = false;

        static startClaimingPoints() {
            if (!SettingsManager.CONFIG.enableAutoClaimPoints || !MutationObserver) return;

            Logger.info('Auto claimer is enabled.');

            ObserverManager.createObserver('claimPoints', CLAIMABLE_BONUS_SELECTOR, (mutationsList) => {
                for (let mutation of mutationsList) {
                    if (mutation.type === 'childList' && SettingsManager.CONFIG.enableAutoClaimPoints) {
                        let bonus = document.querySelector(CLAIMABLE_BONUS_SELECTOR);
                        if (bonus && !this.claiming) {
                            bonus.click();
                            let date = new Date();
                            this.claiming = true;
                            setTimeout(() => {
                                Logger.success('Claimed at ' + date.toLocaleString());
                                this.claiming = false;
                            }, Math.random() * 1000 + 2000);
                        }
                    }
                }
            });
        }

        static startClaimingDrops() {
            if (!SettingsManager.CONFIG.enableClaimDrops || !MutationObserver) return;

            ObserverManager.createObserver('claimDrops', CLAIM_DROPS_SELECTOR, (mutationsList) => {
                mutationsList.forEach(mutation => {
                    if (SettingsManager.CONFIG.enableClaimDrops && document.querySelector(CLAIM_DROPS_SELECTOR)) {
                        document.querySelector(CLAIM_DROPS_SELECTOR).click();
                    }
                });
            });
            Logger.info('Claim drops observer started');
        }

        static stop() {
            ObserverManager.disconnectObserver('claimPoints');
            ObserverManager.disconnectObserver('claimDrops');
        }
    }

    // UIEnhancer Class
    class UIEnhancer {
        static enableTheaterMode() {
            if (!SettingsManager.CONFIG.enableTheaterMode) return;

            const player = document.querySelector(PLAYER_SELECTOR);
            if (player) {
                if (!player.classList.contains(THEATER_MODE_CLASS)) {
                    this.clickButton(THEATER_MODE_BUTTON_SELECTOR);
                }
            } else {
                Logger.error('Player not found');
            }
        }

        static hideGlobalMenu() {
            if (!SettingsManager.CONFIG.enableHideGlobalMenu) return;

            const GLOBAL_MENU_SELECTOR = 'div.ScBalloonWrapper-sc-14jr088-0.eEhNFm';
            const globalMenu = document.querySelector(GLOBAL_MENU_SELECTOR);
            if (globalMenu) {
                globalMenu.style.display = 'none';
            } else {
                Logger.error('Global menu not found');
            }
        }

        static showGlobalMenu() {
            const GLOBAL_MENU_SELECTOR = 'div.ScBalloonWrapper-sc-14jr088-0.eEhNFm';
            const globalMenu = document.querySelector(GLOBAL_MENU_SELECTOR);
            if (globalMenu) {
                globalMenu.style.display = '';
                Logger.info('Global menu restored');
            }
        }

        static clickButton(buttonSelector) {
            if (!MutationObserver) return;

            const observer = new MutationObserver((mutationsList, observer) => {
                for (let mutation of mutationsList) {
                    if (mutation.addedNodes.length) {
                        const button = document.querySelector(buttonSelector);
                        if (button) {
                            button.click();
                            observer.disconnect();
                            return;
                        }
                    }
                }
            });

            observer.observe(document, { childList: true, subtree: true });
        }

        static addGogRedeemButton() {
            if (!SettingsManager.CONFIG.enableGogRedeemButton) return;

            const claimCodeButton = document.querySelector('p[title="Claim Code"]');
            if (claimCodeButton && !document.querySelector('.gog-redeem-button')) {
                const claimCodeWrapper = claimCodeButton.closest('.claim-button-wrapper');
                if (claimCodeWrapper) {
                    const gogRedeemButtonDiv = document.createElement('div');
                    gogRedeemButtonDiv.className = 'claim-button tw-align-self-center gog-redeem-button';

                    const gogRedeemButton = document.createElement('a');
                    gogRedeemButton.href = 'https://www.gog.com/en/redeem';
                    gogRedeemButton.rel = 'noopener noreferrer';
                    gogRedeemButton.className = 'tw-interactive tw-button tw-button--full-width';
                    gogRedeemButton.dataset.aTarget = 'redeem-on-gog';
                    gogRedeemButton.innerHTML = '<span class="tw-button__text" data-a-target="tw-button-text"><div class="tw-inline-flex"><p class="" title="Redeem on GOG">Redeem on GOG</p>&nbsp;&nbsp;<figure aria-label="ExternalLinkWithBox" class="tw-svg"><svg class="tw-svg__asset tw-svg__asset--externallinkwithbox tw-svg__asset--inherit" width="12px" height="12px" version="1.1" viewBox="0 0 11 11" x="0px" y="0px"><path fill-rule="evenodd" clip-rule="evenodd" d="M10.3125 6.875V9.625C10.3125 10.3844 9.69689 11 8.9375 11H1.375C0.615608 11 0 10.3844 0 9.625V2.0625C0 1.30311 0.615608 0.6875 1.375 0.6875H4.125V2.0625H1.375V9.625H8.9375V6.875H10.3125ZM9.62301 2.34727L5.29664 6.67364L4.32437 5.70136L8.65073 1.375H6.18551V0H10.998V4.8125H9.62301V2.34727Z"></path></svg></figure></div></span>';

                    gogRedeemButtonDiv.appendChild(gogRedeemButton);
                    claimCodeWrapper.appendChild(gogRedeemButtonDiv);

                    gogRedeemButton.addEventListener('click', function (e) {
                        e.preventDefault();
                        const codeInput = document.querySelector('input[aria-label]');
                        if (codeInput) {
                            const code = codeInput.value;
                            if (code) {
                                navigator.clipboard.writeText(code).then(function () {
                                    window.location.href = 'https://www.gog.com/en/redeem';
                                });
                            }
                        }
                    });

                    const style = document.createElement('style');
                    style.innerHTML = `
                        .claim-button-wrapper {
                            display: flex;
                            flex-direction: column;
                            margin-top: 15px;
                        }
                        .claim-button,
                        .gog-redeem-button {
                            margin: 5px 0;
                        }
                        .tw-mg-l-1 {
                            margin-top: 10px;
                        }
                        .claimable-item {
                            flex-direction: column !important;
                            gap: 15px;
                        }
                        .tw-flex-grow-1 {
                            width: 100%;
                        }
                    `;
                    document.head.appendChild(style);
                }
            }
        }
    }

    // PrimeRewardManager Class
    class PrimeRewardManager {
        static claimRewards() {
            if (!SettingsManager.CONFIG.enableClaimPrimeRewards) return;

            const maxAttempts = 5;
            let attempts = 0;

            const tryClaim = () => {
                if (attempts >= maxAttempts) {
                    Logger.warning('Max attempts reached for claiming prime reward');
                    return;
                }
                attempts++;

                const element = document.querySelector(PRIME_REWARD_SELECTOR);
                if (element) {
                    const lang = element.getAttribute('title') === 'Obtener juego' ? 'Spanish' : 'English';
                    element.click();
                    Logger.success(`Prime reward claimed (${lang})`);
                } else {
                    Logger.info(`Attempt ${attempts}/${maxAttempts}: Waiting for prime reward button...`);
                    setTimeout(tryClaim, 1000);
                }
            };

            setTimeout(tryClaim, 2000);
        }

        static updatePrimeOfferButtons() {
            const primeOfferHeader = document.getElementById("PrimeOfferPopover-header");
            if (!primeOfferHeader) return;

            let o = new MutationObserver((m) => {
                if (!SettingsManager.CONFIG.enableClaimAllButton && !SettingsManager.CONFIG.enableRemoveAllButton) {
                    // Remove all custom buttons
                    const customButtonsContainer = document.querySelector('#PrimeOfferPopover-header > div');
                    if (customButtonsContainer) {
                        customButtonsContainer.remove();
                    }
                    return;
                }

                // Trigger a refresh of the buttons
                const headerElement = document.getElementById("PrimeOfferPopover-header");
                if (headerElement) {
                    // Force refresh by triggering our main observer
                    const dummyDiv = document.createElement('div');
                    document.body.appendChild(dummyDiv);
                    document.body.removeChild(dummyDiv);
                }
            });

            // Trigger the observer
            o.observe(document.body, { childList: true });
            setTimeout(() => o.disconnect(), 500);
        }
    }

    let claiming = false;

    // Check if MutationObserver is supported
    const MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;



    // Function to show global menu (when setting is turned off)
    function showGlobalMenu() {
        const GLOBAL_MENU_SELECTOR = 'div.ScBalloonWrapper-sc-14jr088-0.eEhNFm';
        const globalMenu = document.querySelector(GLOBAL_MENU_SELECTOR);
        if (globalMenu) {
            globalMenu.style.display = '';
            Logger.info('Global menu restored');
        }
    }

    // Variables to track observers
    let claimPointsObserver = null;
    let claimDropsObserver = null;
    let autoRefreshInterval = null;

    // Function to restart claim points observer
    function restartClaimPointsObserver() {
        if (claimPointsObserver) {
            claimPointsObserver.disconnect();
            claimPointsObserver = null;
            Logger.info('Auto claim points observer disconnected');
        }

        if (CONFIG.enableAutoClaimPoints) {
            setupAutoClaimBonus();
        }
    }

    // Function to restart claim drops observer
    function restartClaimDropsObserver() {
        if (claimDropsObserver) {
            claimDropsObserver.disconnect();
            claimDropsObserver = null;
            Logger.info('Claim drops observer disconnected');
        }

        if (CONFIG.enableClaimDrops) {
            setupClaimDrops();
        }
    }

    // Function to setup auto refresh drops timer
    function setupAutoRefreshDrops() {
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
            autoRefreshInterval = null;
            Logger.info('Auto refresh drops timer cleared');
        }

        if (CONFIG.enableAutoRefreshDrops) {
            autoRefreshInterval = setInterval(function () {
                if (window.location.href.startsWith('https://www.twitch.tv/drops/inventory')) {
                    Logger.info('Auto-refreshing drops inventory page');
                    window.location.reload();
                }
            }, 15 * 60000);
            Logger.info('Auto refresh drops timer started');
        }
    }

    // Function to update redeem buttons
    function updateRedeeemButtons() {
        if (window.location.hostname === 'gaming.amazon.com') {
            if (CONFIG.enableGogRedeemButton) {
                addGogRedeemButton();
            } else {
                // Remove GOG buttons
                const gogButtons = document.querySelectorAll('.gog-redeem-button');
                gogButtons.forEach(button => button.remove());
                Logger.info('GOG redeem buttons removed');
            }

            if (CONFIG.enableLegacyGamesRedeemButton) {
                addLegacyGamesRedeemButton();
            } else {
                // Remove Legacy Games buttons
                const legacyButtons = document.querySelectorAll('.legacy-games-redeem-button');
                legacyButtons.forEach(button => button.remove());
                Logger.info('Legacy Games redeem buttons removed');
            }
        }
    }

    // Function to update the Prime Offer Popover buttons
    function updatePrimeOfferButtons() {
        const primeOfferHeader = document.getElementById("PrimeOfferPopover-header");
        if (!primeOfferHeader) return;

        let o = new MutationObserver((m) => {
            if (!CONFIG.enableClaimAllButton && !CONFIG.enableRemoveAllButton) {
                // Remove all custom buttons
                const customButtonsContainer = document.querySelector('#PrimeOfferPopover-header > div');
                if (customButtonsContainer) {
                    customButtonsContainer.remove();
                }
                return;
            }

            // Trigger a refresh of the buttons
            const headerElement = document.getElementById("PrimeOfferPopover-header");
            if (headerElement) {
                // Force refresh by triggering our main observer
                const dummyDiv = document.createElement('div');
                document.body.appendChild(dummyDiv);
                document.body.removeChild(dummyDiv);
            }
        });

        // Trigger the observer
        o.observe(document.body, { childList: true });
        setTimeout(() => o.disconnect(), 500); // Disconnect after a short time
    }

    // Function to setup auto claim bonus
    function setupAutoClaimBonus() {
        if (!CONFIG.enableAutoClaimPoints || !MutationObserver) return;

        Logger.info('Auto claimer is enabled.');

        claimPointsObserver = new MutationObserver(mutationsList => {
            for (let mutation of mutationsList) {
                if (mutation.type === 'childList' && CONFIG.enableAutoClaimPoints) {
                    let bonus = document.querySelector(CLAIMABLE_BONUS_SELECTOR);
                    if (bonus && !claiming) {
                        bonus.click();
                        let date = new Date();
                        claiming = true;
                        setTimeout(() => {
                            Logger.success('Claimed at ' + date.toLocaleString());
                            claiming = false;
                        }, Math.random() * 1000 + 2000);
                    }
                }
            }
        });

        claimPointsObserver.observe(document.body, { childList: true, subtree: true });
    }

    // Function to setup claim drops
    function setupClaimDrops() {
        if (!CONFIG.enableClaimDrops || !MutationObserver) return;

        var onMutate = function (mutationsList) {
            mutationsList.forEach(mutation => {
                if (CONFIG.enableClaimDrops && document.querySelector(CLAIM_DROPS_SELECTOR)) {
                    document.querySelector(CLAIM_DROPS_SELECTOR).click();
                }
            });
        };

        claimDropsObserver = new MutationObserver(onMutate);
        claimDropsObserver.observe(document.body, { childList: true, subtree: true });
        Logger.info('Claim drops observer started');
    }

    function closeDialog() {
        const dialog = document.getElementById('twitchEnhancementsDialog');
        if (dialog) {
            dialog.remove();
        }
    }

    function toggleSettingsDialog() {
        const dialog = document.getElementById('twitchEnhancementsDialog');
        if (dialog) {
            dialog.remove();
        } else {
            createSettingsDialog();
        }
    }

    // Register menu command
    GM_registerMenuCommand('Twitch Enhancements Settings', toggleSettingsDialog);

    // Function to click a button
    function clickButton(buttonSelector) {
        if (!MutationObserver) return;

        const observer = new MutationObserver((mutationsList, observer) => {
            for (let mutation of mutationsList) {
                if (mutation.addedNodes.length) {
                    const button = document.querySelector(buttonSelector);
                    if (button) {
                        button.click();
                        observer.disconnect();
                        return;
                    }
                }
            }
        });

        observer.observe(document, { childList: true, subtree: true });
    }

    // Function to enable theater mode
    function enableTheaterMode() {
        if (!CONFIG.enableTheaterMode) return;

        const player = document.querySelector(PLAYER_SELECTOR);
        if (player) {
            if (!player.classList.contains(THEATER_MODE_CLASS)) {
                clickButton(THEATER_MODE_BUTTON_SELECTOR);
            }
        } else {
            Logger.error('Player not found');
        }
    }

    // Function to hide the global menu
    function hideGlobalMenu() {
        if (!CONFIG.enableHideGlobalMenu) return;

        const GLOBAL_MENU_SELECTOR = 'div.ScBalloonWrapper-sc-14jr088-0.eEhNFm';
        const globalMenu = document.querySelector(GLOBAL_MENU_SELECTOR);
        if (globalMenu) {
            globalMenu.style.display = 'none';
        } else {
            Logger.error('Global menu not found');
        }
    }

    // Function to automatically claim channel points
    function autoClaimBonus() {
        if (!CONFIG.enableAutoClaimPoints || !MutationObserver) return;

        Logger.info('Auto claimer is enabled.');

        let observer = new MutationObserver(mutationsList => {
            for (let mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    let bonus = document.querySelector(CLAIMABLE_BONUS_SELECTOR);
                    if (bonus && !claiming) {
                        bonus.click();
                        let date = new Date();
                        claiming = true;
                        setTimeout(() => {
                            Logger.success('Claimed at ' + date.toLocaleString());
                            claiming = false;
                        }, Math.random() * 1000 + 2000);
                    }
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    // Function to claim prime rewards with retry
    function claimPrimeReward() {
        if (!CONFIG.enableClaimPrimeRewards) return;

        const maxAttempts = 5;
        let attempts = 0;

        const tryClaim = () => {
            if (attempts >= maxAttempts) {
                Logger.warning('Max attempts reached for claiming prime reward');
                return;
            }
            attempts++;

            const element = document.querySelector(PRIME_REWARD_SELECTOR) || document.querySelector(PRIME_REWARD_SELECTOR_2);
            if (element) {
                const lang = element.getAttribute('title') === 'Obtener juego' ? 'Spanish' : 'English';
                element.click();
                Logger.success(`Prime reward claimed (${lang})`);
            } else {
                Logger.info(`Attempt ${attempts}/${maxAttempts}: Waiting for prime reward button...`);
                setTimeout(tryClaim, 1000);
            }
        };

        setTimeout(tryClaim, 2000);
    }

    // Function to claim drops
    function claimDrops() {
        if (!CONFIG.enableClaimDrops || !MutationObserver) return;

        var onMutate = function (mutationsList) {
            mutationsList.forEach(mutation => {
                if (document.querySelector(CLAIM_DROPS_SELECTOR)) document.querySelector(CLAIM_DROPS_SELECTOR).click();
            })
        }
        var observer = new MutationObserver(onMutate);
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // Function to add the "Redeem on GOG" button
    function addGogRedeemButton() {
        if (!CONFIG.enableGogRedeemButton) return;

        const claimCodeButton = document.querySelector('p[title="Claim Code"]');
        if (claimCodeButton && !document.querySelector('.gog-redeem-button')) {
            const claimCodeWrapper = claimCodeButton.closest('.claim-button-wrapper');
            if (claimCodeWrapper) {
                const gogRedeemButtonDiv = document.createElement('div');
                gogRedeemButtonDiv.className = 'claim-button tw-align-self-center gog-redeem-button';

                const gogRedeemButton = document.createElement('a');
                gogRedeemButton.href = 'https://www.gog.com/en/redeem';
                gogRedeemButton.rel = 'noopener noreferrer';
                gogRedeemButton.className = 'tw-interactive tw-button tw-button--full-width';
                gogRedeemButton.dataset.aTarget = 'redeem-on-gog';
                gogRedeemButton.innerHTML = '<span class="tw-button__text" data-a-target="tw-button-text"><div class="tw-inline-flex"><p class="" title="Redeem on GOG">Redeem on GOG</p>&nbsp;&nbsp;<figure aria-label="ExternalLinkWithBox" class="tw-svg"><svg class="tw-svg__asset tw-svg__asset--externallinkwithbox tw-svg__asset--inherit" width="12px" height="12px" version="1.1" viewBox="0 0 11 11" x="0px" y="0px"><path fill-rule="evenodd" clip-rule="evenodd" d="M10.3125 6.875V9.625C10.3125 10.3844 9.69689 11 8.9375 11H1.375C0.615608 11 0 10.3844 0 9.625V2.0625C0 1.30311 0.615608 0.6875 1.375 0.6875H4.125V2.0625H1.375V9.625H8.9375V6.875H10.3125ZM9.62301 2.34727L5.29664 6.67364L4.32437 5.70136L8.65073 1.375H6.18551V0H10.998V4.8125H9.62301V2.34727Z"></path></svg></figure></div></span>';

                gogRedeemButtonDiv.appendChild(gogRedeemButton);
                claimCodeWrapper.appendChild(gogRedeemButtonDiv);

                gogRedeemButton.addEventListener('click', function (e) {
                    e.preventDefault();
                    const codeInput = document.querySelector('input[aria-label]');
                    if (codeInput) {
                        const code = codeInput.value;
                        if (code) {
                            GM_setValue('gogRedeemCode', code);
                            navigator.clipboard.writeText(code).then(function () {
                                window.location.href = 'https://www.gog.com/en/redeem';
                            });
                        }
                    }
                });

                const style = document.createElement('style');
                style.innerHTML = `
                    .claim-button-wrapper {
                        display: flex;
                        flex-direction: column;
                        margin-top: 15px;
                    }
                    .claim-button,
                    .gog-redeem-button {
                        margin: 5px 0;
                    }
                    .tw-mg-l-1 {
                        margin-top: 10px;
                    }
                    .claimable-item {
                        flex-direction: column !important;
                        gap: 15px;
                    }
                    .tw-flex-grow-1 {
                        width: 100%;
                    }
                `;
                document.head.appendChild(style);
            }
        }
    }

    // Function to redeem code on GOG
    function redeemCodeOnGOG() {
        const findGogContinueButton = () => {
            const bySelector = document.querySelector(GOG_CONTINUE_BUTTON_SELECTOR);
            if (bySelector) return bySelector;

            const candidates = Array.from(document.querySelectorAll('button[type="submit"], button.button.primary'));
            return candidates.find(button => {
                const label = (button.getAttribute('aria-label') || '').toLowerCase();
                const text = (button.textContent || '').trim().toLowerCase();
                return label.includes('proceed to the next step') || text === 'continue' || text === 'continuar';
            }) || null;
        };

        const findGogRedeemButton = () => {
            const bySelector = document.querySelector(GOG_FINAL_REDEEM_BUTTON_SELECTOR);
            if (bySelector) return bySelector;

            const candidates = Array.from(document.querySelectorAll('button[type="submit"], button.button.primary'));
            return candidates.find(button => {
                const label = (button.getAttribute('aria-label') || '').toLowerCase();
                const text = (button.textContent || '').trim().toLowerCase();
                return label.includes('redeem') || text === 'redeem' || text === 'canjear';
            }) || null;
        };

        const clickButtonSafely = (button) => {
            if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true') {
                return false;
            }

            button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            button.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            button.click();

            const form = button.closest('form');
            if (form) {
                if (typeof form.requestSubmit === 'function') {
                    form.requestSubmit(button);
                } else {
                    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                }
            }

            return true;
        };

        const trySubmitRedeemForm = () => {
            const form = document.querySelector('form');
            if (!form) return false;

            if (typeof form.requestSubmit === 'function') {
                form.requestSubmit();
            } else {
                form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            }

            return true;
        };

        const startRedeemFlow = (code) => {

            let attempts = 0;
            const maxAttempts = 50;
            let continueClicked = false;

            const interval = setInterval(() => {
                attempts++;

                const codeInput = document.querySelector(GOG_REDEEM_CODE_INPUT_SELECTOR);
                const hasExistingCode = !!(codeInput && codeInput.value && codeInput.value.trim());
                if (codeInput && !hasExistingCode && code) {
                    const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
                    if (valueSetter) {
                        valueSetter.call(codeInput, code);
                    } else {
                        codeInput.value = code;
                    }

                    ['input', 'change', 'keyup', 'blur'].forEach(eventName => {
                        codeInput.dispatchEvent(new Event(eventName, { bubbles: true }));
                    });
                }

                if (!continueClicked) {
                    const continueButton = findGogContinueButton();
                    if (clickButtonSafely(continueButton)) {
                        continueClicked = true;
                        Logger.success('GOG Continue button clicked');
                    } else {
                        const codeInput = document.querySelector(GOG_REDEEM_CODE_INPUT_SELECTOR);
                        if (codeInput) {
                            codeInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
                            codeInput.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
                        }

                        if (trySubmitRedeemForm()) {
                            continueClicked = true;
                            Logger.success('GOG Continue submitted via form fallback');
                        }
                    }
                }

                if (continueClicked) {
                    const redeemButton = findGogRedeemButton();
                    if (clickButtonSafely(redeemButton)) {
                        clearInterval(interval);
                        Logger.success('GOG Redeem button clicked');
                        GM_deleteValue('gogRedeemCode');
                        return;
                    }
                }

                if (attempts >= maxAttempts) {
                    clearInterval(interval);
                    Logger.warning('GOG auto-redeem timed out waiting for enabled Continue/Redeem button');
                }
            }, 300);
        };

        const storedCode = (GM_getValue('gogRedeemCode', '') || '').trim();
        if (storedCode) {
            startRedeemFlow(storedCode);
            return;
        }

        navigator.clipboard.readText().then(function (code) {
            startRedeemFlow((code || '').trim());
        }).catch(function (err) {
            Logger.error('Failed to read clipboard contents: ' + err);
            // Continue flow even if clipboard is blocked, using any code already present in the input.
            startRedeemFlow('');
        });
    }

    // Function to add the "Redeem on Legacy Games" button
    function addLegacyGamesRedeemButton() {
        if (!CONFIG.enableLegacyGamesRedeemButton) return;

        const copyCodeButton = document.querySelector('button[aria-label="Copy code to your clipboard"]');
        if (copyCodeButton && !document.querySelector('.legacy-games-redeem-button')) {
            const copyCodeWrapper = copyCodeButton.closest('.copy-button-wrapper');
            if (copyCodeWrapper) {
                const legacyGamesRedeemButtonDiv = document.createElement('div');
                legacyGamesRedeemButtonDiv.className = 'copy-button tw-align-self-center legacy-games-redeem-button';

                const legacyGamesRedeemButton = document.createElement('button');
                legacyGamesRedeemButton.ariaLabel = 'Redeem on Legacy Games';
                legacyGamesRedeemButton.className = 'tw-interactive tw-button tw-button--full-width';
                legacyGamesRedeemButton.dataset.aTarget = 'redeem-on-legacy-games';
                legacyGamesRedeemButton.innerHTML = '<span class="tw-button__text" data-a-target="tw-button-text">Redeem on Legacy Games</span>';

                legacyGamesRedeemButtonDiv.appendChild(legacyGamesRedeemButton);
                copyCodeWrapper.appendChild(legacyGamesRedeemButtonDiv);

                legacyGamesRedeemButton.addEventListener('click', function (e) {
                    e.preventDefault();
                    const codeInput = document.querySelector('input[aria-label]');
                    if (codeInput) {
                        const code = codeInput.value;
                        if (code) {
                            navigator.clipboard.writeText(code).then(function () {
                                const email = GM_getValue('legacyGamesEmail', null);

                                // Try to find a dynamic "here" link or any legacygames link on the page
                                const findLegacyUrl = () => {
                                    try {
                                        // 1) Prefer anchors with visible text 'here' or 'click here' (most specific)
                                        const hereAnchors = Array.from(document.querySelectorAll('a[href]')).filter(a => {
                                            const text = (a.textContent || '').trim().toLowerCase();
                                            return text === 'here' || text === 'click here' || text === 'here ›' || text === 'here »' || /\bhere\b/.test(text);
                                        });
                                        for (let a of hereAnchors) {
                                            const href = a.getAttribute('href');
                                            if (!href) continue;
                                            if (href.indexOf('javascript:') === 0) continue;
                                            // Normalize relative URLs
                                            if (href.startsWith('/')) return window.location.origin + href;
                                            if (href.startsWith('http')) return href;
                                        }

                                        // 2) Search inside claim instructions block if present (more likely to contain the per-game promo link)
                                        const claimContainers = document.querySelectorAll('[data-a-target="claim-instructions"], .claim-instructions, [data-a-target="claim-instructions_text"]');
                                        for (let c of claimContainers) {
                                            const anchors = c.querySelectorAll('a[href]');
                                            for (let a of anchors) {
                                                const href = a.getAttribute('href');
                                                if (!href) continue;
                                                if (href.indexOf('javascript:') === 0) continue;
                                                if (href.startsWith('/')) return window.location.origin + href;
                                                if (href.startsWith('http')) return href;
                                            }
                                        }

                                        // 3) Prefer explicit promo subdomain links
                                        const promo = Array.from(document.querySelectorAll('a[href]')).map(a => a.href).find(h => h.includes('promo.legacygames.com'));
                                        if (promo) return promo;

                                        // 4) Then any legacygames.com link that isn't just the root domain
                                        const lg = Array.from(document.querySelectorAll('a[href]')).map(a => a.href).find(h => h.includes('legacygames.com') && !/^https?:\/\/(?:www\.)?legacygames\.com\/?$/.test(h));
                                        if (lg) return lg;

                                    } catch (e) {
                                        // ignore and fallback
                                    }
                                    return null;
                                };

                                const targetUrl = findLegacyUrl() || LEGACY_GAMES_REDEEM_URL;
                                Logger.info('Legacy Games target URL selected: ' + targetUrl);

                                if (!email) {
                                    const userEmail = prompt('Please enter your email address:');
                                    if (userEmail) {
                                        GM_setValue('legacyGamesEmail', userEmail);
                                        window.location.href = targetUrl;
                                    }
                                } else {
                                    window.location.href = targetUrl;
                                }
                            });
                        }
                    }
                });

                const style = document.createElement('style');
                style.innerHTML = `
                    .copy-button-wrapper {
                        display: flex;
                        flex-direction: column;
                        margin-top: 15px;
                    }
                    .copy-button,
                    .legacy-games-redeem-button {
                        margin: 5px 0;
                    }
                    .tw-mg-l-1 {
                        margin-top: 10px;
                    }
                    .claimable-item {
                        flex-direction: column !important;
                        gap: 15px;
                    }
                    .tw-flex-grow-1 {
                        width: 100%;
                    }
                `;
                document.head.appendChild(style);
            }
        }
    }

    // Function to redeem code on Legacy Games
    function redeemCodeOnLegacyGames() {
        const maxAttempts = 5;
        let attempts = 0;

        const tryRedeem = () => {
            if (attempts >= maxAttempts) return;
            attempts++;

            navigator.clipboard.readText().then(function (code) {
                const codeInput = document.querySelector(LEGACY_GAMES_CODE_INPUT_SELECTOR);
                const emailInput = document.querySelector(LEGACY_GAMES_EMAIL_INPUT_SELECTOR);
                const emailValidateInput = document.querySelector(LEGACY_GAMES_EMAIL_VALIDATE_INPUT_SELECTOR);
                const submitButton = document.querySelector(LEGACY_GAMES_SUBMIT_BUTTON_SELECTOR);
                const newsletterCheckbox = document.querySelector(LEGACY_GAMES_NEWSLETTER_CHECKBOX_SELECTOR);
                const email = GM_getValue('legacyGamesEmail', null);

                if (!codeInput || !emailInput || !emailValidateInput || !submitButton) {
                    Logger.info('Waiting for elements to load...');
                    setTimeout(tryRedeem, 1000);
                    return;
                }

                if (email && code) {
                    // Fill in the form
                    codeInput.value = code;
                    emailInput.value = email;
                    emailValidateInput.value = email;

                    // Ensure newsletter checkbox is unchecked
                    if (newsletterCheckbox) {
                        newsletterCheckbox.checked = false;
                    }

                    // Trigger input events
                    [codeInput, emailInput, emailValidateInput].forEach(input => {
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                    });

                    // Submit the form
                    setTimeout(() => {
                        submitButton.click();
                        Logger.success('Form submitted with code: ' + code + ' and email: ' + email);
                    }, 500);
                }
            }).catch(function (err) {
                Logger.error('Failed to read clipboard contents: ' + err);
            });
        };

        // Start the redemption process
        setTimeout(tryRedeem, 2000);
    }

    // Function to open all "Claim Game" buttons in new tabs
    function openClaimGameTabs() {
        const claimGameButtons = document.querySelectorAll('div[data-a-target="tw-core-button-label-text"].Layout-sc-1xcs6mc-0.bFxzAY');
        claimGameButtons.forEach(button => {
            const buttonText = button.textContent.trim().toLowerCase();
            // Check for both English and Spanish variations
            if (buttonText === 'claim game' || buttonText === 'claim' ||
                buttonText === 'obtener juego' || buttonText === 'obtener') {
                const parentButton = button.closest('a');
                if (parentButton) {
                    window.open(parentButton.href, '_blank');
                }
            }
        });
    }

    function removeClaimedItems() {
        const allItems = document.querySelectorAll('.prime-offer');
        let dismissedCount = 0;
        let dismissButtons = [];

        Logger.info(`Found ${allItems.length} total items to dismiss`);

        document.querySelectorAll('button[aria-label="Dismiss"][data-a-target="prime-offer-dismiss-button"]').forEach(btn => {
            dismissButtons.push(btn);
        });

        document.querySelectorAll('button[data-test-selector="prime-offer-dismiss-button"]').forEach(btn => {
            if (!dismissButtons.includes(btn)) {
                dismissButtons.push(btn);
            }
        });

        document.querySelectorAll('.prime-offer__dismiss button').forEach(btn => {
            if (!dismissButtons.includes(btn)) {
                dismissButtons.push(btn);
            }
        });

        dismissButtons = [...new Set(dismissButtons)];
        Logger.info(`Found ${dismissButtons.length} dismiss buttons to click`);

        if (dismissButtons.length > 0) {
            const clickNextButton = (index) => {
                if (index < dismissButtons.length) {
                    try {
                        dismissButtons[index].click();
                        dismissedCount++;

                        if (dismissedCount % 5 === 0 || dismissedCount === dismissButtons.length) {
                            Logger.info(`Dismissed ${dismissedCount} of ${dismissButtons.length} items...`);
                        }
                    } catch (e) {
                        Logger.error(`Error clicking button ${index}: ` + e);
                    }

                    setTimeout(() => clickNextButton(index + 1), 75);
                } else {
                    Logger.success(`Completed! Dismissed ${dismissedCount} items total.`);

                    const remainingButtons = document.querySelectorAll('button[aria-label="Dismiss"]');
                    if (remainingButtons.length > 0) {
                        Logger.warning(`Found ${remainingButtons.length} additional buttons to try`);
                        remainingButtons.forEach(btn => {
                            try {
                                btn.click();
                                dismissedCount++;
                            } catch (e) {
                                // ignore individual failures
                            }
                        });

                        Logger.success(`Final dismissal count: ${dismissedCount}`);
                    }
                }
            };

            clickNextButton(0);
        } else {
            Logger.warning('No dismiss buttons found to click');

            const fallbackButtons = document.querySelectorAll('button[aria-label="Dismiss"]');
            if (fallbackButtons.length > 0) {
                Logger.warning(`Fallback: Found ${fallbackButtons.length} buttons with aria-label="Dismiss"`);
                fallbackButtons.forEach(btn => {
                    try {
                        btn.click();
                        dismissedCount++;
                    } catch (e) {
                        // ignore individual failures
                    }
                });

                Logger.success(`Fallback dismissal completed: ${dismissedCount} items dismissed`);
            }
        }
    }

    // Function to switch Prime Offers popover to the Claim Games tab
    function switchToClaimGamesTab() {
        const normalize = (value) => (value || '').trim().toLowerCase();
        const dispatchTabClickSequence = (element) => {
            if (!element) return;

            const rect = element.getBoundingClientRect();
            const clientX = rect.left + (rect.width / 2);
            const clientY = rect.top + (rect.height / 2);
            const mouseEventOptions = {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX,
                clientY,
                button: 0,
                buttons: 1
            };

            if (typeof PointerEvent !== 'undefined') {
                element.dispatchEvent(new PointerEvent('pointerdown', mouseEventOptions));
            }
            element.dispatchEvent(new MouseEvent('mousedown', mouseEventOptions));
            if (typeof PointerEvent !== 'undefined') {
                element.dispatchEvent(new PointerEvent('pointerup', { ...mouseEventOptions, buttons: 0 }));
            }
            element.dispatchEvent(new MouseEvent('mouseup', { ...mouseEventOptions, buttons: 0 }));
            element.dispatchEvent(new MouseEvent('click', { ...mouseEventOptions, buttons: 0 }));
        };

        const tabLists = Array.from(document.querySelectorAll('ul[role="tablist"], div[role="tablist"]'));
        let primeOffersTabList = null;

        for (const tabList of tabLists) {
            const tabs = Array.from(tabList.querySelectorAll('button[role="tab"], [role="tab"]'));
            if (!tabs.length) continue;

            const tabTexts = tabs.map(tab => normalize(tab.textContent));
            const hasClaimGames = tabTexts.some(text => text.includes('claim games') || text.includes('obtener juegos') || text.includes('reclamar juegos'));
            const hasPlayNow = tabTexts.some(text => text.includes('play now') || text.includes('jugar ahora'));

            if (hasClaimGames && hasPlayNow) {
                primeOffersTabList = tabList;
                break;
            }
        }

        if (!primeOffersTabList) {
            return false;
        }

        const tabCandidates = Array.from(primeOffersTabList.querySelectorAll('button[role="tab"], [role="tab"]'));
        let claimGamesTab = tabCandidates.find(tab => {
            const text = normalize(tab.textContent);
            return text.includes('claim games') || text.includes('obtener juegos') || text.includes('reclamar juegos');
        });
        let playNowTab = tabCandidates.find(tab => {
            const text = normalize(tab.textContent);
            return text.includes('play now') || text.includes('jugar ahora');
        });

        if (!claimGamesTab) {
            claimGamesTab = primeOffersTabList.querySelector('button[role="tab"][data-index="0"], [role="tab"][data-index="0"]');
        }
        if (!playNowTab) {
            playNowTab = primeOffersTabList.querySelector('button[role="tab"][data-index="1"], [role="tab"][data-index="1"]');
        }

        if (!claimGamesTab) {
            return false;
        }

        if (claimGamesTab.getAttribute('aria-selected') === 'true') {
            return true;
        }

        // Hard fallback path: when Play Now is currently active, navigate to previous tab then confirm.
        if (playNowTab && playNowTab.getAttribute('aria-selected') === 'true') {
            try {
                playNowTab.focus();
                playNowTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
                playNowTab.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowLeft', bubbles: true }));
                playNowTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
                playNowTab.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
            } catch (e) {
                // Continue with pointer/mouse fallback below.
            }
        }

        // Some Twitch/Amazon UI nodes only react reliably to a full pointer/mouse sequence.
        dispatchTabClickSequence(claimGamesTab);
        claimGamesTab.click();

        // If still on Play Now, repeat the hard fallback once more immediately.
        if (claimGamesTab.getAttribute('aria-selected') !== 'true' &&
            playNowTab && playNowTab.getAttribute('aria-selected') === 'true') {
            dispatchTabClickSequence(claimGamesTab);
            claimGamesTab.focus();
            claimGamesTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
            claimGamesTab.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
            claimGamesTab.click();
        }

        const switched = claimGamesTab.getAttribute('aria-selected') === 'true';
        if (switched) {
            Logger.success('Prime Offers tab switched to Claim Games');
        }
        return switched;
    }

    function setupPrimeOffersTabAutoSwitch() {
        if (window.location.hostname !== 'gaming.amazon.com') return;

        let activeForceInterval = null;
        let activeForceObserver = null;

        const forceSwitchClaimGames = (durationMs = 5000) => {
            if (activeForceInterval) {
                clearInterval(activeForceInterval);
                activeForceInterval = null;
            }

            if (activeForceObserver) {
                activeForceObserver.disconnect();
                activeForceObserver = null;
            }

            const startedAt = Date.now();

            const tick = () => {
                switchToClaimGamesTab();

                if (Date.now() - startedAt >= durationMs) {
                    if (activeForceInterval) {
                        clearInterval(activeForceInterval);
                        activeForceInterval = null;
                    }
                    if (activeForceObserver) {
                        activeForceObserver.disconnect();
                        activeForceObserver = null;
                    }
                }
            };

            activeForceInterval = setInterval(tick, 80);
            tick();

            activeForceObserver = new MutationObserver(() => {
                tick();
            });

            activeForceObserver.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['aria-selected', 'class']
            });
        };

        const isPrimeOffersTrigger = (target) => {
            if (!target || !target.closest) return false;
            return !!target.closest('[data-a-target="prime-offers-icon"], [data-target="prime-offers-icon"], [aria-label="Prime offers"], [data-test-selector="toggle-balloon-wrapper__mouse-enter-detector"]');
        };

        const handlePrimeOffersInteraction = (event) => {
            if (!isPrimeOffersTrigger(event.target)) return;
            setTimeout(() => {
                forceSwitchClaimGames(20000);
            }, 30);
        };

        document.addEventListener('pointerdown', handlePrimeOffersInteraction, true);
        document.addEventListener('mousedown', handlePrimeOffersInteraction, true);
        document.addEventListener('click', handlePrimeOffersInteraction, true);
        document.addEventListener('mouseenter', handlePrimeOffersInteraction, true);

        const popoverObserver = new MutationObserver(() => {
            const hasPrimeTabs = !!document.querySelector('ul[role="tablist"] [role="tab"][data-index="0"]') &&
                !!document.querySelector('ul[role="tablist"] [role="tab"][data-index="1"]');
            if (hasPrimeTabs) {
                forceSwitchClaimGames(3500);
            }
        });

        popoverObserver.observe(document.body, { childList: true, subtree: true });

        // Proactive attempt in case the popover is already open on initial load.
        setTimeout(() => {
            forceSwitchClaimGames(2000);
        }, 250);

        // Retry when the tab gains focus again.
        window.addEventListener('focus', () => {
            forceSwitchClaimGames(2000);
        });
    }

    function renderPrimePopoverActions() {
        const primeOfferHeader = document.getElementById('PrimeOfferPopover-header');
        if (!primeOfferHeader) {
            return;
        }

        let actionsContainer = primeOfferHeader.querySelector('#te-prime-actions');
        const shouldShowButtons = SettingsManager.CONFIG.enableClaimAllButton || SettingsManager.CONFIG.enableRemoveAllButton;

        if (!shouldShowButtons) {
            if (actionsContainer) {
                actionsContainer.remove();
            }
            return;
        }

        if (!actionsContainer) {
            actionsContainer = document.createElement('div');
            actionsContainer.id = 'te-prime-actions';
            actionsContainer.style.display = 'flex';
            actionsContainer.style.gap = '10px';
            actionsContainer.style.marginBottom = '10px';
            primeOfferHeader.prepend(actionsContainer);
        }

        actionsContainer.innerHTML = '';

        if (SettingsManager.CONFIG.enableClaimAllButton) {
            const claimAllButton = document.createElement('input');
            claimAllButton.type = 'button';
            claimAllButton.value = 'Claim All';
            claimAllButton.className = 'tw-align-items-center tw-align-middle tw-border-bottom-left-radius-medium tw-border-bottom-right-radius-medium tw-border-top-left-radius-medium tw-border-top-right-radius-medium tw-core-button tw-core-button--primary tw-inline-flex tw-interactive tw-justify-content-center tw-overflow-hidden tw-relative';
            claimAllButton.style.border = 'none';
            claimAllButton.style.backgroundColor = '#9147ff';
            claimAllButton.style.color = 'white';
            claimAllButton.style.padding = '10px 20px';
            claimAllButton.style.fontSize = '14px';
            claimAllButton.style.borderRadius = '4px';
            claimAllButton.style.cursor = 'pointer';
            claimAllButton.style.flex = '1';
            claimAllButton.addEventListener('click', openClaimGameTabs);
            actionsContainer.appendChild(claimAllButton);
        }

        if (SettingsManager.CONFIG.enableRemoveAllButton) {
            const removeAllButton = document.createElement('input');
            removeAllButton.type = 'button';
            removeAllButton.value = 'Remove All';
            removeAllButton.className = 'tw-align-items-center tw-align-middle tw-border-bottom-left-radius-medium tw-border-bottom-right-radius-medium tw-border-top-left-radius-medium tw-border-top-right-radius-medium tw-core-button tw-core-button--primary tw-inline-flex tw-interactive tw-justify-content-center tw-overflow-hidden tw-relative';
            removeAllButton.style.border = 'none';
            removeAllButton.style.backgroundColor = '#772ce8';
            removeAllButton.style.color = 'white';
            removeAllButton.style.padding = '10px 20px';
            removeAllButton.style.fontSize = '14px';
            removeAllButton.style.borderRadius = '4px';
            removeAllButton.style.cursor = 'pointer';
            removeAllButton.style.flex = '1';
            removeAllButton.addEventListener('click', removeClaimedItems);
            actionsContainer.appendChild(removeAllButton);
        }
    }

    if (window.location.hostname === 'gaming.amazon.com') {
        const observer = new MutationObserver((mutations, obs) => {
            const claimCodeButton = document.querySelector('p[title="Claim Code"]');
            if (claimCodeButton && CONFIG.enableGogRedeemButton) {
                addGogRedeemButton();
            }
            const copyCodeButton = document.querySelector('button[aria-label="Copy code to your clipboard"]');
            if (copyCodeButton && CONFIG.enableLegacyGamesRedeemButton) {
                addLegacyGamesRedeemButton();
            }
        });

        observer.observe(document, {
            childList: true,
            subtree: true
        });

        if (CONFIG.enableGogRedeemButton) addGogRedeemButton();
        if (CONFIG.enableLegacyGamesRedeemButton) addLegacyGamesRedeemButton();
    }

    if (window.location.hostname === 'www.gog.com' && window.location.pathname.includes('/redeem')) {
        window.addEventListener('load', redeemCodeOnGOG);
    }

    if (window.location.hostname === 'promo.legacygames.com') {
        window.addEventListener('load', redeemCodeOnLegacyGames);
    }

    setupPrimeOffersTabAutoSwitch();

    setTimeout(() => UIEnhancer.enableTheaterMode(), 1000);
    setTimeout(AutoClaimer.startClaimingPoints, 1000);
    setTimeout(PrimeRewardManager.claimRewards, 1000);
    setTimeout(() => UIEnhancer.clickButton(CLOSE_MENU_BUTTON_SELECTOR), 1000);
    setTimeout(() => UIEnhancer.clickButton(CLOSE_MODAL_BUTTON_SELECTOR), 1000);
    setTimeout(UIEnhancer.hideGlobalMenu, 1000);
    setTimeout(AutoClaimer.startClaimingDrops, 1000);

    // Auto refresh drops inventory page
    if (SettingsManager.CONFIG.enableAutoRefreshDrops) {
        setInterval(function () {
            if (window.location.href.startsWith('https://www.twitch.tv/drops/inventory')) {
                window.location.reload();
            }
        }, 15 * 60000);
    }

    // Add keyboard shortcut to toggle settings - now using the configured key
    document.addEventListener('keyup', (event) => {
        // Parse the configured key combination
        const parts = SettingsManager.CONFIG.settingsKey.split('+');
        const requiredModifiers = {
            Ctrl: parts.includes('Ctrl'),
            Alt: parts.includes('Alt'),
            Shift: parts.includes('Shift'),
            Meta: parts.includes('Meta')
        };

        // The main key is the last part if it's not a modifier
        const mainKey = parts.filter(part => !['Ctrl', 'Alt', 'Shift', 'Meta'].includes(part)).pop();

        // Check if the event matches our configured combination
        const matchesModifiers =
            (!requiredModifiers.Ctrl || event.ctrlKey) &&
            (!requiredModifiers.Alt || event.altKey) &&
            (!requiredModifiers.Shift || event.shiftKey) &&
            (!requiredModifiers.Meta || event.metaKey);

        const matchesMainKey = mainKey ? event.key === mainKey : true;

        if (matchesModifiers && matchesMainKey) {
            // Only trigger on the exact key combination
            if (
                // If Ctrl is in the combination, ensure it's pressed
                (!parts.includes('Ctrl') || event.ctrlKey) &&
                // If Alt is in the combination, ensure it's pressed
                (!parts.includes('Alt') || event.altKey) &&
                // If Shift is in the combination, ensure it's pressed
                (!parts.includes('Shift') || event.shiftKey) &&
                // If Meta is in the combination, ensure it's pressed
                (!parts.includes('Meta') || event.metaKey) &&
                // If a main key is specified, ensure it matches
                (mainKey ? event.key === mainKey : true)
            ) {
                // Prevent default behavior
                event.preventDefault();
                SettingsManager.toggleSettingsDialog();

                // Log for debugging
                Logger.info(`${SettingsManager.CONFIG.settingsKey} key combination pressed - toggling settings dialog`);
            }
        }
    });

    // Make sure event is captured at the document level with capture phase
    document.addEventListener('keydown', (event) => {
        // Parse the configured key combination
        const parts = SettingsManager.CONFIG.settingsKey.split('+');
        const requiredModifiers = {
            Ctrl: parts.includes('Ctrl'),
            Alt: parts.includes('Alt'),
            Shift: parts.includes('Shift'),
            Meta: parts.includes('Meta')
        };

        // The main key is the last part if it's not a modifier
        const mainKey = parts.filter(part => !['Ctrl', 'Alt', 'Shift', 'Meta'].includes(part)).pop();

        // Check if the event matches our configured combination
        const matchesModifiers =
            (!requiredModifiers.Ctrl || event.ctrlKey) &&
            (!requiredModifiers.Alt || event.altKey) &&
            (!requiredModifiers.Shift || event.shiftKey) &&
            (!requiredModifiers.Meta || event.metaKey);

        const matchesMainKey = mainKey ? event.key === mainKey : true;

        if (matchesModifiers && matchesMainKey) {
            // Prevent default behavior for our combination
            event.preventDefault();
        }
    }, true);

    let o = new MutationObserver(() => {
        renderPrimePopoverActions();
    });

    o.observe(document.body, { childList: true });
})();