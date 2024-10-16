# Close Ads

This user script automatically closes ads on LookMovie, removes specific reCAPTCHA divs except on the threat protection page, and removes banner ads.

## Installation

1. Install a user script manager in your browser, such as Tampermonkey.
2. Create a new script in Tampermonkey and paste the provided script into the editor.
3. Save the script.

## Features

- Automatically closes ads on LookMovie.
- Removes specific reCAPTCHA divs except on the threat protection page.
- Removes banner ads.
- Configurable maximum attempts to close ads.
- Continuous checking for ads.
- Debounced ad handling to improve performance.

## Usage

- The script will automatically close ads if the corresponding settings are enabled.
- You can configure the maximum attempts and continuous checking in the script.

## Configuration

- `closePlayerAdSelector`: CSS selector for the close button of the ads.
- `IPreferAdsSelector`: CSS selector for the "I Prefer Ads" button.
- `notifyButtonSelector`: CSS selector for the notify button.
- `maxAttempts`: Maximum number of attempts to close ads.
- `continuousCheck`: Whether to continuously check for ads.
- `debounceTime`: Time in milliseconds to debounce the ad handling function.
- `threatProtectionUrl`: URL of the threat protection page where reCAPTCHA div should not be removed.

## Author

JJJ

## Version

0.6.1

## License

This project is licensed under the [MIT License](https://choosealicense.com/licenses/mit/).

![LookMovie Icon](https://www.google.com/s2/favicons?sz=64&domain=lookmovie2.to)