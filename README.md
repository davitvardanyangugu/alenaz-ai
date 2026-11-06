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
- Searchable prompt library with 14 editable starting prompts, categories and browser-local favorites
- Per-conversation autosaved message drafts (browser-local only; never submitted automatically)
- Markdown (.md) download of the currently opened conversation, including safe source URLs
- Auto, Study, Creative, Code and opt-in Swearing modes (casual profanity allowed; no hateful or abusive content)
- Dark/light themes
- Languages dashboard control and settings picker with 184 ISO 639-1 choices and custom language names
- Equal priority display for 182 language options; Azerbaijani and Turkish remain available in a separate non-priority group
- Existing Armenian, Russian and English interface translations, plus on-demand translated dashboard labels for other prioritized languages
- Language preference sent to AI chat and web search and used where supported for voice
- Prototype chat/image limits
- Automatic routing of clear image-generation and web-search requests (no tool click required)
- Clickable safe public website links and verified web-search sources
- Official Alenaz branding, browser tab icon and a truthful beta-status note
- Free / Plus / Pro **local-only feature previews** (no real subscriptions, checkout or charges)
- Plus preview: handwritten Memory+ notes, response personas, guided image prompts, browser voice-speed settings and printable PDF chat reports
- Pro preview: up to five local assistant presets, guided source-based research prompts, structured coding starters and Plus features
- Video Studio, advanced image editing, full multi-step Deep Research, cloud agents and higher paid usage limits are **not** active
- Mobile-responsive UI

## AI voice beta

Alenaz now has an experimental **Listen** button on assistant replies and a **Record voice** button in the composer. A short recording is transcribed with `gpt-transcribe` before the user reviews and sends the text. `Listen` generates a natural AI voice through the configured OpenAI Speech API; the user can choose from six voices in Preferences. Audio is generated on demand (not saved to conversation history). The auto-read setting requires a fresh opt-in after the upgrade because audio generation incurs provider costs.

Current safety limits: maximum 20 seconds of audio capture per recording (2 MB uploaded), up to 1,300 characters per audio playback, and by default six **new** text-to-speech generations and six transcriptions per hour per IP in each running server process. All subscription previews, including Free, have access to natural AI speech and transcription. Generated clips are kept temporarily in a small in-memory cache (maximum 16 clips or 10 MB), so replaying a **cached** clip does not call the API again. The cache is cleared when the page reloads or closes, and older clips may be evicted. This is unlimited replay of a cached clip, **not unlimited new AI generation**. **These per-process limits are not sufficient as global public-scale financial protection under serverless autoscaling.** Before a broad launch, add persistent per-account quotas, abuse defenses and spending limits.

**Important migration:** OpenAI's `gpt-4o-mini-tts` Speech API model sunsets **January 6, 2027**. Migrate to `gpt-realtime-2.1-mini` and the Realtime API before then. Voice playback quality depends on the input language and model, and Alenaz cannot guarantee perfect support for every language offered in its text selector. The voice is AI-generated, not a human recording. HTTPS and microphone permission are required.

Backend settings: `ALENAZ_TTS_MODEL`, `ALENAZ_STT_MODEL`, `ALENAZ_TTS_HOURLY_LIMIT`, and `ALENAZ_STT_HOURLY_LIMIT`. Keep `OPENAI_API_KEY` exclusively in server environment variables; never put it in browser code.

## Public beta / advertising readiness

The pricing cards in **Plans & premium** are **illustrative demos**. Anyone can preview their behavior locally; they do not provide a paid entitlement, higher model quotas, or payment processing. Do **not** advertise Plus or Pro as purchasable or promise advanced features that do not actually work. The feature lab only prepares editable prompts. The user must press **Send** to make a real API request, which continues to use the server's existing quotas and model configuration.

**Currently testable:** chat, search with source links, image generation when configured, voice dictation/read-aloud (device dependent), folders, local memory notes, response personas, saved assistant presets, printable PDF chat reports, and guided image/research/code starters. These tools require a supported browser and a working configured AI provider for API-backed requests.

**Before public paid advertising:** establish eligible merchant account ownership, implement verified accounts and secure server-side plan entitlements, install robust abuse/billing controls, assess provider costs, publish clear privacy/terms/cancellation information, and test across devices. Do not collect payment-card details directly in the app or promise video generation until a reliable supported provider is integrated.

