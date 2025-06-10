// ==UserScript==
// @name         Perplexity Large Chat
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Make the chat column wider on Perplexity
// @author       JJJ
// @match        https://www.perplexity.ai/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=perplexity.ai
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    const customStyles = `
    /* Main chat container */
    .chat-container {
        width: 100%;
        max-width: 100%;
        margin: 0;
        padding: 0;
    }

    /* Text and messages area */
    .message-area {
        width: 100%;
        box-sizing: border-box;
    }

    /* Chat input */
    .chat-input {
        width: 100%;
        box-sizing: border-box;
    }

    /* Ensure text content uses full width */
    .message-content {
        width: 100%;
        word-wrap: break-word;
        overflow-wrap: break-word;
    }

    /* Responsive adjustments */
    @media (min-width: 768px) {
        .chat-container {
            padding: 0 1rem;
        }

        .message-area {
            max-width: none;
            width: 100%;
        }
    }

    /* Remove maximum width restrictions */
    .max-w-threadWidth,
    .max-w-full {
        max-width: none !important;
        width: 100% !important;
    }

    /* Ensure message container uses all available space */
    .message-wrapper {
        display: block;
        width: 100%;
        margin: 0;
    }
`;

    const style = document.createElement('style');
    style.textContent = customStyles;
    document.head.appendChild(style);
})();