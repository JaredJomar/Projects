// ==UserScript==
// @name         ChatGPT Delete Chat Shortcut
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @description  Map Delete key to Ctrl+Shift+Delete for ChatGPT chat deletion
// @author       JJJ
// @match        https://chatgpt.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=chatgpt.com
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    // Configuration
    const CONFIG = {
        debugMode: false // Enable console logging for debugging
    };

    // Utility functions
    const log = (...args) => {
        if (CONFIG.debugMode) {
            console.log('[ChatGPT Delete Shortcut]', ...args);
        }
    };

    // Function to simulate Ctrl+Shift+Delete key combination
    const simulateCtrlShiftDelete = () => {
        // Create a synthetic keyboard event for Ctrl+Shift+Delete
        const event = new KeyboardEvent('keydown', {
            key: 'Delete',
            code: 'Delete',
            keyCode: 46,
            which: 46,
            ctrlKey: true,
            shiftKey: true,
            bubbles: true,
            cancelable: true
        });

        // Dispatch the event
        document.dispatchEvent(event);
        log('Ctrl+Shift+Delete event dispatched');

        // Also try dispatching to body and window for broader compatibility
        document.body.dispatchEvent(event);
        window.dispatchEvent(event);
    };

    // Keyboard event handler
    const handleKeyDown = (event) => {
        // Only trigger on Delete key (not when Ctrl or Shift are already pressed)
        if (event.key !== 'Delete' && event.keyCode !== 46) {
            return;
        }

        // Don't trigger if modifiers are already pressed (to avoid conflicts)
        if (event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) {
            return;
        }

        // Don't trigger if user is typing in an input field
        const activeElement = document.activeElement;
        if (activeElement && (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.isContentEditable ||
            activeElement.closest('[contenteditable="true"]') ||
            activeElement.closest('[role="textbox"]')
        )) {
            return;
        }

        // Prevent default delete behavior
        event.preventDefault();
        event.stopPropagation();

        log('Delete key pressed, simulating Ctrl+Shift+Delete');
        simulateCtrlShiftDelete();
    };

    // Initialize the script
    const init = () => {
        log('Initializing ChatGPT Delete Chat Shortcut');

        // Add keyboard event listener with high priority
        document.addEventListener('keydown', handleKeyDown, true);
        document.addEventListener('keyup', handleKeyDown, true); // Also handle keyup for better compatibility

        log('ChatGPT Delete Chat Shortcut initialized successfully');
    };

    // Wait for the page to load and initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Re-initialize on navigation changes (for SPA behavior)
    let lastUrl = location.href;
    const observer = new MutationObserver(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            setTimeout(init, 500); // Shorter delay for faster response
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Expose functions for debugging (only in debug mode)
    if (CONFIG.debugMode) {
        window.chatGPTDeleteShortcut = {
            simulateCtrlShiftDelete,
            config: CONFIG
        };
    }

})();
