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

(function() {
    'use strict';

    const PLAYER_SELECTOR = '.video-player';
    const THEATER_MODE_BUTTON_SELECTOR = 'button[aria-label="Theatre Mode (alt+t)"]';
    const CLOSE_MENU_BUTTON_SELECTOR = 'button[aria-label="Close Menu"]';
    const CLOSE_MODAL_BUTTON_SELECTOR = 'button[aria-label="Close modal"]';
    const THEATER_MODE_CLASS = 'theatre-mode';
    const MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;
    const CLAIMABLE_BONUS_SELECTOR = '.claimable-bonus__icon';
    let claiming = false;

function clickButton(buttonSelector) {
    const observer = new MutationObserver((mutationsList, observer) => {
        for(let mutation of mutationsList) {
            if(mutation.addedNodes.length) {
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
    const player = document.querySelector(PLAYER_SELECTOR);
    if (player) {
        if (!player.classList.contains(THEATER_MODE_CLASS)) {
            clickButton(THEATER_MODE_BUTTON_SELECTOR);
        }
    } else {
        console.error('Player not found');
    }
}

function hideGlobalMenu() {
    const GLOBAL_MENU_SELECTOR = 'div.ScBalloonWrapper-sc-14jr088-0.eEhNFm';
    const globalMenu = document.querySelector(GLOBAL_MENU_SELECTOR);
    if (globalMenu) {
        globalMenu.style.display = 'none';
    } else {
        console.error('Global menu not found');
    }
}

function autoClaimBonus() {
    if (MutationObserver) {
        console.log('Auto claimer is enabled.');

        // Create a new MutationObserver instance
        let observer = new MutationObserver(mutationsList => {
            for (let mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    // Check if there is a claimable bonus available
                    let bonus = document.querySelector(CLAIMABLE_BONUS_SELECTOR);
                    if (bonus && !claiming) {
                        // Click on the bonus to claim it
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

        // Observe changes in the document body and its subtree
        observer.observe(document.body, { childList: true, subtree: true });
    } else {
        console.log('MutationObserver is not supported in this browser.');
    }
}

function claimPrimeReward() {
    const element = document.querySelector('span[data-a-target="tw-button-text"] p[data-a-target="buy-box_call-to-action-text"][title="Get in-game content"]');
    if (element) {
        element.click();
    }
}

setTimeout(enableTheaterMode, 1000);
setTimeout(autoClaimBonus, 1000);
setTimeout(claimPrimeReward, 1000);
setTimeout(() => clickButton(CLOSE_MENU_BUTTON_SELECTOR), 1000);
setTimeout(() => clickButton(CLOSE_MODAL_BUTTON_SELECTOR), 1000);
setTimeout(hideGlobalMenu, 1000);
}
)();
