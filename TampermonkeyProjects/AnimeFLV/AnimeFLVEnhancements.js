// ==UserScript==
// @name         AnimeFLV Enhancements
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Select video provider option automatically and add a Page Up button to scroll to the top of the page.
// @author       JJJ
// @match        https://www3.animeflv.net/ver/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=animeflv.net
// @grant        GM_addStyle
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    // Constants
    const CLASS_SELECTOR = '.CapiTnv.nav.nav-pills > li';
    const STORAGE_KEY = 'selectedOption';

    // CSS styles for the custom menu and Page Up button
    const menuStyles = `
        #customMenu {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: white;
            border: 1px solid black;
            padding: 10px;
            z-index: 9999;
        }

        .button-85 {
            padding: 0.6em 2em;
            border: none;
            outline: none;
            color: rgb(255, 255, 255);
            background: #111;
            cursor: pointer;
            position: fixed;
            bottom: 20px;
            right: 100px;
            z-index: 9999;
            border-radius: 10px;
            user-select: none;
            -webkit-user-select: none;
            touch-action: manipulation;
            display: none;
        }

        .button-85:before {
            content: "";
            background: linear-gradient(
                45deg,
                #ff0000,
                #ff7300,
                #fffb00,
                #48ff00,
                #00ffd5,
                #002bff,
                #7a00ff,
                #ff00c8,
                #ff0000
            );
            position: absolute;
            top: -2px;
            left: -2px;
            background-size: 400%;
            z-index: -1;
            filter: blur(5px);
            -webkit-filter: blur(5px);
            width: calc(100% + 4px);
            height: calc(100% + 4px);
            animation: glowing-button-85 20s linear infinite;
            transition: opacity 0.3s ease-in-out;
            border-radius: 10px;
        }

        @keyframes glowing-button-85 {
            0% {
                background-position: 0 0;
            }
            50% {
                background-position: 400% 0;
            }
            100% {
                background-position: 0 0;
            }
        }

        .button-85:after {
            z-index: -1;
            content: "";
            position: absolute;
            width: 100%;
            height: 100%;
            background: #222;
            left: 0;
            top: 0;
            border-radius: 10px;
        }
    `;

    // Function to create the dropdown menu
    function createDropdownMenu(options) {
        const dropdownMenu = document.createElement('select');
        dropdownMenu.id = 'optionDropdown';

        options.forEach((option) => {
            const dropdownOption = document.createElement('option');
            dropdownOption.value = option.getAttribute('title') || option.textContent.trim();
            dropdownOption.textContent = option.getAttribute('title') || option.textContent.trim();
            dropdownMenu.appendChild(dropdownOption);
        });

        return dropdownMenu;
    }

    // Function to toggle the menu visibility
    function toggleMenu() {
        console.log('toggleMenu called');
        const menu = document.getElementById('customMenu');
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    }

    // Function to handle option selection
    function handleOptionSelection() {
        const selectedOptionValue = document.getElementById('optionDropdown').value;
        const options = document.querySelectorAll(CLASS_SELECTOR);

        options.forEach((option) => {
            if ((option.getAttribute('title') || option.textContent.trim()) === selectedOptionValue) {
                option.click();
                localStorage.setItem(STORAGE_KEY, selectedOptionValue);
                toggleMenu();
            }
        });
    }

    // Function to create the custom menu
    function createCustomMenu() {
        const options = document.querySelectorAll(CLASS_SELECTOR);
        console.log('Options found:', options.length);

        const dropdownMenu = createDropdownMenu(options);
        const selectedOptionValue = localStorage.getItem(STORAGE_KEY);
        if (selectedOptionValue !== null) {
            dropdownMenu.value = selectedOptionValue;
        }

        const confirmButton = document.createElement('button');
        confirmButton.textContent = 'Confirm';
        confirmButton.addEventListener('click', handleOptionSelection);

        const customMenu = document.createElement('div');
        customMenu.id = 'customMenu';
        customMenu.style.display = 'none';
        customMenu.appendChild(dropdownMenu);
        customMenu.appendChild(confirmButton);

        document.body.appendChild(customMenu);
        console.log('Custom menu created');
    }

    // Function to automatically select the saved option
    function autoSelectOption() {
        const selectedOptionValue = localStorage.getItem(STORAGE_KEY);
        if (selectedOptionValue !== null) {
            const options = document.querySelectorAll(CLASS_SELECTOR);
            options.forEach((option) => {
                if ((option.getAttribute('title') || option.textContent.trim()) === selectedOptionValue) {
                    option.click();
                }
            });
        }
    }

    // Function to create the Page Up button
    function createPageUpButton() {
        const button = document.createElement("button");
        button.innerHTML = "Page Up";
        button.className = "button-85";
        button.addEventListener("click", function () {
            window.scrollTo(0, 0);
        });

        document.body.appendChild(button);
    }

    // Function to toggle the Page Up button visibility
    function togglePageUpButton() {
        const button = document.querySelector('.button-85');
        if (button) {
            button.style.display = window.scrollY > 0 ? 'block' : 'none';
        }
    }

    // Function to initialize the script
    function init() {
        GM_addStyle(menuStyles);
        createCustomMenu();
        createPageUpButton();

        document.addEventListener('keydown', function (event) {
            if (event.key === 'F2') {
                console.log('F2 key pressed');
                toggleMenu();
            }
        });

        window.addEventListener('scroll', togglePageUpButton);

        setTimeout(autoSelectOption, 100); // Delay execution to allow page load
    }

    // Run the script
    init();
})();