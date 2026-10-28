# Alenaz AI

Alenaz is a ChatGPT-style AI assistant prototype built with Flask and the OpenAI API.

## Features

- Streaming AI chat with Stop generating (client-side cancellation)
- Web search with safe HTTP(S) source links
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

## Security, privacy and current limitations

- Alenaz was created by David Vardanyan. The underlying AI models are supplied by an external provider, not trained by the application creator.
- **Chat history, folders, and settings are stored locally in the browser** using `localStorage`. These records are not encrypted or synchronized between devices. Someone with access to the same unlocked browser profile may be able to read them. Clearing browser data may erase them; export a backup if needed.
- When you send a message, search query, generated-image prompt or attachment, the browser sends its content to the Flask API, which passes it to the configured external AI provider for processing. No application database is currently storing these requests, but the provider handles data under its own terms and policies. Do not assume end-to-end encryption or zero retention.
- The interface loads web fonts from Google Fonts, which results in browser requests to Google. There is no separate analytics tracker added by this project.
- Uploaded attachments must use supported image, PDF, text or Office formats and are limited to approximately 8 MB. Unsupported formats are rejected with a clear error.
- Generated image bytes are intentionally excluded from persistent local history; reopening a previous chat may show an expired-image notice.
- Server-side API keys stay in environment variables or the local macOS Keychain. Never place a secret in browser code, GitHub source, or chat messages.
- The API validates request structure, file MIME/data URL consistency and citation URL schemes, blocks obvious cross-origin browser requests, and sets HTTP response security headers. These measures do **not** substitute for authenticated users or dedicated abuse protection.
- The browser's **Stop generating** control cancels its request and saves any received partial reply. The external provider may still incur work or charges after a disconnect.
- **Prototype usage quotas are held in per-process memory and keyed using request IP headers.** They are not a secure global limit across Vercel instances and can be unreliable behind proxies. Before a public release, use a shared rate limiter, abuse monitoring and per-user budgets.
- Web-search citations still require verification by the user for consequential decisions. Citation filtering protects links; it does not independently prove the cited claim.

## Testing

Install dependencies with `python -m pip install -r requirements.txt`, then run:

```bash
python -m unittest discover -s tests -v
python -m py_compile app.py
node --check static/app.js
node --check static/studio.js
node --check static/library.js
node --test tests/test_frontend.cjs
```

The Python tests use mocked AI provider responses; they do not spend API credits. They cover request validation, upload handling, origin checks, identity instructions, citation link safety, error sanitization, upload-size failures and security headers. Node tests simulate enough of the browser to verify client-side link safety, cancellation, and cross-chat response isolation. Full visual, accessibility, real-browser and provider-performance testing still require dedicated end-to-end checks.

## Next infrastructure improvements

1. Connect managed authentication and a private database before offering real online accounts or cross-device sync.
2. Replace per-process quota counters with a shared, abuse-resistant rate limiter.
3. Add browser end-to-end tests for chat, Stop generating, Saved Chats, mobile navigation, and keyboard accessibility.
4. Add operational monitoring with appropriate data minimization and clear consent where necessary.


## Public temporary website

If `cloudflared` is installed, you can launch Alenaz and a temporary public Cloudflare URL together with one command:

```bash
bash public_mac.sh
```

The script starts Alenaz on port 5050, checks that it is healthy, and then creates a temporary `trycloudflare.com` tunnel. Keep the terminal open while the public site is online. Press Control+C to stop both.

For a permanent custom domain, use a named Cloudflare Tunnel and connect a domain you control. Do not expose the OpenAI API key in browser-side code.
