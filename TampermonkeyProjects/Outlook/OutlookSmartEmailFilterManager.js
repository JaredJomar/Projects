// ==UserScript==
// @name         Outlook Smart Email Filter Manager
// @namespace    http://tampermonkey.net/
// @version      0.1.0
// @description  Manage Outlook Web App email filters with a popup. Press F2 to open and select a filter. The filter is applied automatically.
// @author       JJJ
// @match        https://outlook.office.com/mail/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=office.com
// @grant        none
// @license        MIT
// ==/UserScript==

(function () {
    'use strict';

    // Initialize variables
    const storageKey = "outlookFilter";
    let selectedFilter = localStorage.getItem(storageKey) || "Unread";

    // Create popup
    const popup = document.createElement("div");
    popup.style.position = "fixed";
    popup.style.top = "20%";
    popup.style.left = "50%";
    popup.style.transform = "translate(-50%, -50%)";
    popup.style.background = "#fff";
    popup.style.border = "1px solid #ccc";
    popup.style.boxShadow = "0px 0px 10px rgba(0,0,0,0.1)";
    popup.style.zIndex = "10000";
    popup.style.padding = "15px";
    popup.style.borderRadius = "8px";
    popup.style.display = "none";

    // Add options to popup
    const options = ["Unread", "All", "Flagged", "To me", "Has files", "Mentions me"];
    options.forEach(option => {
        const btn = document.createElement("button");
        btn.textContent = option;
        btn.style.margin = "5px";
        btn.style.padding = "8px 12px";
        btn.style.border = selectedFilter === option ? "2px solid #0078d4" : "1px solid #ccc";
        btn.style.cursor = "pointer";
        btn.style.backgroundColor = selectedFilter === option ? "#e6f3ff" : "#fff";
        btn.style.borderRadius = "4px";
        btn.style.transition = "all 0.3s ease";

        // Add hover effect
        btn.addEventListener("mouseover", () => {
            if (btn.textContent !== selectedFilter) {
                btn.style.backgroundColor = "#f0f0f0";
            }
        });
        btn.addEventListener("mouseout", () => {
            if (btn.textContent !== selectedFilter) {
                btn.style.backgroundColor = "#fff";
            }
        });

        // Add click handler
        btn.addEventListener("click", () => {
            selectedFilter = option;
            localStorage.setItem(storageKey, option);
            updateButtonStyles();
            popup.style.display = "none";
            applyFilter(option);
        });
        popup.appendChild(btn);
    });

    document.body.appendChild(popup);

    // Update button styles
    function updateButtonStyles() {
        Array.from(popup.children).forEach(btn => {
            btn.style.border = btn.textContent === selectedFilter ? "2px solid #0078d4" : "1px solid #ccc";
            btn.style.backgroundColor = btn.textContent === selectedFilter ? "#e6f3ff" : "#fff";
        });
    }

    // Toggle popup visibility with F2
    document.addEventListener("keydown", (e) => {
        if (e.key === "F2") {
            popup.style.display = popup.style.display === "none" ? "block" : "none";
        }
    });

    // Apply the selected filter
    function applyFilter(filter) {
        const filterButton = document.getElementById("mailListFilterMenu");
        if (filterButton) {
            filterButton.click();
            setTimeout(() => {
                const filterMenuItems = document.querySelectorAll('[role="menuitemradio"][name="viewFilter"]');
                const selectedMenuItem = [...filterMenuItems].find(item => item.title === filter);
                if (selectedMenuItem && selectedMenuItem.getAttribute("aria-checked") !== "true") {
                    selectedMenuItem.click();
                }
            }, 300);
        } else {
            console.error("Filter button not found!");
        }
    }

    // Observe changes in the DOM and apply the filter
    function observeAndApplyFilter() {
        const filterButton = document.getElementById("mailListFilterMenu");
        if (filterButton) {
            applyFilter(selectedFilter);
        } else {
            const observer = new MutationObserver(() => {
                const filterButton = document.getElementById("mailListFilterMenu");
                if (filterButton) {
                    observer.disconnect();
                    applyFilter(selectedFilter);
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }
    }

    // Run the script
    console.log("Outlook filter popup script (Enhanced version) loaded.");
    observeAndApplyFilter();
})();