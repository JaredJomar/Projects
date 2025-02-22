// Constants
const CONFIG = {
    selectors: {
        // Update selectors with alternatives
        episodeList: [
            '.CapiTnv.nav.nav-pills > li',
            '.CpCnC .fa-download',  // Fallback selector
            '.CapiTnv li'          // Another fallback
        ],
        sortButtons: {
            desc: '.fa-sort-amount-desc',
            asc: '.fa-sort-amount-asc'
        },
        sortCheckbox: '#sortEpisodes',
        sortContainer: '.order-lst',
        pageUpButton: '.button-85',
        downloadLinks: 'a.fa-download',
        mainContent: 'main.Main'
    },
    storage: {
        selectedOption: 'selectedOption'
    },
    delays: {
        init: 2000,
        sort: 3000,
        click: 100,
        jquery: 100
    },
    maxRetries: 10
};

// Feature modules
const Features = {
    // DOM Helper functions
    DOM: {
        waitForElement: (selectors, timeout = 5000) => {
            // Convert single selector to array
            const selectorArray = Array.isArray(selectors) ? selectors : [selectors];

            return new Promise((resolve, reject) => {
                // Try all selectors
                for (const selector of selectorArray) {
                    const element = document.querySelector(selector);
                    if (element) {
                        console.log(`Found element with selector: ${selector}`);
                        return resolve(element);
                    }
                }

                const observer = new MutationObserver((mutations, obs) => {
                    for (const selector of selectorArray) {
                        const element = document.querySelector(selector);
                        if (element) {
                            console.log(`Found element with selector: ${selector}`);
                            obs.disconnect();
                            resolve(element);
                            return;
                        }
                    }
                });

                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });

                setTimeout(() => {
                    observer.disconnect();
                    console.warn('Available selectors on page:', document.body.innerHTML);
                    reject(new Error(`None of these selectors found: ${selectorArray.join(', ')}`));
                }, timeout);
            });
        },

        createElement: (tag, attributes = {}, children = []) => {
            const element = document.createElement(tag);
            Object.entries(attributes).forEach(([key, value]) => {
                if (typeof value === 'object') {
                    Object.entries(value).forEach(([k, v]) => {
                        element[key][k] = v;
                    });
                } else {
                    element[key] = value;
                }
            });
            children.forEach(child => element.appendChild(child));
            return element;
        }
    },

    // Option Selector Feature
    OptionSelector: {
        // Function to create the dropdown menu
        createDropdownMenu: (options) => {
            const dropdownMenu = document.createElement('select');
            dropdownMenu.id = 'optionDropdown';

            Array.from(options).forEach((option) => {
                const dropdownOption = document.createElement('option');
                const optionText = option.getAttribute('title') || option.textContent.trim();
                dropdownOption.value = optionText;
                dropdownOption.textContent = optionText;
                dropdownMenu.appendChild(dropdownOption);
            });

            return dropdownMenu;
        },

        // Function to toggle the menu visibility
        toggleMenu: () => {
            const menu = document.getElementById('customMenu');
            if (menu) {
                menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
            }
        },

        // Updated handleOptionSelection method
        handleOptionSelection: async () => {
            const dropdown = document.getElementById('optionDropdown');
            if (!dropdown) return;

            const selectedOptionValue = dropdown.value;
            chrome.storage.local.set({ [CONFIG.storage.selectedOption]: selectedOptionValue });

            try {
                // Look for the provider button
                const providerButtons = document.querySelectorAll('.CapiTnv.nav.nav-pills > li');
                for (const button of providerButtons) {
                    const buttonText = button.getAttribute('title') || button.textContent.trim();
                    if (buttonText === selectedOptionValue) {
                        // Force a small delay before clicking
                        await new Promise(resolve => setTimeout(resolve, CONFIG.delays.click));
                        // Trigger a direct click on the button
                        button.querySelector('a')?.click();
                        Features.OptionSelector.toggleMenu();
                        console.log('Provider selected:', selectedOptionValue);
                        break;
                    }
                }
            } catch (error) {
                console.error('Error selecting provider:', error);
            }
        },

        // Function to create the custom menu
        createCustomMenu: () => {
            if (document.getElementById('customMenu')) return;

            const options = document.querySelectorAll(CONFIG.selectors.episodeList);
            if (options.length === 0) return;

            const customMenu = document.createElement('div');
            customMenu.id = 'customMenu';

            const dropdownMenu = Features.OptionSelector.createDropdownMenu(options);
            chrome.storage.local.get([CONFIG.storage.selectedOption], function (result) {
                if (result[CONFIG.storage.selectedOption]) {
                    dropdownMenu.value = result[CONFIG.storage.selectedOption];
                }
            });

            const confirmButton = document.createElement('button');
            confirmButton.id = 'confirmButton';
            confirmButton.textContent = 'Confirm';
            confirmButton.addEventListener('click', Features.OptionSelector.handleOptionSelection);

            customMenu.appendChild(dropdownMenu);
            customMenu.appendChild(confirmButton);
            document.body.appendChild(customMenu);
        },

        // Add new method for auto-selecting provider
        autoSelectProvider: async () => {
            try {
                const result = await new Promise(resolve => {
                    chrome.storage.local.get([CONFIG.storage.selectedOption], resolve);
                });

                if (result[CONFIG.storage.selectedOption]) {
                    const options = document.querySelectorAll(CONFIG.selectors.episodeList);
                    for (const option of options) {
                        if ((option.getAttribute('title') || option.textContent.trim()) === result[CONFIG.storage.selectedOption]) {
                            await new Promise(resolve => setTimeout(resolve, CONFIG.delays.click));
                            option.click();
                            break;
                        }
                    }
                }
            } catch (error) {
                console.error('Error auto-selecting provider:', error);
            }
        }
    },

    // Page Navigation Feature
    PageNavigation: {
        createPageUpButton: () => {
            if (document.querySelector(CONFIG.selectors.pageUpButton)) return;

            const button = Features.DOM.createElement('button', {
                innerHTML: 'Page Up',
                className: 'button-85',
                onclick: () => window.scrollTo({ top: 0, behavior: 'smooth' })
            });
            document.body.appendChild(button);
        },

        togglePageUpButton: () => {
            const button = document.querySelector(CONFIG.selectors.pageUpButton);
            if (button) {
                button.style.display = window.scrollY > 100 ? 'block' : 'none';
            }
        }
    },

    // Updated Auto Sort Feature
    AutoSort: {
        execute: () => {
            window.addEventListener('load', function () {
                setTimeout(() => {
                    const sortContainer = document.querySelector(CONFIG.selectors.sortContainer);
                    if (!sortContainer) {
                        console.error("Sort container not found");
                        return;
                    }

                    // Find and click the checkbox first if it exists
                    const checkbox = sortContainer.querySelector(CONFIG.selectors.sortCheckbox);
                    if (checkbox && !checkbox.checked) {
                        checkbox.click();
                    }

                    // Click the ascending sort button ("Menor a Mayor")
                    const ascButton = sortContainer.querySelector(CONFIG.selectors.sortButtons.asc)?.parentElement;
                    if (ascButton) {
                        console.log('Ascending sort button found, clicking...');
                        ascButton.click();
                    } else {
                        console.error("Ascending sort button not found");
                    }
                }, CONFIG.delays.sort);
            });
        }
    }
};

