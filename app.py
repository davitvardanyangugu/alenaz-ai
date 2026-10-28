import base64
import binascii
import os
import re
import time
from collections import defaultdict, deque
from pathlib import PurePath
from urllib.parse import urlsplit

from dotenv import load_dotenv
from flask import Flask, Response, jsonify, render_template, request, stream_with_context
from openai import OpenAI

try:
    import keyring
except ImportError:
    keyring = None

load_dotenv()

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 12 * 1024 * 1024
app.config["JSON_SORT_KEYS"] = False

MAX_MESSAGE_CHARS = 12000
MAX_IMAGE_PROMPT_CHARS = 4000
MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024
MAX_ATTACHMENT_ENCODED_CHARS = 11_200_000
ACCEPTED_FILE_MIMES = {
    "application/pdf",
    "text/plain", "text/markdown", "text/csv",
    "application/json",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}
ACCEPTED_IMAGE_MIMES = {
    "image/png", "image/jpeg", "image/webp", "image/gif",
}
ACCEPTED_OCTET_EXTENSIONS = {
    ".pdf", ".txt", ".md", ".csv", ".json", ".doc", ".docx",
    ".ppt", ".pptx", ".xls", ".xlsx",
}
DATA_URL_PATTERN = re.compile(
    r"data:([a-z0-9][a-z0-9.+/-]*);base64,([A-Za-z0-9+/=]+)",
    re.IGNORECASE,
)

CHAT_MODEL = os.getenv("ALENAZ_MODEL", "gpt-6-luna")
IMAGE_MODEL = os.getenv("ALENAZ_IMAGE_MODEL", "gpt-image-2.5-sunburst")
CHAT_LIMIT = int(os.getenv("ALENAZ_HOURLY_LIMIT", "30"))
IMAGE_DAILY_LIMIT = int(os.getenv("ALENAZ_IMAGE_DAILY_LIMIT", "3"))

KEYRING_SERVICE = "Alenaz AI"
KEYRING_ACCOUNT = "OPENAI_API_KEY"

_client = None
_client_key = None


def get_api_key():
    """Read the API key from the environment first, then macOS Keychain."""
    env_key = os.getenv("OPENAI_API_KEY", "").strip()
    if env_key:
        return env_key

    if keyring is None:
        return ""

    try:
        return (keyring.get_password(KEYRING_SERVICE, KEYRING_ACCOUNT) or "").strip()
    except Exception:
        return ""


def get_client():
    """Create/reuse an OpenAI client without ever exposing the secret."""
    global _client, _client_key

    api_key = get_api_key()
    if not api_key:
        return None

    if _client is None or _client_key != api_key:
        _client = OpenAI(api_key=api_key)
        _client_key = api_key

    return _client

SYSTEM_PROMPT = """
You are Alenaz, a friendly, capable AI assistant created by David Vardanyan.
Your product name is Alenaz. Use this identity consistently in every conversation,
including conversations using web search, study, creative, and coding modes.

If someone asks "Who are you?", "What is your name?", or an equivalent question,
answer naturally and directly: "I am Alenaz, your AI assistant."
If someone asks "Who created you?", "Who is your creator?", "Who made Alenaz?",
or an equivalent question, answer: "My creator is David Vardanyan."
If they ask both questions, state your name and creator together.

You can say that David Vardanyan created the Alenaz application, but do not
imply that he personally invented or trained the underlying foundation model.
If someone asks which organization developed the underlying model, distinguish
the underlying AI provider from Alenaz as the application.

Be clear, useful, conversational, and honest.
You can help with learning, writing, coding, brainstorming, research, and image understanding.
When web search is enabled, use current sources and avoid pretending that old information is current.
When a file or image is attached, pay close attention to it.
Do not claim that you performed an action you did not actually perform.
"""

MODE_PROMPTS = {
    "auto": "",
    "study": "Act like a patient tutor. Explain step by step and check understanding without being patronizing.",
    "creative": "Be imaginative and original. Offer vivid, polished ideas while following the user's constraints.",
    "code": "Act like a careful software engineer. Prefer correct, maintainable code and explain important implementation choices.",
}

