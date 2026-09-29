# Alenaz AI

Alenaz is a full-featured AI assistant prototype built with Flask and the OpenAI API.

## Features

- Streaming AI chat
- Web search with source links
- Image generation
- Image understanding
- PDF and document attachments
- Voice input and browser text-to-speech
- Local chat history
- Auto, Study, Creative and Code modes
- Dark/light themes
- Hourly chat and daily image prototype limits
- Mobile-responsive UI

## Recommended local Mac setup

Alenaz can store the OpenAI API key in **macOS Keychain** instead of putting the secret inside source code or GitHub.

1. Clone/open this repo in VS Code.
2. In the VS Code terminal run:

   `pip3 install -r requirements.txt`

3. Store your key securely:

   `python3 setup_key.py`

   Paste the key when prompted. The terminal intentionally hides what you type.

4. Optional check:

   `python3 check_key.py`

   It should print `configured` without printing the secret.

5. Start Alenaz:

   `python3 app.py`

6. Open:

   `http://localhost:5050`

Alenaz checks for `OPENAI_API_KEY` in the process environment first. If it is not present, it reads the key from macOS Keychain.

To remove the saved key later:

`python3 remove_key.py`

## .env fallback

A local `.env` file is still supported, but Keychain is recommended on a Mac. `.env` is excluded by `.gitignore`.

## Security

Never commit an API key to GitHub, JavaScript, HTML, or any public file. The Keychain setup keeps the secret outside the repository.

## Prototype note

Chat history and settings are stored in the browser. Usage counters are stored in server memory, which is fine for a prototype but should move to persistent storage before a larger public launch.
