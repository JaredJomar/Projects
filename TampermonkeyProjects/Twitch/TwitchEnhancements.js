// ==UserScript==
// @name         Twitch Enhancements
// @namespace    http://tampermonkey.net/
// @version      0.5.3
// @description  Automatically claim channel points, enable theater mode, claim prime rewards, claim drops, and add redeem buttons for GOG and Legacy Games on Twitch and Amazon Gaming websites.
// @author       JJJ
// @match        https://www.twitch.tv/*
// @match        https://gaming.amazon.com/*
// @match        https://www.twitch.tv/drops/inventory*
// @match        https://www.gog.com/en/redeem
// @match        https://promo.legacygames.com/*
// @icon         https://th.bing.com/th/id/R.d71be224f193da01e7e499165a8981c5?rik=uBYlAxJ4XyXmJg&riu=http%3a%2f%2fpngimg.com%2fuploads%2ftwitch%2ftwitch_PNG28.png&ehk=PMc5m5Fil%2bhyq1zilk3F3cuzxSluXFBE80XgxVIG0rM%3d&risl=&pid=ImgRaw&r=0
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    // Add logger configuration
    const Logger = {
        styles: {
            info: 'color: #2196F3; font-weight: bold',
            warning: 'color: #FFC107; font-weight: bold',
            success: 'color: #4CAF50; font-weight: bold',
            error: 'color: #F44336; font-weight: bold'
        },
        prefix: '[TwitchEnhancements]',
        getTimestamp() {
            return new Date().toISOString().split('T')[1].slice(0, -1);
        },
        info(msg) {
            console.log(`%c${this.prefix} ${this.getTimestamp()} - ${msg}`, this.styles.info);
        },
        warning(msg) {
            console.warn(`%c${this.prefix} ${this.getTimestamp()} - ${msg}`, this.styles.warning);
        },
        success(msg) {
            console.log(`%c${this.prefix} ${this.getTimestamp()} - ${msg}`, this.styles.success);
        },
        error(msg) {
            console.error(`%c${this.prefix} ${this.getTimestamp()} - ${msg}`, this.styles.error);
        }
    };

    // Twitch Constants
    const PLAYER_SELECTOR = '.video-player';
    const THEATER_MODE_BUTTON_SELECTOR = 'button[aria-label="Modo cine (alt+t)"], button[aria-label="Theatre Mode (alt+t)"]';
    const CLOSE_MENU_BUTTON_SELECTOR = 'button[aria-label="Close Menu"]';
    const CLOSE_MODAL_BUTTON_SELECTOR = 'button[aria-label="Close modal"]';
    const THEATER_MODE_CLASS = 'theatre-mode';
    const CLAIMABLE_BONUS_SELECTOR = '.claimable-bonus__icon';
    const CLAIM_DROPS_SELECTOR = 'button.ScCoreButton-sc-ocjdkq-0.eWlfQB';
    const PRIME_REWARD_SELECTOR = 'button.tw-interactive.tw-button.tw-button--full-width[data-a-target="buy-box_call-to-action"] span.tw-button__text div.tw-inline-block p.tw-font-size-5.tw-md-font-size-4[title="Get game"]';
    const PRIME_REWARD_SELECTOR_2 = 'p.tw-font-size-5.tw-md-font-size-4[data-a-target="buy-box_call-to-action-text"][title="Get game"]';

    // Redeem on GOG Constants
    const GOG_REDEEM_CODE_INPUT_SELECTOR = '#codeInput';
    const GOG_CONTINUE_BUTTON_SELECTOR = 'button[type="submit"][aria-label="Proceed to the next step"]';
    const GOG_FINAL_REDEEM_BUTTON_SELECTOR = 'button[type="submit"][aria-label="Redeem the code"]';

    // Redeem on Legacy Games Constants
    const LEGACY_GAMES_REDEEM_URL = 'https://promo.legacygames.com/royal-romances-cursed-hearts-ce-prime-deal/';
    const LEGACY_GAMES_CODE_INPUT_SELECTOR = '#primedeal_game_code';
    const LEGACY_GAMES_EMAIL_INPUT_SELECTOR = '#primedeal_email';
    const LEGACY_GAMES_EMAIL_VALIDATE_INPUT_SELECTOR = '#primedeal_email_validate';
    const LEGACY_GAMES_SUBMIT_BUTTON_SELECTOR = '#submitbutton';
    const LEGACY_GAMES_NEWSLETTER_CHECKBOX_SELECTOR = '#primedeal_newsletter';

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
            Logger.error('Player not found');
        }
    }

    // Function to hide the global menu
    function hideGlobalMenu() {
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
        if (MutationObserver) {
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
        } else {
            Logger.warning('MutationObserver is not supported in this browser.');
        }
    }

    // Function to claim prime rewards with retry
    function claimPrimeReward() {
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
                element.click();
                Logger.success('Prime reward claimed');
            } else {
                Logger.info(`Attempt ${attempts}/${maxAttempts}: Waiting for prime reward button...`);
                setTimeout(tryClaim, 1000);
            }
        };

        setTimeout(tryClaim, 2000);
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
            Logger.error('Failed to read clipboard contents: ' + err);
        });
    }

    // Function to add the "Redeem on Legacy Games" button
    function addLegacyGamesRedeemButton() {
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
                                if (!email) {
                                    const userEmail = prompt('Please enter your email address:');
                                    if (userEmail) {
                                        GM_setValue('legacyGamesEmail', userEmail);
                                        window.location.href = LEGACY_GAMES_REDEEM_URL;
                                    }
                                } else {
                                    window.location.href = LEGACY_GAMES_REDEEM_URL;
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
            const parentButton = button.closest('a');
            if (parentButton) {
                window.open(parentButton.href, '_blank');
            }
        });
    }

    if (window.location.hostname === 'gaming.amazon.com') {
        const observer = new MutationObserver((mutations, obs) => {
            const claimCodeButton = document.querySelector('p[title="Claim Code"]');
            if (claimCodeButton) {
                addGogRedeemButton();
            }
            const copyCodeButton = document.querySelector('button[aria-label="Copy code to your clipboard"]');
            if (copyCodeButton) {
                addLegacyGamesRedeemButton();
            }
        });

        observer.observe(document, {
            childList: true,
            subtree: true
        });

        addGogRedeemButton();
        addLegacyGamesRedeemButton();
    }

    if (window.location.hostname === 'www.gog.com' && window.location.pathname === '/en/redeem') {
        window.addEventListener('load', redeemCodeOnGOG);
    }

    if (window.location.hostname === 'promo.legacygames.com') {
        window.addEventListener('load', redeemCodeOnLegacyGames);
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

    let o = new MutationObserver((m) => {
        let script = document.createElement("script");
        script.innerHTML = `
        // Add logger configuration for client-side script
        const Logger = {
            styles: {
                info: 'color: #2196F3; font-weight: bold',
                warning: 'color: #FFC107; font-weight: bold',
                success: 'color: #4CAF50; font-weight: bold',
                error: 'color: #F44336; font-weight: bold'
            },
            prefix: '[TwitchEnhancements]',
            getTimestamp() {
                return new Date().toISOString().split('T')[1].slice(0, -1);
            },
            info(msg) {
                console.log(\`%c\${this.prefix} \${this.getTimestamp()} - \${msg}\`, this.styles.info);
            },
            warning(msg) {
                console.warn(\`%c\${this.prefix} \${this.getTimestamp()} - \${msg}\`, this.styles.warning);
            },
            success(msg) {
                console.log(\`%c\${this.prefix} \${this.getTimestamp()} - \${msg}\`, this.styles.success);
            },
            error(msg) {
                console.error(\`%c\${this.prefix} \${this.getTimestamp()} - \${msg}\`, this.styles.error);
            }
        };
        
        const openClaimGameTabs = () => {
            // More specific selector targeting only prime offer buttons
            const allButtonTexts = document.querySelectorAll('div[data-a-target="tw-core-button-label-text"]');
            
            // Filter buttons to only include those with text "Claim Game" or just "Claim"
            const claimGameButtons = Array.from(allButtonTexts).filter(button => {
                const text = button.textContent.trim();
                return (text === "Claim Game" || text === "Claim") && 
                       button.closest('a') && // Must be inside an anchor tag
                       button.closest('.prime-offer'); // Must be inside a prime offer
            });
            
            Logger.info(\`Found \${claimGameButtons.length} valid claim buttons\`);
            
            // Open each valid claim button in a new tab
            claimGameButtons.forEach(button => {
                const parentButton = button.closest('a');
                if (parentButton && parentButton.href && 
                    (parentButton.href.includes('gaming.amazon.com') || 
                     parentButton.href.includes('?ingress=twch'))) {
                    window.open(parentButton.href, '_blank');
                }
            });
        };
        
        const removeClaimedItems = () => {
            // Find ALL items in the list, not just claimed ones
            const allItems = document.querySelectorAll('.prime-offer');
            let dismissedCount = 0;
            let dismissButtons = [];
            
            Logger.info(\`Found \${allItems.length} total items to dismiss\`);
            
            // First collect all dismiss buttons - use multiple methods to ensure we catch all
            // Method 1: Find buttons by attribute and data target
            document.querySelectorAll('button[aria-label="Dismiss"][data-a-target="prime-offer-dismiss-button"]').forEach(btn => {
                dismissButtons.push(btn);
            });
            
            // Method 2: Find buttons by test selector attribute as backup
            document.querySelectorAll('button[data-test-selector="prime-offer-dismiss-button"]').forEach(btn => {
                if (!dismissButtons.includes(btn)) {
                    dismissButtons.push(btn);
                }
            });
            
            // Method 3: Find by class and structure if the above methods miss any
            document.querySelectorAll('.prime-offer__dismiss button').forEach(btn => {
                if (!dismissButtons.includes(btn)) {
                    dismissButtons.push(btn);
                }
            });
            
            // Deduplicate just in case
            dismissButtons = [...new Set(dismissButtons)];
            
            Logger.info(\`Found \${dismissButtons.length} dismiss buttons to click\`);
            
            // Process dismiss buttons with a delay to avoid UI lockups
            if (dismissButtons.length > 0) {
                const clickNextButton = (index) => {
                    if (index < dismissButtons.length) {
                        try {
                            dismissButtons[index].click();
                            dismissedCount++;
                            
                            // Show progress in console
                            if (dismissedCount % 5 === 0 || dismissedCount === dismissButtons.length) {
                                Logger.info(\`Dismissed \${dismissedCount} of \${dismissButtons.length} items...\`);
                            }
                        } catch (e) {
                            Logger.error(\`Error clicking button \${index}: \` + e);
                        }
                        
                        // Schedule next button click with a small delay
                        setTimeout(() => clickNextButton(index + 1), 75);
                    } else {
                        Logger.success(\`Completed! Dismissed \${dismissedCount} items total.\`);
                        
                        // Look for any dismiss buttons that might have been missed
                        const remainingButtons = document.querySelectorAll('button[aria-label="Dismiss"]');
                        if (remainingButtons.length > 0) {
                            Logger.warning(\`Found \${remainingButtons.length} additional buttons to try\`);
                            
                            // Try to click any remaining dismiss buttons as a final pass
                            remainingButtons.forEach(btn => {
                                try {
                                    btn.click();
                                    dismissedCount++;
                                } catch(e) {}
                            });
                            
                            Logger.success(\`Final dismissal count: \${dismissedCount}\`);
                        }
                    }
                };
                
                // Start the dismissal process
                clickNextButton(0);
            } else {
                Logger.warning('No dismiss buttons found to click');
                
                // Last attempt fallback - try to find any button with "Dismiss" in aria-label
                const fallbackButtons = document.querySelectorAll('button[aria-label="Dismiss"]');
                if (fallbackButtons.length > 0) {
                    Logger.warning(\`Fallback: Found \${fallbackButtons.length} buttons with aria-label="Dismiss"\`);
                    fallbackButtons.forEach(btn => {
                        try {
                            btn.click();
                            dismissedCount++;
                        } catch(e) {}
                    });
                    Logger.success(\`Fallback dismissal completed: \${dismissedCount} items dismissed\`);
                }
            }
        };
    `;
        document.getElementById("PrimeOfferPopover-header").innerHTML = "";
        document.getElementById("PrimeOfferPopover-header").appendChild(script);
        document.getElementById("PrimeOfferPopover-header").innerHTML += `
        <div style="display: flex; gap: 10px; margin-bottom: 10px;">
            <input type='button' style='border: none; background-color: #9147ff; color: white; padding: 10px 20px; font-size: 14px; border-radius: 4px; cursor: pointer; flex: 1;' 
                class='tw-align-items-center tw-align-middle tw-border-bottom-left-radius-medium tw-border-bottom-right-radius-medium tw-border-top-left-radius-medium tw-border-top-right-radius-medium tw-core-button tw-core-button--primary tw-inline-flex tw-interactive tw-justify-content-center tw-overflow-hidden tw-relative' 
                value='Claim All' 
                onclick='openClaimGameTabs();'>
            <input type='button' style='border: none; background-color: #772ce8; color: white; padding: 10px 20px; font-size: 14px; border-radius: 4px; cursor: pointer; flex: 1;' 
                class='tw-align-items-center tw-align-middle tw-border-bottom-left-radius-medium tw-border-bottom-right-radius-medium tw-border-top-left-radius-medium tw-border-top-right-radius-medium tw-core-button tw-core-button--primary tw-inline-flex tw-interactive tw-justify-content-center tw-overflow-hidden tw-relative' 
                value='Remove All' 
                onclick='removeClaimedItems();'>
        </div>
    `;
    });

    o.observe(document.body, { childList: true });
})();