# Auto Click "I'm not a robot"

This user script automatically clicks the "I'm not a robot" checkbox on various captcha systems.

## Installation

1. Install a user script manager in your browser, such as Tampermonkey.
2. Create a new script in Tampermonkey and paste the provided script into the editor.
3. Save the script.

## Features

- Automatically clicks the "I'm not a robot" checkbox on reCaptcha V2, reCaptcha V2 Enterprise, and hCaptcha.
- Uses MutationObserver to detect changes in the DOM and solve captchas dynamically.
- Periodically attempts to solve captchas every second.
- Compatibility check for supported browsers (Chrome, Edge, Brave, Firefox).

## Usage

- The script will automatically click the "I'm not a robot" checkbox if it is visible and not already checked.
- The script uses a MutationObserver to detect changes in the DOM and solve captchas dynamically.
- The script periodically attempts to solve captchas every second.

## Author

JJJ

## Version

0.9

## License

This project is licensed under the [MIT License](https://choosealicense.com/licenses/mit/).

![Robot Icon](https://pngimg.com/uploads/robot/robot_PNG96.png)