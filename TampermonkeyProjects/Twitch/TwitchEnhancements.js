// ==UserScript==
// @name         Twitch Enhancements
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Automatically claim channel points, enable theater mode, claim prime rewards, and redeem codes on GOG from Amazon Gaming pages.
// @author       JJJ
// @match        https://www.twitch.tv/*
// @match        https://gaming.amazon.com/*
// @match        https://www.twitch.tv/drops/inventory*
// @match        https://www.gog.com/en/redeem
// @icon         https://th.bing.com/th/id/R.d71be224f193da01e7e499165a8981c5?rik=uBYlAxJ4XyXmJg&riu=http%3a%2f%2fpngimg.com%2fuploads%2ftwitch%2ftwitch_PNG28.png&ehk=PMc5m5Fil%2bhyq1zilk3F3cuzxSluXFBE80XgxVIG0rM%3d&risl=&pid=ImgRaw&r=0
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';
    // Twitch Constants
    const PLAYER_SELECTOR = '.video-player';
    const THEATER_MODE_BUTTON_SELECTOR = 'button[aria-label="Modo cine (alt+t)"], button[aria-label="Theatre Mode (alt+t)"]';
    const CLOSE_MENU_BUTTON_SELECTOR = 'button[aria-label="Close Menu"]';
    const CLOSE_MODAL_BUTTON_SELECTOR = 'button[aria-label="Close modal"]';
    const THEATER_MODE_CLASS = 'theatre-mode';
    const CLAIMABLE_BONUS_SELECTOR = '.claimable-bonus__icon';
    const CLAIM_DROPS_SELECTOR = '[class="ScCoreButton-sc-ocjdkq-0 ScCoreButtonPrimary-sc-ocjdkq-1 ejeLlX eHSNkH"]';
    const PRIME_REWARD_SELECTOR = 'span[data-a-target="tw-button-text"] p[data-a-target="buy-box_call-to-action-text"][title="Get in-game content"], p[data-a-target="buy-box_call-to-action-text"][title="Get game"]';

    // Redeem on GOG Constants
    const GOG_COPY_BUTTON_WRAPPER_SELECTOR = '.copy-button-wrapper';
    const GOG_REDEEM_CODE_INPUT_SELECTOR = '#codeInput';
    const GOG_CONTINUE_BUTTON_SELECTOR = 'button[type="submit"][aria-label="Proceed to the next step"]';
    const GOG_FINAL_REDEEM_BUTTON_SELECTOR = 'button[type="submit"][aria-label="Redeem the code"]';

    let claiming = false;

    // Check if MutationObserver is supported
    const MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;

    // Function to click a button
    function clickButton(buttonSelector) {
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
        const player = document.querySelector(PLAYER_SELECTOR);
        if (player) {
            if (!player.classList.contains(THEATER_MODE_CLASS)) {
                clickButton(THEATER_MODE_BUTTON_SELECTOR);
            }
        } else {
            console.error('Player not found');
        }
    }

    // Function to hide the global menu
    function hideGlobalMenu() {
        const GLOBAL_MENU_SELECTOR = 'div.ScBalloonWrapper-sc-14jr088-0.eEhNFm';
        const globalMenu = document.querySelector(GLOBAL_MENU_SELECTOR);
        if (globalMenu) {
            globalMenu.style.display = 'none';
        } else {
            console.error('Global menu not found');
        }
    }

    // Function to automatically claim channel points
    function autoClaimBonus() {
        if (MutationObserver) {
            console.log('Auto claimer is enabled.');

            let observer = new MutationObserver(mutationsList => {
                for (let mutation of mutationsList) {
                    if (mutation.type === 'childList') {
                        let bonus = document.querySelector(CLAIMABLE_BONUS_SELECTOR);
                        if (bonus && !claiming) {
                            bonus.click();
                            let date = new Date();
                            claiming = true;
                            setTimeout(() => {
                                console.log('Claimed at ' + date.toLocaleString());
                                claiming = false;
                            }, Math.random() * 1000 + 2000);
                        }
                    }
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });
        } else {
            console.log('MutationObserver is not supported in this browser.');
        }
    }

    // Function to claim prime rewards
    function claimPrimeReward() {
        const element = document.querySelector(PRIME_REWARD_SELECTOR);
        if (element) {
            element.click();
        }
    }

    // Function to claim drops
    function claimDrops() {
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
        const copyButtonWrapper = document.querySelector(GOG_COPY_BUTTON_WRAPPER_SELECTOR);

        if (copyButtonWrapper && !document.querySelector('.redeem-button')) {
            const redeemButtonDiv = document.createElement('div');
            redeemButtonDiv.className = 'copy-button tw-align-self-center redeem-button';

            const redeemButton = document.createElement('button');
            redeemButton.ariaLabel = 'Redeem code on GOG';
            redeemButton.className = 'tw-interactive tw-button tw-button--full-width';
            redeemButton.dataset.aTarget = 'redeem-code';
            redeemButton.innerHTML = '<span class="tw-button__text" data-a-target="tw-button-text">Redeem on GOG</span>';

            redeemButtonDiv.appendChild(redeemButton);
            copyButtonWrapper.appendChild(redeemButtonDiv);

            redeemButton.addEventListener('click', function () {
                const code = document.querySelector('input[data-a-target="copy-code-input"]').value;
                if (code) {
                    navigator.clipboard.writeText(code).then(function () {
                        window.location.href = 'https://www.gog.com/en/redeem';
                    });
                }
            });

            const style = document.createElement('style');
            style.innerHTML = `
                .copy-button-wrapper {
                    display: flex;
                    justify-content: space-between;
                }
                .copy-button,
                .redeem-button {
                    margin: 0 5px;
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Function to redeem code on GOG
    function redeemCodeOnGOG() {
        navigator.clipboard.readText().then(function (code) {
            const codeInput = document.querySelector(GOG_REDEEM_CODE_INPUT_SELECTOR);
            if (codeInput) {
                codeInput.value = code;

                // Simulate input event to ensure any listeners are triggered
                const inputEvent = new Event('input', { bubbles: true });
                codeInput.dispatchEvent(inputEvent);

                // Click the continue button after a short delay
                setTimeout(() => {
                    const continueButton = document.querySelector(GOG_CONTINUE_BUTTON_SELECTOR);
                    if (continueButton) {
                        continueButton.click();

                        // Wait for the "Redeem" button to appear and click it
                        const checkRedeemButton = setInterval(() => {
                            const redeemButton = document.querySelector(GOG_FINAL_REDEEM_BUTTON_SELECTOR);
                            if (redeemButton) {
                                clearInterval(checkRedeemButton);
                                redeemButton.click();
                            }
                        }, 500); // Check every 500ms for the Redeem button
                    }
                }, 500); // Adjust the delay as needed
            }
        }).catch(function (err) {
            console.error('Failed to read clipboard contents: ', err);
        });
    }

    if (window.location.hostname === 'gaming.amazon.com') {
        const observer = new MutationObserver((mutations, obs) => {
            const copyButtonWrapper = document.querySelector(GOG_COPY_BUTTON_WRAPPER_SELECTOR);
            if (copyButtonWrapper) {
                addGogRedeemButton();
                obs.disconnect();
            }
        });

        observer.observe(document, {
            childList: true,
            subtree: true
        });

        addGogRedeemButton();
    }

    if (window.location.hostname === 'www.gog.com' && window.location.pathname === '/en/redeem') {
        window.addEventListener('load', redeemCodeOnGOG);
    }

    setTimeout(enableTheaterMode, 1000);
    setTimeout(autoClaimBonus, 1000);
    setTimeout(claimPrimeReward, 1000);
    setTimeout(() => clickButton(CLOSE_MENU_BUTTON_SELECTOR), 1000);
    setTimeout(() => clickButton(CLOSE_MODAL_BUTTON_SELECTOR), 1000);
    setTimeout(hideGlobalMenu, 1000);
    setTimeout(claimDrops, 1000);

    setInterval(function () {
        if (window.location.href.startsWith('https://www.twitch.tv/drops/inventory')) {
            window.location.reload();
        }
    }, 15 * 60000);
})();