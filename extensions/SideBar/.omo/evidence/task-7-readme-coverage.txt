Command: findstr /c:"## Install" /c:"## Usage" /c:"## Compatibility" /c:"## Fallback Mode" /c:"## Limitations" /c:"Best effort, not guaranteed" "README.md"
Result: PASS

Observed required README entries:
- ## Install
- ## Usage
- ## Edge Sidebar Target
- ## Compatibility
- Best effort, not guaranteed.
- ## Fallback Mode
- ## Limitations

README now documents the Edge sidebar screenshot target: SideBar approximates the website-in-a-side-panel surface, but MV3 extensions cannot create the native browser-chrome app rail.
