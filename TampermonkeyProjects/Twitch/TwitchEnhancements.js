// ==UserScript==
// @name         Twitch Enhancements
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Automatically claim channel points, enable theater mode, and claim prime rewards on https://gaming.amazon.com/
// @author       JJJ
// @match        https://www.twitch.tv/*
// @match        https://gaming.amazon.com/*
// @icon         https://th.bing.com/th/id/R.d71be224f193da01e7e499165a8981c5?rik=uBYlAxJ4XyXmJg&riu=http%3a%2f%2fpngimg.com%2fuploads%2ftwitch%2ftwitch_PNG28.png&ehk=PMc5m5Fil%2bhyq1zilk3F3cuzxSluXFBE80XgxVIG0rM%3d&risl=&pid=ImgRaw&r=0
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;

    const TWITCH = {
        PLAYER_SELECTOR: '.video-player',
        THEATER_MODE_BUTTON_SELECTOR: 'button[aria-label="Theatre Mode (alt+t)"]',
        CLOSE_MENU_BUTTON_SELECTOR: 'button[aria-label="Close Menu"]',
        CLOSE_MODAL_BUTTON_SELECTOR: 'button[aria-label="Close modal"]',
        THEATER_MODE_CLASS: 'theatre-mode',
        GLOBAL_MENU_SELECTOR: 'div.ScBalloonWrapper-sc-14jr088-0.eEhNFm',
    };

    const AUTO_CLAIMER = {
        CLAIMABLE_BONUS_SELECTOR: '.claimable-bonus__icon',
        claiming: false,
    };

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

    function enableTheaterMode() {
        const player = document.querySelector(TWITCH.PLAYER_SELECTOR);
        if (player && !player.classList.contains(TWITCH.THEATER_MODE_CLASS)) {
            clickButton(TWITCH.THEATER_MODE_BUTTON_SELECTOR);
        } else {
            console.error('Player not found or already in theater mode');
        }
    }

    function hideGlobalMenu() {
        const globalMenu = document.querySelector(TWITCH.GLOBAL_MENU_SELECTOR);
        if (globalMenu) {
            globalMenu.style.display = 'none';
        } else {
            console.error('Global menu not found');
        }
    }

    function autoClaimBonus() {
        if (MutationObserver) {
            console.log('Auto claimer is enabled.');

            const observer = new MutationObserver(mutationsList => {
                for (let mutation of mutationsList) {
                    if (mutation.type === 'childList') {
                        let bonus = document.querySelector(AUTO_CLAIMER.CLAIMABLE_BONUS_SELECTOR);
                        if (bonus && !AUTO_CLAIMER.claiming) {
                            bonus.click();
                            let date = new Date();
                            AUTO_CLAIMER.claiming = true;
                            setTimeout(() => {
                                console.log('Claimed at ' + date.toLocaleString());
                                AUTO_CLAIMER.claiming = false;
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
    function claimPrimeRewards() {
        const element = document.querySelector('span[data-a-target="tw-button-text"] p[data-a-target="buy-box_call-to-action-text"][title="Get in-game content"]');
        if (element) {
            element.click();
        }

    setTimeout(enableTheaterMode, 1000);
    setTimeout(() => clickButton(TWITCH.CLOSE_MENU_BUTTON_SELECTOR), 1000);
    setTimeout(() => clickButton(TWITCH.CLOSE_MODAL_BUTTON_SELECTOR), 1000);
    setTimeout(hideGlobalMenu, 1000);
    setTimeout(autoClaimBonus, 1000);
    setTimeout(claimPrimeRewards, 100);
    }
})();