// Main initialization
class AppInitializer {
    constructor() {
        this.initAttempts = 0;
    }

    async init() {
        try {
            // Execute auto-sort immediately
            Features.AutoSort.execute();

            Features.PageNavigation.createPageUpButton();

            // Try to find element with any of the selectors
            const element = await Features.DOM.waitForElement(CONFIG.selectors.episodeList);
            if (!element) {
                console.warn('No matching elements found on page');
                return;
            }

            console.log('Successfully found element:', element);
            Features.OptionSelector.createCustomMenu();
            // Add auto-select after menu creation
            await Features.OptionSelector.autoSelectProvider();
            this.setupEventListeners();

        } catch (error) {
            console.warn('Init error:', error);
            console.log('Current URL:', window.location.href);
            console.log('Page state:', document.readyState);

            if (this.initAttempts < CONFIG.maxRetries) {
                this.initAttempts++;
                console.log(`Retrying initialization (attempt ${this.initAttempts})`);
                setTimeout(() => this.init(), CONFIG.delays.init);
            }
        }
    }

    setupEventListeners() {
        window.addEventListener('scroll', Features.PageNavigation.togglePageUpButton);
        document.addEventListener('keydown', (event) => {
            if (event.key === 'F2') Features.OptionSelector.toggleMenu();
        });
    }
}

// Start application
const app = new AppInitializer();
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init());
} else {
    app.init();
}
