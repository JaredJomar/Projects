@echo off
setlocal

REM Set the directory path to the desktop
set "directory=%userprofile%\Desktop"

REM Navigate to the desktop directory
cd "%directory%"

REM Prompt for the link to input
set /p link="Enter the link: "

:: Save the parameters
:: -e "Enter the email address"
set "Email= -e Enter your Archive.org email address"
:: -p "Enter the password"
set "Password= -p Enter your Archive.org password"
:: -r 0 "Image resolution (10 to 0, 0 is the highest), [default 3]"
set "imageResolution= -r 3"
:: -u "Enter the link"
set "enterUrl= -u %link%"

REM Run the Python script with arguments
python archive-org-downloader.py %Email% %Password% %imageResolution% %enterUrl%

REM Check if the Python script ran without errors
IF ERRORLEVEL 1 (
    REM Pause the script at the end to see any error messages
    pause
) 

endlocal