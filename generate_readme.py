import os
import re
import requests

# Constants
USERNAME = "JJJ"


def extract_info_from_code(file_path):
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
            if re.match(r'^\s*(#|//|/\*|\*|<!--).*', line):
                info["comments"].append(line.strip())
            elif re.match(r'^\s*(def\s+\w+|[a-zA-Z_][a-zA-Z0-9_]*\s*\(.*\)\s*\{)', line):
                func_name = re.findall(r'(\w+)\s*\(', line)
                if func_name:
                    info["functions"].append(func_name[0])
            elif re.match(r'^\s*class\s+\w+', line):
                class_name = re.findall(r'class\s+(\w+)', line)
                if class_name:
                    info["classes"].append(class_name[0])
            version_match = re.search(r'version\s*=\s*[\'"](.+?)[\'"]', line)
            if version_match:
                info["version"] = version_match.group(1)
            shortcut_match = re.search(
                r'(\w+)\s*:\s*[\'"]([^\'"]+)[\'"]', line)
            if shortcut_match:
                info["shortcuts"].append(
                    f"{shortcut_match.group(1)}: {shortcut_match.group(2)}")

    return info


def generate_readme_with_ollama(prompt):
    url = 'http://localhost:11434/v1/completions'
    data = {
        "model": "codestral:latest",
        "prompt": prompt,
        "max_tokens": 3000
    }
    response = requests.post(url, json=data)
    response.raise_for_status()
    result = response.json()
    return result['choices'][0]['text']


def generate_readme(directory_or_file):
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

    if os.path.isfile(directory_or_file):
        info = extract_info_from_code(directory_or_file)
        all_info["version"] = info["version"]
        if info["comments"]:
            all_info["description"] = ' '.join(info["comments"][:2])
        all_info["features"] = info["functions"]
        all_info["usage"] = info["classes"]
        all_info["shortcuts"] = info["shortcuts"]

    if all_info["version"] is None:
        all_info["version"] = "Unknown"

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

    readme_content = generate_readme_with_ollama(prompt)

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
