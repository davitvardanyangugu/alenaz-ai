# Alenaz AI

Alenaz is a ChatGPT-style AI assistant prototype built with Flask and the OpenAI API.

## Features

- Streaming AI chat
- Web search with source links
- Image generation
- Image understanding
- PDF and document attachments
- Voice input and browser text-to-speech
- Saved Chats workspace: pin, rename, move, delete and search across chat content
- Personal folders and organized conversation library
- Browser-local JSON export/import backups (chats and folders)
- Local profile name and account-status center (not an online login)
- Command center with keyboard shortcuts and a recent chats dashboard
- Auto, Study, Creative and Code modes
- Dark/light themes
- Prototype chat/image limits
- Mobile-responsive UI

## Saved Chats and local profiles

Choose **Saved chats** in the sidebar to open a separate library with folders, pinned conversations, full-text search, and actions to rename, move or delete chats. Deleted chats require confirmation.

Use **Export** to download a JSON backup and **Import** to restore it in this browser. Your backup may contain personal conversations, so store it somewhere private.

**Account & sync** currently provides a local display-name profile only. This is **not a real login or account**, and it does not sync conversations between devices. Chats, folders and profile settings are stored in the current browser.

For real sign-up/sign-in and cross-device sync, the deployed Flask app needs a trusted authentication provider (for example Clerk) plus a persistent database, with server-verified user sessions and per-user access controls. Those services have not yet been provisioned on Vercel. Do not expose cloud sync or password forms until this is implemented.

## Mac / VS Code setup

The easiest local setup is now:

```bash
git clone https://github.com/davitvardanyangugu/alenaz-ai.git ALENAZ
cd ALENAZ
bash setup_mac.sh
```

The setup script automatically creates a virtual environment, installs dependencies, and opens the secure API-key setup if needed.

Your API key is stored in **macOS Keychain**. It is not written into GitHub or the source code.

After the first setup, start Alenaz with:

```bash
bash start_mac.sh
```

Then open:

`http://localhost:5050`

To diagnose the local setup:

```bash
source venv/bin/activate
python doctor.py
```

To remove the saved API key:

```bash
source venv/bin/activate
python remove_key.py
```

## Models

Defaults:

- Chat: `gpt-6-luna`
- Images: `gpt-image-2.5-sunburst`

They can be overridden with `ALENAZ_MODEL` and `ALENAZ_IMAGE_MODEL`.

## Secret priority

Alenaz checks for an API key in this order:

1. `OPENAI_API_KEY` environment variable
2. macOS Keychain entry for Alenaz

A local `.env` file is also supported through `python-dotenv` and is ignored by Git.

## Security

Never place an API key in HTML, JavaScript, a public GitHub file, or a message/chat. Keep it in macOS Keychain or a private environment variable.

## Prototype note

Chat history and settings are stored in the browser. Usage counters are stored in server memory, which is suitable for a prototype but should use persistent storage for a larger public launch.


## Public temporary website

If `cloudflared` is installed, you can launch Alenaz and a temporary public Cloudflare URL together with one command:

```bash
bash public_mac.sh
```

The script starts Alenaz on port 5050, checks that it is healthy, and then creates a temporary `trycloudflare.com` tunnel. Keep the terminal open while the public site is online. Press Control+C to stop both.

For a permanent custom domain, use a named Cloudflare Tunnel and connect a domain you control. Do not expose the OpenAI API key in browser-side code.
