@echo off
REM Run tests for VideoDownload application

echo Video Download Test Runner
echo =========================
echo.

set PYTHONPATH=%PYTHONPATH%;%~dp0

if "%1"=="unit" goto unit
if "%1"=="integration" goto integration
if "%1"=="all" goto all
goto normal

:unit
echo Running unit tests only...
python -m pytest tests\unit_tests -v
goto end

:integration
echo Running integration tests only...
python -m pytest tests\integration_tests -v
goto end

:all
echo Running ALL tests including slow ones...
python -m pytest -v
goto end

:normal
echo Running normal tests (excluding slow tests)...
python -m pytest -k "not slow" -v

:end
echo.
echo Test run complete.