usage = defaultdict(lambda: {"chat": deque(), "image": deque()})


def user_key():
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.remote_addr or "unknown"


def take_quota(kind, limit, window_seconds):
    now = time.time()
    bucket = usage[user_key()][kind]
    cutoff = now - window_seconds
    while bucket and bucket[0] < cutoff:
        bucket.popleft()

    if len(bucket) >= limit:
        retry_after = max(1, int(window_seconds - (now - bucket[0])))
        return False, retry_after

    bucket.append(now)
    return True, 0


def require_client():
    current_client = get_client()
    if current_client is None:
        return None, (
            jsonify({
                "error": (
                    "Alenaz has no OpenAI API key. Run 'python3 setup_key.py' "
                    "on your Mac, or set OPENAI_API_KEY in the environment."
                )
            }),
            503,
        )
    return current_client, None


def parse_json_payload():
    """Reject malformed or non-object JSON before consuming quota."""
    if not request.is_json:
        raise ValueError("Content-Type must be application/json.")
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        raise ValueError("The request body must be a JSON object.")
    return payload


def validate_mode(payload):
    mode = payload.get("mode", "auto")
    if not isinstance(mode, str) or mode not in MODE_PROMPTS:
        raise ValueError("Invalid AI mode.")
    return mode


def clean_history(history):
    if history is None:
        return []
    if not isinstance(history, list):
        raise ValueError("Conversation history must be a list.")

    cleaned = []
    for item in history[-12:]:
        if not isinstance(item, dict):
            continue
        role = item.get("role")
        value = item.get("text")
        if role in {"user", "assistant"} and isinstance(value, str) and value.strip():
            cleaned.append({"role": role, "content": value[:MAX_MESSAGE_CHARS]})
    return cleaned


def validated_attachment(attachment):
    if not isinstance(attachment, dict):
        raise ValueError("Attachment must be a file object.")

    raw_name = attachment.get("name", "attachment")
    if not isinstance(raw_name, str):
        raise ValueError("Attachment filename must be text.")
    # Strip path components and control characters before sending names to a model provider.
    name = PurePath(raw_name.replace(chr(92), "/").split("/")[-1]).name
    name = "".join(char for char in name if char.isprintable()).strip()[:120]
    if not name:
        name = "attachment"

    content_type = attachment.get("type") or "application/octet-stream"
    data = attachment.get("data")
    if not isinstance(content_type, str):
        raise ValueError("Invalid attachment type.")
    content_type = content_type.lower().strip()
    if not isinstance(data, str) or len(data) > MAX_ATTACHMENT_ENCODED_CHARS + 100:
        raise ValueError("Attachment is missing or too large.")

    match = DATA_URL_PATTERN.fullmatch(data)
    if not match:
        raise ValueError("Attachment must contain valid base64 file data.")
    encoded_type = match.group(1).lower()
    encoded = match.group(2)
    if encoded_type != content_type:
        raise ValueError("Attachment content type does not match its data.")

    ext = os.path.splitext(name)[1].lower()
    allowed = content_type in ACCEPTED_IMAGE_MIMES or content_type in ACCEPTED_FILE_MIMES
    if content_type == "application/octet-stream":
        allowed = ext in ACCEPTED_OCTET_EXTENSIONS
    if not allowed:
        raise ValueError("Unsupported attachment type. Use an image, PDF, text, or Office document.")

    try:
        decoded = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError):
        raise ValueError("Attachment data is not valid base64.") from None
    if len(decoded) > MAX_ATTACHMENT_BYTES:
        raise ValueError("Attachments must be 8 MB or smaller.")

    return {
        "name": name,
        "mime": content_type,
        "data": data,
        "image": content_type in ACCEPTED_IMAGE_MIMES,
    }


