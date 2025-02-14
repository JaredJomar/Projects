// ==UserScript==
// @name         Outlook Smart Email Filter Manager
// @namespace    http://tampermonkey.net/
// @version      0.1.1
// @description  Manage Outlook Web App email filters with a popup. Features:
//               - Press F2 to open filter selection
//               - Left/Right arrows to navigate between emails
//               - Automatic filter application
// @author       JJJ
// @match        https://outlook.office.com/mail/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=office.com
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    // =====================================
    // Constants and Configuration
    // =====================================
    const STORAGE_KEY = "outlookFilter";
    const MAX_RETRIES = 3;
    const OBSERVE_TIMEOUT = 30000; // 30 seconds
    const FILTER_OPTIONS = ["Unread", "All", "Flagged", "To me", "Has files", "Mentions me"];
    const STYLES = {
        selected: {
            border: "2px solid #0078d4",
            background: "#e6f3ff"
        },
        normal: {
            border: "1px solid #ccc",
            background: "#fff"
        },
        hover: {
            background: "#f0f0f0"
        }
    };

    // Add new constants
    const ROUTES = {
        INBOX: '/mail',
        EXCLUDED_PATHS: [
            '/sentitems',
            '/drafts',
            '/message',
            '/viewmessage',
            'popout'
        ],
        // Add mail ID pattern
        MAIL_ID_PATTERN: /\/id\/[A-Za-z0-9%]+/
    };

    let currentRoute = '';
    let lastFilterApplied = Date.now();
    const FILTER_COOLDOWN = 2000; // 2 seconds between filter attempts

    /**
     * Checks if current route is valid for filtering
     */
    function isValidRoute() {
        const currentPath = window.location.pathname.toLowerCase();
        const currentHash = window.location.hash.toLowerCase();

        // Check for mail ID pattern (viewing individual email)
        if (ROUTES.MAIL_ID_PATTERN.test(currentPath)) {
            console.log("In mail view, skipping filter");
            return false;
        }

        // Skip if in excluded paths
        if (ROUTES.EXCLUDED_PATHS.some(path =>
            currentPath.includes(path.toLowerCase()) ||
            currentHash.includes(path.toLowerCase()))) {
            console.log("In excluded path, skipping filter");
            return false;
        }

        // Must be in mail view and not showing individual email
        return currentPath.includes(ROUTES.INBOX) &&
            !currentPath.includes('/id/');
    }

    /**
     * Handles route changes with improved detection
     */
    function handleRouteChange() {
        const newRoute = window.location.pathname + window.location.hash;
        if (newRoute !== currentRoute) {
            console.log("Route changed:", newRoute);
            currentRoute = newRoute;

            if (isValidRoute() && Date.now() - lastFilterApplied > FILTER_COOLDOWN) {
                console.log("Valid route detected, applying filter");
                lastFilterApplied = Date.now();
                tryApplyFilter();
            }
        }
    }

    /**
     * Attempts to find and click the filter button
     */
    function tryApplyFilter() {
        // Try to find the filter button
        const filterButton = document.querySelector('#mailListFilterMenu, [aria-label*="Filter"]');

        if (filterButton) {
            console.log("Filter button found, applying filter");
            applyFilter(selectedFilter);
        } else {
            console.log("Filter button not found, starting observer");
            startFilterObserver();
        }
    }

    /**
     * Starts the mutation observer with improved timing
     */
    function startFilterObserver() {
        let isObserving = false;
        const observer = new MutationObserver((mutations, obs) => {
            const filterButton = document.querySelector('#mailListFilterMenu, [aria-label*="Filter"]');
            if (filterButton && !isObserving && isValidRoute()) {
                isObserving = true;
                obs.disconnect();
                console.log("Filter button found by observer");
                applyFilter(selectedFilter);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['id', 'aria-label']
        });

        // Cleanup after timeout
        setTimeout(() => {
            if (!isObserving) {
                observer.disconnect();
                console.log("Observer timed out");
            }
        }, OBSERVE_TIMEOUT);
    }

    // Initialize state
    let selectedFilter = localStorage.getItem(STORAGE_KEY) || "Unread";

    // =====================================
    // UI Components
    // =====================================
    /**
     * Creates and configures the filter selection popup
     * @returns {HTMLElement} Configured popup element
     */
    function createFilterPopup() {
        const popup = document.createElement("div");
        Object.assign(popup.style, {
            position: "fixed",
            top: "20%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "#fff",
            border: "1px solid #ccc",
            boxShadow: "0px 0px 10px rgba(0,0,0,0.1)",
            zIndex: "10000",
            padding: "15px",
            borderRadius: "8px",
            display: "none"
        });

        FILTER_OPTIONS.forEach(option => createFilterButton(option, popup));
        return popup;
    }

    /**
     * Creates a filter button and appends it to the popup
     * @param {string} option Filter option name
     * @param {HTMLElement} popup Popup element
     */
    function createFilterButton(option, popup) {
        const btn = document.createElement("button");
        btn.textContent = option;
        btn.style.margin = "5px";
        btn.style.padding = "8px 12px";
        btn.style.border = selectedFilter === option ? STYLES.selected.border : STYLES.normal.border;
        btn.style.cursor = "pointer";
        btn.style.backgroundColor = selectedFilter === option ? STYLES.selected.background : STYLES.normal.background;
        btn.style.borderRadius = "4px";
        btn.style.transition = "all 0.3s ease";

        // Add hover effect
        btn.addEventListener("mouseover", () => {
            if (btn.textContent !== selectedFilter) {
                btn.style.backgroundColor = STYLES.hover.background;
            }
        });
        btn.addEventListener("mouseout", () => {
            if (btn.textContent !== selectedFilter) {
                btn.style.backgroundColor = STYLES.normal.background;
            }
        });

        // Add click handler
        btn.addEventListener("click", () => {
            selectedFilter = option;
            localStorage.setItem(STORAGE_KEY, option);
            updateButtonStyles();
            popup.style.display = "none";
            applyFilter(option);
        });
        popup.appendChild(btn);
    }

    /**
     * Updates the styles of the filter buttons based on the selected filter
     */
    function updateButtonStyles() {
        Array.from(popup.children).forEach(btn => {
            btn.style.border = btn.textContent === selectedFilter ? STYLES.selected.border : STYLES.normal.border;
            btn.style.backgroundColor = btn.textContent === selectedFilter ? STYLES.selected.background : STYLES.normal.background;
        });
    }

    // =====================================
    // Event Handlers
    // =====================================
    /**
     * Handles keyboard navigation and popup toggle
     * @param {KeyboardEvent} e Keyboard event
     */
    function handleKeyboardEvents(e) {
        switch (e.key) {
            case "F2":
                e.preventDefault(); // Prevent default F2 behavior
                togglePopup();
                break;
            case "Escape":
                if (popup.style.display === "block") {
                    popup.style.display = "none";
                }
                break;
            case "ArrowLeft":
                clickNavigationButton("previous");
                break;
            case "ArrowRight":
                clickNavigationButton("next");
                break;
        }
    }

    // Create popup reference at top level
    let popup;

    /**
     * Toggles the display of the filter popup
     */
    function togglePopup() {
        if (!popup) return;
        popup.style.display = popup.style.display === "none" ? "block" : "none";
    }

    /**
     * Clicks the navigation button based on the direction
     * @param {string} direction Direction to navigate ("previous" or "next")
     */
    function clickNavigationButton(direction) {
        const buttons = document.querySelectorAll('button[title*="Open the ' + direction + ' item"]');
        const button = [...buttons].find(btn => !btn.disabled);
        if (button) {
            button.click();
        }
    }

    // =====================================
    // Filter Application Logic
    // =====================================
    /**
     * Applies the selected filter with retry mechanism
     * @param {string} filter Filter to apply
     * @param {number} retryCount Current retry attempt
     */
    function applyFilter(filter, retryCount = 0) {
        const filterButton = document.getElementById("mailListFilterMenu");

        if (filterButton) {
            filterButton.click();

            const timeoutId = setTimeout(() => {
                console.log("Filter menu didn't open, retrying...");
                if (retryCount < MAX_RETRIES) {
                    applyFilter(filter, retryCount + 1);
                }
            }, 2000);

            setTimeout(() => {
                const filterMenuItems = document.querySelectorAll('[role="menuitemradio"][name="viewFilter"]');
                const selectedMenuItem = [...filterMenuItems].find(item => item.title === filter);

                clearTimeout(timeoutId);

                if (selectedMenuItem && selectedMenuItem.getAttribute("aria-checked") !== "true") {
                    selectedMenuItem.click();
                } else if (retryCount < MAX_RETRIES) {
                    console.log("Filter not found, retrying...");
                    applyFilter(filter, retryCount + 1);
                }
            }, 300);
        } else if (retryCount < MAX_RETRIES) {
            setTimeout(() => applyFilter(filter, retryCount + 1), 1000);
        } else {
            console.error("Failed to find filter button after multiple attempts");
        }
    }

    // Enhance initialization
    function initialize() {
        popup = createFilterPopup();
        document.body.appendChild(popup);

        // Add both keydown and keyup handlers for better F2 detection
        document.addEventListener("keydown", handleKeyboardEvents, true);

        // Enhanced URL observer
        const urlObserver = new MutationObserver(() => {
            handleRouteChange();
        });

        urlObserver.observe(document.body, {
            subtree: true,
            childList: true,
            characterData: false
        });

        // Initial check
        console.log("Outlook Filter Manager initialized");
        if (isValidRoute()) {
            console.log("Valid initial route, starting filter application");
            tryApplyFilter();
        }
    }

    // Start the script
    initialize();
})();