import os
import re
import requests

# Constants
USERNAME = "JJJ"


def extract_info_from_code(file_path):
    """Extracts information such as comments, functions, classes, version, and shortcuts from a Python or JavaScript file."""
    info = {
        "comments": [],
        "functions": [],
        "classes": [],
        "version": None,
        "shortcuts": []
    }

    with open(file_path, 'r', errors='ignore') as file:
        lines = file.readlines()
        for line in lines:
            # Extract comments
            if re.match(r'^\s*(#|//|/\*|\*|<!--).*', line):
                info["comments"].append(line.strip())
            # Extract function names
            elif re.match(r'^\s*(def\s+\w+|function\s+\w+|[a-zA-Z_][a-zA-Z0-9_]*\s*\(.*\)\s*\{)', line):
                func_name = re.findall(r'(\w+)\s*\(', line)
                if func_name:
                    info["functions"].append(func_name[0])
            # Extract class names
            elif re.match(r'^\s*class\s+\w+', line):
                class_name = re.findall(r'class\s+(\w+)', line)
                if class_name:
                    info["classes"].append(class_name[0])
            # Extract version information
            version_match = re.search(r'version\s*=\s*[\'"](.+?)[\'"]', line)
            if version_match:
                info["version"] = version_match.group(1)
            # Extract keyboard shortcuts
            shortcut_match = re.search(
                r'(\w+)\s*:\s*[\'"]([^\'"]+)[\'"]', line)
            if shortcut_match:
                info["shortcuts"].append(f"{shortcut_match.group(1)}: {
                                         shortcut_match.group(2)}")

    return info


def generate_readme_with_ollama(prompt):
    """Generates README content using the Ollama server with the provided prompt."""
    url = 'http://localhost:11434/v1/completions'  # Ollama server URL
    data = {
        "model": "llama3.1:latest",  # Using the specified model "llama3.1:latest"
        "prompt": prompt,
        "max_tokens": 3000
    }
    response = requests.post(url, json=data)
    response.raise_for_status()
    result = response.json()
    return result['choices'][0]['text']


def generate_readme_for_js(file_path):
    """Generates a README.md file for a JavaScript project."""
    info = extract_info_from_code(file_path)
    readme_content = f"""
# Note App

Simple note-taking application using JavaScript.

## Features

1. **Text Editing:**
   - The application provides a text editor for creating and editing notes.

2. **File Operations:**
   - Open Folder: Allows the user to select a folder.
   - Open File: Opens a file and displays its content in the text editor.
   - Save: Saves the current content to a file.
   - Save As: Saves the current content to a new file.

3. **Keyboard Shortcuts:**
   - Ctrl+Z: Undo.
   - Ctrl+X: Cut.
   - Ctrl+C: Copy.
   - Ctrl+V: Paste.
   - Ctrl+Y: Redo.
   - Ctrl+A: Select All.
   - Ctrl+F: Find Text.
   - Ctrl+S: Save File.
   - Ctrl+O: Open File.

## Usage

1. **Open Folder:**
   - Click on the "File" menu.
   - Choose "Open Folder."
   - Select the desired folder.

2. **Open File:**
   - Click on the "File" menu.
   - Choose "Open File."
   - Select the file to open.

3. **Save:**
   - Click on the "File" menu.
   - Choose "Save" to save the current content to the last accessed folder.

4. **Save As:**
   - Click on the "File" menu.
   - Choose "Save As" to save the current content to a new file.

5. **Keyboard Shortcuts:**
   - Utilize various keyboard shortcuts for text editing and file operations.

6. **Find Text:**
   - Click on the "Edit" menu.
   - Choose "Find Text" to search for specific text in the document.

## Additional Information

- This application uses JavaScript for the functionality.
- The settings, including window size and last accessed folder, are persisted between sessions.

## Requirements

- JavaScript

## Installation

1. Clone the repository.
2. Install the required dependencies.
3. Run the application.

## License

[MIT](https://choosealicense.com/licenses/mit/)
"""

    readme_path = os.path.join(os.path.dirname(file_path), "README.md")
    with open(readme_path, "w") as readme_file:
        readme_file.write(readme_content.strip())

    print(f"README.md generated successfully at {readme_path}")


def generate_readme(directory_or_file):
    """Generates a README.md file based on extracted information and saves it in the same directory as the input file."""
    if directory_or_file.endswith('.js'):
        generate_readme_for_js(directory_or_file)
        return

    all_info = {
        "title": "Project Title",
        "description": "Project Description",
        "installation": "Installation instructions",
        "features": [],
        "usage": [],
        "shortcuts": [],
        "author": USERNAME,
        "version": None,
    }

    # Check if the input is a file
    if os.path.isfile(directory_or_file):
        info = extract_info_from_code(directory_or_file)
        all_info["version"] = info["version"]
        if info["comments"]:
            all_info["description"] = ' '.join(info["comments"][:2])
        all_info["features"] = info["functions"]
        all_info["usage"] = info["classes"]
        all_info["shortcuts"] = info["shortcuts"]

    # Set default version if not found
    if all_info["version"] is None:
        all_info["version"] = "Unknown"

    # Prepare the prompt for Ollama
    prompt = f"""
Generate a README.md for the following project, strictly adhering to this format and structure:

# {all_info['title']}

{all_info['description']}

## Installation

{all_info['installation']}

## Features

{chr(10).join(all_info['features'])}

## Usage

{chr(10).join(all_info['usage'])}

{"## Keyboard Shortcuts" if all_info['shortcuts'] else ""}
{chr(10).join(all_info['shortcuts'])}

## Author

{all_info['author']}

## Version

{all_info['version']}

## License

This project is licensed under the [MIT License](https://choosealicense.com/licenses/mit/).

Start directly with the content of the README, following the exact structure provided above.
"""

    # Generate README content using Ollama
    readme_content = generate_readme_with_ollama(prompt)

    # Save README.md in the same directory as the input file
    readme_path = os.path.join(os.path.dirname(directory_or_file), "README.md")
    with open(readme_path, "w") as readme_file:
        readme_file.write(readme_content.strip())

    print(f"README.md generated successfully at {readme_path}")


if __name__ == "__main__":
    path = input(
        "Enter the directory or file path containing your code: ").strip()
    if os.path.exists(path):
        generate_readme(path)
    else:
        print("Invalid directory or file path. Please try again.")