def build_input(payload):
    if not isinstance(payload, dict):
        raise ValueError("The request body must be a JSON object.")

    raw_message = payload.get("message") or ""
    if not isinstance(raw_message, str):
        raise ValueError("Message must be text.")
    message = raw_message.strip()
    if len(message) > MAX_MESSAGE_CHARS:
        raise ValueError("Messages must be 12,000 characters or shorter.")

    attachment = payload.get("attachment")
    valid_file = validated_attachment(attachment) if attachment is not None else None
    items = clean_history(payload.get("history"))
    current = []

    if message:
        current.append({"type": "input_text", "text": message})
    elif valid_file:
        current.append({"type": "input_text", "text": "Please analyze this attachment."})

    if valid_file:
        if valid_file["image"]:
            current.append({
                "type": "input_image",
                "image_url": valid_file["data"],
                "detail": "auto",
            })
        else:
            current.append({
                "type": "input_file",
                "filename": valid_file["name"],
                "file_data": valid_file["data"],
            })

    if not current:
        raise ValueError("Message is empty.")

    items.append({"role": "user", "content": current})
    return items


def safe_http_url(value):
    """Only permit normal HTTP(S) links to be displayed as citations."""
    if not isinstance(value, str) or len(value) > 2048:
        return False
    if any(ord(char) < 32 for char in value):
        return False
    try:
        parsed = urlsplit(value)
        return (
            parsed.scheme.lower() in {"http", "https"}
            and bool(parsed.hostname)
            and parsed.username is None
            and parsed.password is None
        )
    except ValueError:
        return False


def validated_image_prompt(payload):
    prompt = payload.get("prompt")
    if not isinstance(prompt, str) or not prompt.strip():
        raise ValueError("Image prompt must be non-empty text.")
    prompt = prompt.strip()
    if len(prompt) > MAX_IMAGE_PROMPT_CHARS:
        raise ValueError("Image prompts must be 4,000 characters or shorter.")
    return prompt


def instructions_for(mode):
    extra = MODE_PROMPTS.get(mode or "auto", "")
    if extra:
        return SYSTEM_PROMPT + "\n\nMode guidance:\n" + extra
    return SYSTEM_PROMPT


def extract_citations(response):
    citations = []
    seen = set()

    for item in getattr(response, "output", []) or []:
        if getattr(item, "type", None) != "message":
            continue
        for part in getattr(item, "content", []) or []:
            for annotation in getattr(part, "annotations", []) or []:
                if getattr(annotation, "type", None) != "url_citation":
                    continue

                url = getattr(annotation, "url", None)
                title = getattr(annotation, "title", None) or url
                start_index = getattr(annotation, "start_index", None)
                end_index = getattr(annotation, "end_index", None)

                nested = getattr(annotation, "url_citation", None)
                if nested is not None:
                    url = url or getattr(nested, "url", None)
                    title = title or getattr(nested, "title", None)
                    start_index = start_index if start_index is not None else getattr(nested, "start_index", None)
                    end_index = end_index if end_index is not None else getattr(nested, "end_index", None)

                if not safe_http_url(url) or url in seen:
                    continue

                seen.add(url)
                citations.append({
                    "url": url,
                    "title": (title if isinstance(title, str) else url)[:200],
                    "start_index": start_index if isinstance(start_index, int) and start_index >= 0 else None,
                    "end_index": end_index if isinstance(end_index, int) and end_index >= 0 else None,
                })

    return citations


@app.before_request
def reject_cross_origin_api_posts():
    if request.method != "POST" or request.path not in {
        "/api/chat_stream", "/api/search", "/api/image"
    }:
        return None
    if request.headers.get("Sec-Fetch-Site") == "cross-site":
        return jsonify({"error": "Cross-site API requests are not allowed."}), 403
    origin = request.headers.get("Origin")
    if origin:
        try:
            parsed = urlsplit(origin)
            if parsed.scheme not in {"http", "https"} or parsed.netloc.lower() != request.host.lower():
                return jsonify({"error": "Cross-origin API requests are not allowed."}), 403
        except ValueError:
            return jsonify({"error": "Invalid request origin."}), 403
    return None


