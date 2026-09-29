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

## Models

- Chat: `gpt-6-luna`
- Images: `gpt-image-2.5-sunburst`

Both can be changed with environment variables.

## Local setup

1. Install dependencies:

   `pip install -r requirements.txt`

2. Copy `.env.example` to `.env`.
3. Add your OpenAI API key:

   `OPENAI_API_KEY=your-secret-key`

4. Run:

   `python app.py`

5. Open `http://localhost:5050`.

## Vercel

Import this repository into Vercel as a Flask project.

Add this secret environment variable in Vercel Project Settings:

`OPENAI_API_KEY`

Do not commit the key to GitHub.

The included `vercel.json` configures the Flask function duration.

## Prototype note

Chat history and settings are stored in the browser. Usage counters are stored in server memory, which is fine for a prototype but should move to a persistent database or rate-limit store before a larger public launch.
