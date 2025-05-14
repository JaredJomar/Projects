// ==UserScript==
// @name         InstaHop 
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @description  Switch Instagram accounts with improved UI + Account management (add, edit, delete)
// @author       JJJ
// @match        https://*.instagram.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=instagram.com
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_log
// ==/UserScript==

; (() => {
    // Set up logging
    const DEBUG_MODE = true;

    function log(...args) {
        if (DEBUG_MODE) {
            console.log("[InstaHop]", ...args);
            // Some browsers may support this in Tampermonkey
            try {
                GM_log("[InstaHop]", ...args);
            } catch (e) { }
        }
    }

    log("InstaHop initialized");

    // Add CSS styles
    const GM_addStyle = (css) => {
        const style = document.createElement("style")
        style.textContent = css
        document.head.append(style)
    }

    const GM_setValue = (key, value) => {
        localStorage.setItem(key, JSON.stringify(value))
    }

    const GM_getValue = (key, defaultValue) => {
        const storedValue = localStorage.getItem(key)
        return storedValue ? JSON.parse(storedValue) : defaultValue
    }

    GM_addStyle(`
          #instahop-ui {
              position: fixed;
              top: 70px;
              right: 20px;
              z-index: 9999;
          }
  
          #instahop-button {
              background-color: #0095f6;
              color: white;
              border: none;
              border-radius: 8px;
              padding: 8px 12px;
              font-weight: bold;
              cursor: pointer;
              display: flex;
              align-items: center;
              gap: 6px;
              box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          }
  
          #instahop-dropdown {
              display: none;
              margin-top: 5px;
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.2);
              padding: 5px 0;
              overflow: hidden;
          }
  
          .instahop-item {
              padding: 8px 15px;
              cursor: pointer;
              display: flex;
              align-items: center;
              gap: 8px;
          }
  
          .instahop-item:hover {
              background-color: #f9f9f9;
          }
  
          .instahop-separator {
              border-top: 1px solid #eee;
              margin: 5px 0;
          }
  
          .instahop-manage {
              padding: 8px 15px;
              cursor: pointer;
              color: #0095f6;
              font-weight: bold;
              display: flex;
              align-items: center;
              gap: 8px;
          }
  
          #instahop-modal {
              position: fixed;
              top: 10%;
              left: 50%;
              transform: translateX(-50%);
              width: 400px;
              background: white;
              border-radius: 12px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.25);
              z-index: 10001;
              overflow: hidden;
          }
  
          #instahop-modal-header {
              padding: 16px 20px;
              border-bottom: 1px solid #eee;
              font-size: 18px;
              font-weight: 600;
          }
  
          #instahop-account-list {
              max-height: 300px;
              overflow-y: auto;
          }
  
          .instahop-account-item {
              padding: 12px 20px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 1px solid #f0f0f0;
          }
  
          .instahop-account-item:hover {
              background-color: #f9f9f9;
          }
  
          .instahop-account-info {
              display: flex;
              align-items: center;
              gap: 10px;
          }
  
          .instahop-avatar {
              width: 36px;
              height: 36px;
              border-radius: 50%;
              background-color: #f0f0f0;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #666;
              font-weight: bold;
          }
  
          .instahop-account-text {
              display: flex;
              flex-direction: column;
          }
  
          .instahop-account-name {
              font-weight: 600;
          }
  
          .instahop-account-username {
              font-size: 13px;
              color: #666;
          }
  
          .instahop-account-actions {
              display: flex;
              gap: 8px;
          }
  
          .instahop-btn-edit {
              background-color: #f0f0f0;
              border: none;
              border-radius: 4px;
              width: 30px;
              height: 30px;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
          }
  
          .instahop-btn-edit:hover {
              background-color: #e0e0e0;
          }
  
          .instahop-btn-delete {
              background-color: #ffefef;
              color: #e41e3f;
              border: none;
              border-radius: 4px;
              width: 30px;
              height: 30px;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
          }
  
          .instahop-btn-delete:hover {
              background-color: #ffd7d7;
          }
  
          #instahop-form {
              padding: 16px 20px;
              border-top: 1px solid #eee;
          }
  
          #instahop-form h4 {
              margin-top: 0;
              margin-bottom: 12px;
              font-size: 15px;
              font-weight: 600;
          }
  
          .instahop-input-group {
              position: relative;
              margin-bottom: 12px;
          }
  
          .instahop-input-icon {
              position: absolute;
              left: 10px;
              top: 50%;
              transform: translateY(-50%);
              color: #666;
          }
  
          .instahop-input {
              width: 100%;
              padding: 10px 10px 10px 35px;
              border: 1px solid #ddd;
              border-radius: 6px;
              font-size: 14px;
              box-sizing: border-box;
          }
  
          .instahop-input:focus {
              border-color: #0095f6;
              outline: none;
          }
  
          #instahop-modal-footer {
              padding: 16px 20px;
              display: flex;
              flex-direction: column;
              gap: 8px;
          }
  
          .instahop-btn-save {
              background-color: #0095f6;
              color: white;
              border: none;
              border-radius: 6px;
              padding: 10px;
              font-weight: bold;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
          }
  
          .instahop-btn-save:hover {
              background-color: #0085e0;
          }
  
          .instahop-btn-close {
              background-color: #f0f0f0;
              color: #333;
              border: none;
              border-radius: 6px;
              padding: 10px;
              font-weight: bold;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
          }
  
          .instahop-btn-close:hover {
              background-color: #e0e0e0;
          }
  
          #instahop-notice {
              position: fixed;
              bottom: 20px;
              right: 20px;
              background: #0095f6;
              color: white;
              padding: 10px 15px;
              border-radius: 8px;
              font-weight: bold;
              z-index: 10000;
              box-shadow: 0 2px 8px rgba(0,0,0,0.2);
              opacity: 0;
              transition: opacity 0.3s;
          }
      `)

    // Default accounts
    const defaultAccounts = [
        { username: "_jared0mar", displayName: "Personal", password: "password1", usePassword: true },
        { username: "__jared__j", displayName: "JC", password: "password2", usePassword: true },
        { username: "_kira_light", displayName: "Kira", password: "password3", usePassword: true },
    ]

    const accounts = GM_getValue("instahop_accounts", defaultAccounts)
    let editingIndex = -1 // -1 means adding new, >=0 means editing existing

    function saveAccounts() {
        GM_setValue("instahop_accounts", accounts)
    }

    function showNotification(message) {
        const existing = document.querySelector("#instahop-notice")
        if (existing) existing.remove()

        const div = document.createElement("div")
        div.id = "instahop-notice"
        div.textContent = message
        document.body.appendChild(div)
        setTimeout(() => (div.style.opacity = 1), 10)
        setTimeout(() => {
            div.style.opacity = 0
            setTimeout(() => div.remove(), 300)
        }, 3000)
    }

    function getCurrentUsername() {
        const profile = document.querySelector('a[href^="/"][href$="/"]')
        return profile ? profile.getAttribute("href").slice(1, -1) : null
    }

    function clickSwitchButton() {
        log("Looking for switch button")
        const buttons = document.querySelectorAll('div[role="button"][tabindex="0"]')
        log(`Found ${buttons.length} potential button candidates`)

        for (const btn of buttons) {
            const text = btn.textContent?.trim().toLowerCase()
            log(`Checking button text: "${text}"`)
            if (text === "switch" || text === "cambiar") {
                log("Switch button found, clicking")
                btn.click()
                return true
            }
        }
        log("No switch button found")
        return false
    }

    function fillLoginForm(username) {
        const account = accounts.find((acc) => acc.username.toLowerCase() === username.toLowerCase())
        if (!account) {
            log(`Account ${username} not found in your accounts`)
            showNotification(`Account ${username} not found in your accounts`)
            return
        }

        log(`Starting login process for ${username}`)

        // Function to find inputs with multiple strategies
        const findInputs = () => {
            // Try multiple selectors for username input
            const userInputSelectors = [
                'input[name="username"]',
                '._aa4b[aria-label="Phone number, username, or email"]',
                '._aa4b._add6._ac4d._ap35[aria-label="Phone number, username, or email"]',
                'input[aria-label="Phone number, username, or email"]',
                'input[autocorrect="off"][maxlength="75"]'
            ]

            // Try multiple selectors for password input  
            const passInputSelectors = [
                'input[name="password"]',
                '._aa4b[aria-label="Password"]',
                '._aa4b._add6._ac4d._ap35[aria-label="Password"]',
                'input[aria-label="Password"]',
                'input[type="password"]'
            ]

            // Try multiple selectors for login button
            const loginBtnSelectors = [
                'button[type="submit"]',
                '._acan._acap._acas',
                'button._acan._acap._acas',
                'form button'
            ]

            let userInput = null
            let passInput = null
            let loginBtn = null

            // Try each selector until we find a match
            for (const selector of userInputSelectors) {
                log(`Looking for username input with selector: ${selector}`)
                userInput = document.querySelector(selector)
                if (userInput) {
                    log(`Found username input with selector: ${selector}`)
                    break
                }
            }

            for (const selector of passInputSelectors) {
                log(`Looking for password input with selector: ${selector}`)
                passInput = document.querySelector(selector)
                if (passInput) {
                    log(`Found password input with selector: ${selector}`)
                    break
                }
            }

            for (const selector of loginBtnSelectors) {
                log(`Looking for login button with selector: ${selector}`)
                loginBtn = document.querySelector(selector)
                if (loginBtn) {
                    log(`Found login button with selector: ${selector}`)
                    break
                }
            }

            return { userInput, passInput, loginBtn }
        }

        // Get the form elements
        const { userInput, passInput, loginBtn } = findInputs()

        // Debug info
        log("Form elements search results:", {
            userInput: userInput ? `Found: ${userInput.outerHTML.slice(0, 100)}...` : "Not found",
            passInput: passInput ? `Found: ${passInput.outerHTML.slice(0, 100)}...` : "Not found",
            loginBtn: loginBtn ? `Found: ${loginBtn.outerHTML.slice(0, 100)}...` : "Not found"
        })

        if (userInput && passInput) {
            log(`Attempting to fill login form for ${username}`)

            // Method 1: Direct property assignment
            log("Method 1: Direct property assignment")
            userInput.value = account.username
            passInput.value = account.password
            log(`After direct assignment - username value: "${userInput.value}", password set: ${passInput.value.length > 0}`)

            // Method 2: Focus and input simulation
            log("Method 2: Focus and input simulation")
            userInput.focus()
            userInput.select()

            // Method 3: InputEvent simulation (modern approach)
            log("Method 3: InputEvent simulation")
            const inputEvent = new InputEvent('input', { bubbles: true })
            const changeEvent = new Event('change', { bubbles: true })

            // Apply to username field
            userInput.dispatchEvent(inputEvent)
            userInput.dispatchEvent(changeEvent)

            // Apply to password field
            passInput.focus()
            passInput.dispatchEvent(inputEvent)
            passInput.dispatchEvent(changeEvent)
            log(`After events - username value: "${userInput.value}", password set: ${passInput.value.length > 0}`)

            // Double-check the values were actually set
            if (userInput.value !== account.username) {
                log(`Username wasn't set correctly, trying execCommand method`)
                // Try using execCommand for older browsers
                userInput.select()
                document.execCommand('insertText', false, account.username)
                log(`After execCommand - username value: "${userInput.value}"`)
            }

            if (passInput.value !== account.password) {
                log(`Password wasn't set correctly, trying execCommand method`)
                passInput.select()
                document.execCommand('insertText', false, account.password)
                log(`After execCommand - password set: ${passInput.value.length > 0}`)
            }

            // Enable login button if it exists and is disabled
            if (loginBtn) {
                log(`Enabling login button - current disabled state: ${loginBtn.disabled}`)
                loginBtn.disabled = false
                loginBtn.removeAttribute('disabled')

                // For React-based components, we need to manually trigger property changes
                if ('__reactProps$' in loginBtn) {
                    log(`Found React component properties, attempting to modify them`)
                    const propKey = Object.keys(loginBtn).find(key => key.startsWith('__reactProps$'))
                    if (propKey && loginBtn[propKey].disabled) {
                        log(`Modifying React prop '${propKey}' disabled state`)
                        loginBtn[propKey].disabled = false
                    }
                }

                // Give it time to process events and update button state
                setTimeout(() => {
                    log(`Button check after delay - disabled state: ${loginBtn.disabled}`)
                    // Check if button is still disabled
                    if (loginBtn.disabled) {
                        log(`Button still disabled, applying CSS forcing techniques`)
                        showNotification("Login button is still disabled, trying alternative methods")

                        // Force button to be clickable with CSS
                        loginBtn.style.pointerEvents = "auto"
                        loginBtn.style.opacity = "1"
                        loginBtn.style.cursor = "pointer"

                        setTimeout(() => {
                            log(`Attempting to click button via force methods`)
                            loginBtn.click()
                            showNotification(`Logging in as @${account.username}...`)
                        }, 300)
                    } else {
                        // Button is enabled, click it
                        log(`Button is enabled, clicking normally`)
                        loginBtn.click()
                        showNotification(`Logging in as @${account.username}...`)
                    }
                }, 500)
            } else {
                log(`Login button not found after input fill`)
                showNotification("Login button not found")
            }
        } else {
            log(`Standard input selectors failed, trying alternative approaches`)
            // If we can't find the inputs, try another approach
            try {
                // Maybe it's in a different form structure - try looking within a form
                const form = document.querySelector('form')
                if (form) {
                    log(`Found a form element, examining contents`)
                    const inputs = form.querySelectorAll('input')
                    const buttons = form.querySelectorAll('button')

                    log(`Form contains ${inputs.length} inputs and ${buttons.length} buttons`)

                    if (inputs.length >= 2 && buttons.length > 0) {
                        log(`Using fallback approach with first 2 inputs in form`)
                        // Assume first input is username, second is password
                        const userInput = inputs[0]
                        const passInput = inputs[1]
                        const submitBtn = Array.from(buttons).find(btn =>
                            btn.type === "submit" ||
                            btn.textContent.toLowerCase().includes("log in") ||
                            btn.textContent.toLowerCase().includes("login")
                        )

                        log(`Fallback - First input: ${userInput.outerHTML.slice(0, 100)}`)
                        log(`Fallback - Second input: ${passInput.outerHTML.slice(0, 100)}`)
                        if (submitBtn) {
                            log(`Fallback - Found submit button: ${submitBtn.outerHTML.slice(0, 100)}`)
                        }

                        userInput.value = account.username
                        passInput.value = account.password

                            // Trigger events
                            ;["input", "change", "focus", "blur"].forEach(evt => {
                                userInput.dispatchEvent(new Event(evt, { bubbles: true }))
                                passInput.dispatchEvent(new Event(evt, { bubbles: true }))
                            })

                        if (submitBtn) {
                            submitBtn.disabled = false
                            submitBtn.removeAttribute('disabled')
                            setTimeout(() => {
                                log(`Clicking submit button with fallback approach`)
                                submitBtn.click()
                                showNotification(`Attempting login as @${account.username}...`)
                            }, 500)
                            return
                        }
                    }
                } else {
                    log(`No form element found for fallback approach`)
                }

                log(`All login form detection strategies failed`)
                showNotification("Couldn't find login form elements")
            } catch (error) {
                log(`Error during login attempt:`, error)
                console.error("InstaHop: Error during login attempt:", error)
                showNotification("Error attempting to login")
            }
        }
    }

    function switchToAccount(username) {
        const current = getCurrentUsername()
        log(`Switching to account: ${username}, current user: ${current}`)
        log(`Current path: ${window.location.pathname}`)

        if (window.location.pathname.startsWith("/accounts/login")) {
            log("On login page, attempting to fill login form")
            fillLoginForm(username)
        } else if (window.location.pathname === "/") {
            if (current?.toLowerCase() === username.toLowerCase()) {
                log("Already logged in as requested user")
                showNotification(`Already @${username}`)
            } else if (!clickSwitchButton()) {
                log("Switch button not found on homepage")
                showNotification("Switch button not found.")
            } else {
                log("Clicked switch button, initiating account switch")
                showNotification(`Switching to @${username}...`)
            }
        } else {
            log("Not on login page or homepage, redirecting to homepage")
            showNotification("Redirecting to homepage...")
            GM_setValue("instahop_target_username", username)
            window.location.href = "https://www.instagram.com/"
        }
    }

    function createSVGIcon(path, viewBox = "0 0 24 24") {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
        svg.setAttribute("width", "16")
        svg.setAttribute("height", "16")
        svg.setAttribute("viewBox", viewBox)
        svg.setAttribute("fill", "none")
        svg.setAttribute("stroke", "currentColor")
        svg.setAttribute("stroke-width", "2")
        svg.setAttribute("stroke-linecap", "round")
        svg.setAttribute("stroke-linejoin", "round")

        const pathElement = document.createElementNS("http://www.w3.org/2000/svg", "path")
        pathElement.setAttribute("d", path)
        svg.appendChild(pathElement)

        return svg
    }

    function openAccountManager() {
        // Remove existing modal if any
        const existingModal = document.querySelector("#instahop-modal")
        if (existingModal) existingModal.remove()

        // Create modal container
        const modal = document.createElement("div")
        modal.id = "instahop-modal"

        // Create header
        const header = document.createElement("div")
        header.id = "instahop-modal-header"
        header.textContent = "Manage Accounts"
        modal.appendChild(header)

        // Create account list
        const accountList = document.createElement("div")
        accountList.id = "instahop-account-list"
        modal.appendChild(accountList)

        // Populate account list
        accounts.forEach((acc, index) => {
            const accountItem = document.createElement("div")
            accountItem.className = "instahop-account-item"

            // Account info
            const accountInfo = document.createElement("div")
            accountInfo.className = "instahop-account-info"

            const avatar = document.createElement("div")
            avatar.className = "instahop-avatar"
            avatar.textContent = acc.displayName.charAt(0).toUpperCase()
            accountInfo.appendChild(avatar)

            const accountText = document.createElement("div")
            accountText.className = "instahop-account-text"

            const accountName = document.createElement("div")
            accountName.className = "instahop-account-name"
            accountName.textContent = acc.displayName
            accountText.appendChild(accountName)

            const accountUsername = document.createElement("div")
            accountUsername.className = "instahop-account-username"
            accountUsername.textContent = `@${acc.username}`
            accountText.appendChild(accountUsername)

            accountInfo.appendChild(accountText)
            accountItem.appendChild(accountInfo)

            // Account actions
            const accountActions = document.createElement("div")
            accountActions.className = "instahop-account-actions"

            const editButton = document.createElement("button")
            editButton.className = "instahop-btn-edit"
            editButton.title = "Edit account"
            editButton.appendChild(
                createSVGIcon(
                    "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
                ),
            )
            editButton.onclick = () => {
                editingIndex = index
                document.getElementById("acc-username").value = acc.username
                document.getElementById("acc-display").value = acc.displayName
                document.getElementById("acc-password").value = acc.password
                document.getElementById("instahop-form-title").textContent = "Edit Account"
                document.getElementById("instahop-save-btn").textContent = "Update"
            }
            accountActions.appendChild(editButton)

            const deleteButton = document.createElement("button")
            deleteButton.className = "instahop-btn-delete"
            deleteButton.title = "Delete account"
            deleteButton.appendChild(
                createSVGIcon(
                    "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
                ),
            )
            deleteButton.onclick = () => {
                if (confirm(`Delete account @${acc.username}?`)) {
                    accounts.splice(index, 1)
                    saveAccounts()
                    openAccountManager() // Refresh the modal
                    showNotification("Account deleted")
                }
            }
            accountActions.appendChild(deleteButton)

            accountItem.appendChild(accountActions)
            accountList.appendChild(accountItem)
        })

        // Create form
        const form = document.createElement("div")
        form.id = "instahop-form"

        const formTitle = document.createElement("h4")
        formTitle.id = "instahop-form-title"
        formTitle.textContent = "Add New Account"
        form.appendChild(formTitle)

        // Username input
        const usernameGroup = document.createElement("div")
        usernameGroup.className = "instahop-input-group"

        const usernameIcon = document.createElement("div")
        usernameIcon.className = "instahop-input-icon"
        usernameIcon.appendChild(
            createSVGIcon("M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"),
        )
        usernameGroup.appendChild(usernameIcon)

        const usernameInput = document.createElement("input")
        usernameInput.id = "acc-username"
        usernameInput.className = "instahop-input"
        usernameInput.placeholder = "Username"
        usernameGroup.appendChild(usernameInput)

        form.appendChild(usernameGroup)

        // Display name input
        const displayGroup = document.createElement("div")
        displayGroup.className = "instahop-input-group"

        const displayIcon = document.createElement("div")
        displayIcon.className = "instahop-input-icon"
        displayIcon.appendChild(
            createSVGIcon("M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"),
        )
        displayGroup.appendChild(displayIcon)

        const displayInput = document.createElement("input")
        displayInput.id = "acc-display"
        displayInput.className = "instahop-input"
        displayInput.placeholder = "Display Name"
        displayGroup.appendChild(displayInput)

        form.appendChild(displayGroup)

        // Password input
        const passwordGroup = document.createElement("div")
        passwordGroup.className = "instahop-input-group"

        const passwordIcon = document.createElement("div")
        passwordIcon.className = "instahop-input-icon"
        passwordIcon.appendChild(
            createSVGIcon(
                "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
            ),
        )
        passwordGroup.appendChild(passwordIcon)

        const passwordInput = document.createElement("input")
        passwordInput.id = "acc-password"
        passwordInput.className = "instahop-input"
        passwordInput.type = "password"
        passwordInput.placeholder = "Password"
        passwordGroup.appendChild(passwordInput)

        form.appendChild(passwordGroup)

        modal.appendChild(form)

        // Create footer with buttons
        const footer = document.createElement("div")
        footer.id = "instahop-modal-footer"

        const saveButton = document.createElement("button")
        saveButton.id = "instahop-save-btn"
        saveButton.className = "instahop-btn-save"
        saveButton.textContent = "Save"
        saveButton.appendChild(
            createSVGIcon("M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z M17 21v-8H7v8 M7 3v5h8"),
        )
        saveButton.onclick = () => {
            const username = document.getElementById("acc-username").value.trim()
            const displayName = document.getElementById("acc-display").value.trim()
            const password = document.getElementById("acc-password").value

            if (!username || !password) {
                alert("Username and password are required.")
                return
            }

            if (editingIndex >= 0) {
                // Update existing account
                accounts[editingIndex] = {
                    username,
                    displayName: displayName || username,
                    password,
                    usePassword: true,
                }
                showNotification("Account updated")
            } else {
                // Add new account
                accounts.push({
                    username,
                    displayName: displayName || username,
                    password,
                    usePassword: true,
                })
                showNotification("Account added")
            }

            saveAccounts()
            openAccountManager() // Refresh the modal
            editingIndex = -1 // Reset editing state
        }
        footer.appendChild(saveButton)

        const closeButton = document.createElement("button")
        closeButton.className = "instahop-btn-close"
        closeButton.textContent = "Close"
        closeButton.appendChild(createSVGIcon("M18 6L6 18M6 6l12 12"))
        closeButton.onclick = () => {
            modal.remove()
            editingIndex = -1 // Reset editing state
        }
        footer.appendChild(closeButton)

        modal.appendChild(footer)

        // Add modal to body
        document.body.appendChild(modal)
    }

    function createUI() {
        const existing = document.querySelector("#instahop-ui")
        if (existing) existing.remove()

        const container = document.createElement("div")
        container.id = "instahop-ui"

        const button = document.createElement("button")
        button.id = "instahop-button"
        button.innerHTML = "Switch Account"

        // Add icon to button
        button.prepend(
            createSVGIcon("M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"),
        )

        const dropdown = document.createElement("div")
        dropdown.id = "instahop-dropdown"

        button.onclick = () => {
            dropdown.style.display = dropdown.style.display === "none" ? "block" : "none"
            dropdown.innerHTML = ""

            // Add account items
            accounts.forEach((acc) => {
                const item = document.createElement("div")
                item.className = "instahop-item"

                const avatar = document.createElement("div")
                avatar.className = "instahop-avatar"
                avatar.style.width = "24px"
                avatar.style.height = "24px"
                avatar.style.fontSize = "12px"
                avatar.textContent = acc.displayName.charAt(0).toUpperCase()
                item.appendChild(avatar)

                const text = document.createElement("span")
                text.textContent = acc.displayName || acc.username
                item.appendChild(text)

                item.onclick = () => {
                    dropdown.style.display = "none"
                    switchToAccount(acc.username)
                }
                dropdown.appendChild(item)
            })

            // Add separator
            const separator = document.createElement("div")
            separator.className = "instahop-separator"
            dropdown.appendChild(separator)

            // Add manage button
            const manageItem = document.createElement("div")
            manageItem.className = "instahop-manage"
            manageItem.appendChild(
                createSVGIcon(
                    "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
                ),
            )
            const manageText = document.createElement("span")
            manageText.textContent = "Manage Accounts"
            manageItem.appendChild(manageText)

            manageItem.onclick = () => {
                dropdown.style.display = "none"
                openAccountManager()
            }
            dropdown.appendChild(manageItem)
        }

        container.appendChild(button)
        container.appendChild(dropdown)
        document.body.appendChild(container)
    }

    // Check if we need to auto-login
    function checkAutoLogin() {
        if (window.location.pathname === "/" || window.location.pathname.startsWith("/accounts/login")) {
            const targetUsername = GM_getValue("instahop_target_username", null)
            if (targetUsername) {
                GM_setValue("instahop_target_username", null) // Clear it
                switchToAccount(targetUsername)
            }
        }
    }

    // Initialize
    function init() {
        createUI()
        checkAutoLogin()
    }

    // Run on page load and when URL changes
    window.addEventListener("load", init)

    // Check for URL changes (Instagram is a SPA)
    let lastUrl = location.href
    new MutationObserver(() => {
        const url = location.href
        if (url !== lastUrl) {
            lastUrl = url
            init()
        }
    }).observe(document, { subtree: true, childList: true })

    // Initial run
    init()
})()