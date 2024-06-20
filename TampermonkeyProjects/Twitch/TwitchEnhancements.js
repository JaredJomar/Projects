// ==UserScript==
// @name         Twitch Enhancements
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Automatically claim channel points, enable theater mode, and claim prime rewards on https://gaming.amazon.com/
// @author       JJJ
// @match        https://www.twitch.tv/*
// @match        https://gaming.amazon.com/*
// @match        https://www.twitch.tv/drops/inventory*
// @icon         https://th.bing.com/th/id/R.d71be224f193da01e7e499165a8981c5?rik=uBYlAxJ4XyXmJg&riu=http%3a%2f%2fpngimg.com%2fuploads%2ftwitch%2ftwitch_PNG28.png&ehk=PMc5m5Fil%2bhyq1zilk3F3cuzxSluXFBE80XgxVIG0rM%3d&risl=&pid=ImgRaw&r=0
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';
    // Constants
    const PLAYER_SELECTOR = '.video-player';
    const THEATER_MODE_BUTTON_SELECTOR = 'button[aria-label="Modo cine (alt+t)"]';
    const CLOSE_MENU_BUTTON_SELECTOR = 'button[aria-label="Close Menu"]';
    const CLOSE_MODAL_BUTTON_SELECTOR = 'button[aria-label="Close modal"]';
    const THEATER_MODE_CLASS = 'theatre-mode';
    const CLAIMABLE_BONUS_SELECTOR = '.claimable-bonus__icon';
    const CLAIM_DROPS_SELECTOR = '[class="ScCoreButton-sc-ocjdkq-0 ScCoreButtonPrimary-sc-ocjdkq-1 ejeLlX eHSNkH"]';
    const PRIME_REWARD_SELECTOR = 'span[data-a-target="tw-button-text"] p[data-a-target="buy-box_call-to-action-text"][title="Get in-game content"], p[data-a-target="buy-box_call-to-action-text"][title="Get game"]';
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