## Prompt library, drafts and Markdown export

Choose **Prompt library** in the sidebar to browse study, creative, code and everyday prompts. Search and favorite templates; selecting **Use prompt** adds editable text to the message composer without sending an API request.

Unsent message drafts are saved in this browser as you type and restored when you switch back to a conversation (or refresh the page while composing a new chat). Clicking **New conversation** starts a blank message. Sending a message clears the relevant draft; clearing all chats clears local drafts.

Choose **Chat .md** in the bottom-left sidebar while a conversation is open to download a readable Markdown transcript. It includes text, attachment filenames, and validated source URLs, but not image bytes. **Backup** still saves your full browser-local conversation library as JSON and supports restoring it through Saved Chats.

Drafts, prompt favorites and exported transcripts stay on your device unless you choose to share them. They are not online accounts or cloud sync, and browser storage is not encrypted. Protect exported chat files because they may contain personal information.

## Language preferences — Alenaz 06

Open **🌐 Languages** beside the light/dark theme control on the dashboard, or open **Preferences → Languages**. All supported language options except Azerbaijani (`az`) and Turkish (`tr`) appear under **Priority Languages** with identical labels and styling. Azerbaijani and Turkish remain selectable under **Other Languages**. These are display preferences only: no language is disabled, and all selections follow the same chat/search API path. Search among 184 ISO 639-1 language codes, or enter an additional language name under **Can't find it?**.

The chosen language is saved **in this browser** as a preference, and sent with chat and web-search requests so Alenaz is instructed to answer primarily in that language. The same choice controls browser speech language when the device supports it. Changing the preference does not automatically translate previously saved messages.

Built-in interface translations cover Armenian, Russian and English. Other prioritized languages can request on-demand dashboard translations, subject to provider reliability and availability; display priority is not a guarantee of equal model fluency. For other choices, the interface falls back to English while AI responses are requested in the selected language. AI fluency, dialect recognition, reading direction, speech input and text-to-speech are **not guaranteed** for every language; rare and custom language names are best-effort. This does not provide independently verified translations for every language worldwide.

User-selected language values are validated on the server before being included in model instructions. No third-party translation widget or new cloud account is required.

## Swearing mode

Choose **⚡ Strong swearing mode** from the dashboard tool cards, sidebar, composer mode selector, or command center. It stays visibly enabled until you change mode or press the **×** on the mode banner. In informal chats it now asks the AI to use unmistakable profanity (including **fuck**, **fucking**, and **motherfucker** in consensual friendly banter), without euphemisms, masking, or automatic apologies just for language. This is an opt-in style, **not** permission for hate speech, threats, targeted harassment, or unsafe content; when Alenaz makes a genuine error, it should still acknowledge and correct it. Sensitive/professional answers may remain clean.

## Dashboard translations

Most languages previously changed only the AI reply preference while the dashboard stayed in English. The app now requests localized dashboard text when you select a language beyond the built-in UI translations. Only a fixed, public set of UI labels is sent to the AI translation service; private chats, drafts and profile details are never submitted for this purpose. Successful translations are cached in your current browser, and a visible Retry option appears if translation is unavailable. The app ships **instant core dashboard labels in 15 common languages** (Spanish, French, German, Italian, Portuguese, Dutch, Polish, Ukrainian, Georgian, Arabic, Chinese, Japanese, Korean, Hindi and Greek), with the remaining labels loading in the background. Translation requests now default to a smaller, faster model (`ALENAZ_TRANSLATION_MODEL=gpt-4.1-mini`); if that model is unavailable to the account, the configured chat model is a fallback. The translation model is configurable on the server, and no secret is sent to the browser.

A language's translation may fail when its AI model is unavailable, fails to produce usable strings, or usage limits are reached; the dashboard falls back to English until the user retries. Main interface text for Armenian, Russian and English remains built in. Azerbaijani and Turkish remain selectable in the separate non-priority section, but do not trigger the optional dashboard translation service. Rare-language AI responses and device speech voices are best-effort rather than universally guaranteed.

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
node --check static/features.js
node --test tests/test_frontend.cjs tests/test_features.cjs tests/test_language_priority.cjs
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
