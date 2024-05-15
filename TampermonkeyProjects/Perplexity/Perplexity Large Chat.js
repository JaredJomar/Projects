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

    // Add your custom CSS styles here
    const customStyles = `
        /* Chat Width */
        /* This rule sets the maximum width of the chat to 100% */
        .max-w-threadWidth {
            max-width: 100%;
        }

        /* Right column of the chat */
        /* This rule sets the margin-left to #% and maximum width to #% for the right column of the chat */
        @media (min-width: 768px) {
            .col-span-4 {
                margin-left: 60%;
                max-width: 100% !important;
            }
        }
        /* Sets the left and right padding */
        .px-md {
            padding-left: 1rem;
            padding-right: 1rem;
        }

        /* Width of the chat column */
        /* This rule sets the width of the chat column to 127% */
        @media (min-width: 768px) {
            div.col-span-8 {
                width: 127% !important;
            }
        }

        /* Parent container */
        /* This rule makes the parent container a flex container and centers its children both vertically and horizontally */
        .parent {
            display: flex;
            justify-content: center;
            align-items: center;
            flex-wrap: wrap;
            /* Allows elements to wrap onto multiple lines if needed */
        }

        /* Specific element styling */
        /* This rule sets the left margin of the specific element to 30% to center the input box */
        @media (min-width: 768px) {
            .rounded-full.md\\:p-sm.bg-offset.dark\\:bg-offsetDark {
                margin-left: 30%;
            }
        }

        @media (max-width: 767px) {
            /* Styles for small screens */
            .col-span-4,
            div.col-span-8,
            .rounded-full.md\\:p-sm.bg-offset.dark\\:bg-offsetDark {
                margin-left: 0;
                max-width: 100%;
                width: 100%;
            }
        }

        /* General styles */
        .items-center.flex.w-full.outline-none.focus\\:outline-none.focus\\:ring-borderMain.font-sans.flex.items-center.dark\\:bg-offsetDark.dark\\:text-textMainDark.dark\\:placeholder-textOffDark.dark\\:border-borderMainDark.dark\\:focus\\:ring-borderMainDark.selection\\:bg-superDuper.selection\\:text-textMain.duration-200.transition-all.bg-background.border.text-textMain.border-borderMain.focus\\:ring-1.placeholder-textOff.shadow-sm.rounded-t-\\[32px\\].rounded-b-\\[32px\\].py-sm.px-sm {
            display: flex;
            flex-wrap: wrap;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem;
        }

        /* Text area */
        .flex-grow.flex-shrink.p-sm.order-1.overflow-auto.max-h-\\[45vh\\].outline-none.w-full.font-sans.caret-superDuper.resize-none.selection\\:bg-superDuper.selection\\:text-textMain.dark\\:bg-offsetDark.dark\\:text-textMainDark.dark\\:placeholder-textOffDark.bg-background.text-textMain.placeholder-textOff {
            flex: 1 1 100%;
            max-height: 45vh;
            margin-bottom: 0.5rem;
        }

        @media (min-width: 768px) {
            .flex-grow.flex-shrink.p-sm.order-1.overflow-auto.max-h-\\[45vh\\].outline-none.w-full.font-sans.caret-superDuper.resize-none.selection\\:bg-superDuper.selection\\:text-textMain.dark\\:bg-offsetDark.dark\\:text-textMainDark.dark\\:placeholder-textOffDark.bg-background.text-textMain.placeholder-textOff {
                flex: 1 1 70%;
                margin-bottom: 0;
            }
        }

        /* Container for the add file button */
        .bg-background.dark\\:bg-offsetDark.flex.rounded-l-lg.order-0 {
            order: 2;
            margin-left: 0.5rem;
        }

        @media (min-width: 768px) {
            .bg-background.dark\\:bg-offsetDark.flex.rounded-l-lg.order-0 {
                order: 0;
                margin-left: 0;
            }
        }

        /* Container for the toggle switch and submit button */
        .bg-background.dark\\:bg-offsetDark.flex.items-center.space-x-2.justify-self-end.rounded-full.order-2 {
            order: 3;
            margin-top: 0.5rem;
        }

        @media (min-width: 768px) {
            .bg-background.dark\\:bg-offsetDark.flex.items-center.space-x-2.justify-self-end.rounded-full.order-2 {
                order: 2;
                margin-top: 0;
            }
        }

        .sticky.top-\\[68px\\].mt-lg.max-h-\\[90vh\\].border-borderMain\\/50.ring-borderMain\\/50.divide-borderMain\\/50.dark\\:divide-borderMainDark\\/50.dark\\:ring-borderMainDark\\/50.dark\\:border-borderMainDark\\/50.bg-transparent {
            position: sticky;
            top: 68px;
            margin-top: 1rem;
            max-height: 90vh;
            border: 1px solid rgba(var(--border-main), 0.5);
            ring: 1px solid rgba(var(--border-main-dark), 0.5);
            divide: 1px solid rgba(var(--border-main-dark), 0.5);
            background-color: transparent;
        }

        .mb-sm.grid.grid-cols-1.gap-sm.lg\\:grid-cols-2 {
            margin-bottom: 0.5rem;
            grid-template-columns: repeat(1, minmax(0, 1fr));
            gap: 0.5rem;
            max-width: 100%;
        }

        @media (min-width: 1024px) {
            .mb-sm.grid.grid-cols-1.gap-sm.lg\\:grid-cols-2 {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }
        }

        .mb-sm.w-full.select-none.rounded-md.border.border-dashed.px-md.py-sm.cursor-pointer.border-borderMain\\/50.ring-borderMain\\/50.divide-borderMain\\/50.dark\\:divide-borderMainDark\\/50.dark\\:ring-borderMainDark\\/50.dark\\:border-borderMainDark\\/50.transition.duration-300.bg-transparent.md\\:hover\\:bg-offset.md\\:dark\\:hover\\:bg-offsetDark {
            margin-bottom: 0.5rem;
            width: 100%;
            user-select: none;
            border-radius: 0.375rem;
            border: 1px dashed rgba(var(--border-main), 0.5);
            padding: 0.75rem 1rem;
            cursor: pointer;
            transition-duration: 300ms;
            background-color: transparent;
        }

        @media (min-width: 768px) {
            .mb-sm.w-full.select-none.rounded-md.border.border-dashed.px-md.py-sm.cursor-pointer.border-borderMain\\/50.ring-borderMain\\/50.divide-borderMain\\/50.dark\\:divide-borderMainDark\\/50.dark\\:ring-borderMainDark\\/50.dark\\:border-borderMainDark\\/50.transition.duration-300.bg-transparent.md\\:hover\\:bg-offset.md\\:dark\\:hover\\:bg-offsetDark {
                width: 70%;
                margin-left: 15%;
            }
        }
    `;

    // Create a new style element and append the custom styles
    const style = document.createElement('style');
    style.textContent = customStyles;
    document.head.appendChild(style);
})();