// ==UserScript==
// @name         Close Ads
// @namespace    https://www.lookmovie2.to/
// @version      0.6.1
// @description  Closes ads on LookMovie and removes specific reCAPTCHA and banner ads from the page
// @author       JJJ
// @match        https://www.lookmovie2.to/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=lookmovie2.to
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    const currentUrl = window.location.href;

    // Configuration
    const config = {
        closePlayerAdSelector: '#PlayerZone > section > a.close-icon.player-ads-summer-2024--close',
        IPreferAdsSelector: 'button.no.stay-free[data-notify-html="buttonStayFree"]',
        notifyButtonSelector: 'body > div.notifyjs-corner > div > div.notifyjs-container > div > div.buttons > button',
        maxAttempts: 50,
        continuousCheck: true,
        debounceTime: 200,
        threatProtectionBaseUrl: 'https://www.lookmovie2.to/threat-protection/'
    };

    let attempts = 0;
    let observer = null;
    let debounceTimeout = null;

    // Function to remove the specific reCAPTCHA div based on the styles
    const removeReCaptchaDiv = () => {
        if (!currentUrl.startsWith(config.threatProtectionBaseUrl)) {
            const reCaptchaDiv = document.querySelector('div[style*="background-color: rgb(255, 255, 255);"][style*="border: 1px solid rgb(204, 204, 204);"][style*="z-index: 2000000000;"][style*="position: absolute;"]');
            if (reCaptchaDiv) {
                reCaptchaDiv.remove();
                console.log('reCAPTCHA div removed');
                return true;
            }
        }
        return false;
    };

    // Function to remove the banner ad div
    const removeBannerAd = () => {
        const bannerAdDiv = document.querySelector('.banner-become-affiliate');
        if (bannerAdDiv) {
            bannerAdDiv.remove();
            console.log('Banner ad removed');
            return true;
        }
        return false;
    };

    // Function to close ads or click relevant buttons
    const handleAds = () => {
        try {
            if (removeReCaptchaDiv() || removeBannerAd()) {
                return true;
            }

            const closePlayerAdButton = document.querySelector(config.closePlayerAdSelector);
            if (closePlayerAdButton) {
                closePlayerAdButton.click();
                console.log('Ad closed');
                return true;
            }

            const IPreferAdsButton = document.querySelector(config.IPreferAdsSelector);
            if (IPreferAdsButton) {
                IPreferAdsButton.click();
                console.log('"I Prefer Ads" button clicked');
                return true;
            }

            const notifyButton = document.querySelector(config.notifyButtonSelector);
            if (notifyButton) {
                notifyButton.click();
                console.log('Notify button clicked');
                return true;
            }
        } catch (error) {
            console.error('Error while handling ads or buttons:', error);
        }
        return false;
    };

    // Debounced function to handle mutations
    const debouncedHandleAds = () => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            if (handleAds()) {
                attempts = 0;
            } else {
                attempts++;
            }

            if (!config.continuousCheck && attempts >= config.maxAttempts) {
                stopObserver();
                console.log('Ad handling process finished');
            }
        }, config.debounceTime);
    };

    // Function to handle mutations
    const handleMutations = (mutations) => {
        mutations.forEach(() => {
            debouncedHandleAds();
        });
    };

    // Function to start the MutationObserver
    const startObserver = () => {
        if (observer) return;

        observer = new MutationObserver(handleMutations);
        observer.observe(document.body, { childList: true, subtree: true });
        console.log('MutationObserver started');
    };

    // Function to stop the MutationObserver
    const stopObserver = () => {
        if (observer) {
            observer.disconnect();
            observer = null;
            console.log('MutationObserver stopped');
        }
    };

    // Function to initialize the process
    const initAdCloser = () => {
        console.log('Ad closer initialized');
        if (handleAds()) {
            attempts = 0;
        }

        startObserver();

        window.addEventListener('beforeunload', stopObserver);
    };

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        initAdCloser();
    } else {
        document.addEventListener('DOMContentLoaded', initAdCloser);
    }

    setTimeout(initAdCloser, 1000);

    window.addEventListener('error', (e) => {
        console.error('Error in Close Ads script:', e.error);
    });

    (function () {
        if (!window.MutationObserver) {
            window.MutationObserver = window.WebKitMutationObserver || window.MozMutationObserver || class {
                constructor(callback) {
                    this.callback = callback;
                }
                observe() {
                    console.warn('MutationObserver not supported by this browser.');
                }
                disconnect() { }
            };
        }
    })();
})();