@app.after_request
def add_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), geolocation=(), microphone=(self)"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; base-uri 'self'; object-src 'none'; "
        "frame-ancestors 'none'; form-action 'self'; "
        "script-src 'self'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data: blob: https:; connect-src 'self'"
    )
    if request.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    return response


@app.route("/")
def home():
    return render_template("index.html")


@app.get("/api/health")
def health():
    return jsonify({
        "name": "Alenaz",
        "configured": bool(get_api_key()),
        "chat_model": CHAT_MODEL,
        "image_model": IMAGE_MODEL,
        "hourly_limit": CHAT_LIMIT,
        "image_daily_limit": IMAGE_DAILY_LIMIT,
    })


@app.post("/api/chat_stream")
def chat_stream():
    try:
        payload = parse_json_payload()
        mode = validate_mode(payload)
        model_input = build_input(payload)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    client, missing = require_client()
    if missing:
        return missing

    allowed, retry_after = take_quota("chat", CHAT_LIMIT, 3600)
    if not allowed:
        return jsonify({
            "error": "Hourly prototype limit reached.",
            "retry_after": retry_after,
        }), 429

    def generate():
        try:
            stream = client.responses.create(
                model=CHAT_MODEL,
                instructions=instructions_for(mode),
                input=model_input,
                stream=True,
            )

            for event in stream:
                event_type = getattr(event, "type", "")
                if event_type == "response.output_text.delta":
                    delta = getattr(event, "delta", "")
                    if delta:
                        yield delta
                elif event_type == "error":
                    # Provider messages can include request details. Do not expose them.
                    app.logger.warning("Streaming provider reported an error.")
                    yield "\n\n[Alenaz error: The AI service could not finish this reply. Please retry.]"
                    return
        except Exception as exc:
            # Only log the error category; avoid request contents and provider secrets.
            app.logger.warning("Chat service failed (%s)", type(exc).__name__)
            yield "\n\n[Alenaz error: The AI service is temporarily unavailable. Please retry.]"

    return Response(stream_with_context(generate()), mimetype="text/plain; charset=utf-8")


@app.post("/api/search")
def search():
    try:
        payload = parse_json_payload()
        mode = validate_mode(payload)
        model_input = build_input(payload)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    client, missing = require_client()
    if missing:
        return missing

    allowed, retry_after = take_quota("chat", CHAT_LIMIT, 3600)
    if not allowed:
        return jsonify({"error": "Hourly prototype limit reached.", "retry_after": retry_after}), 429

    try:
        response = client.responses.create(
            model=CHAT_MODEL,
            instructions=instructions_for(mode),
            input=model_input,
            tools=[{"type": "web_search", "search_context_size": "low"}],
            tool_choice="auto",
            include=["web_search_call.action.sources"],
        )
        return jsonify({
            "answer": response.output_text,
            "sources": extract_citations(response),
        })
    except Exception as exc:
        app.logger.warning("Search service failed (%s)", type(exc).__name__)
        return jsonify({"error": "Web search is temporarily unavailable. Please retry."}), 502


@app.post("/api/image")
def image():
    try:
        payload = parse_json_payload()
        prompt = validated_image_prompt(payload)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    client, missing = require_client()
    if missing:
        return missing

    allowed, retry_after = take_quota("image", IMAGE_DAILY_LIMIT, 86400)
    if not allowed:
        return jsonify({"error": "Daily image prototype limit reached.", "retry_after": retry_after}), 429

    try:
        result = client.images.generate(
            model=IMAGE_MODEL,
            prompt=prompt,
            size="1024x1024",
            quality="low",
        )
        image_data = result.data[0].b64_json
        if not image_data:
            return jsonify({"error": "Image generation returned no image. Please retry."}), 502
        return jsonify({
            "image": "data:image/png;base64," + image_data,
            "prompt": prompt,
        })
    except Exception as exc:
        app.logger.warning("Image service failed (%s)", type(exc).__name__)
        return jsonify({"error": "Image generation is temporarily unavailable. Please retry."}), 502


if __name__ == "__main__":
    print("ALENAZ prototype online.")
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5050")), debug=False)
