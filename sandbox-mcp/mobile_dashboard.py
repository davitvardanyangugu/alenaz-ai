"""Secure, phone-friendly frontend for Alenaz PayPal Sandbox MCP.

The dashboard uses its own owner password and same-site, HttpOnly cookie.
It never exposes PayPal credentials or the MCP bearer token to the browser.
"""
import hashlib
import hmac
import os
import re
import secrets
from datetime import timedelta

from flask import Blueprint, jsonify, make_response, render_template, request
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer


COOKIE_NAME = "alenaz_sandbox_mobile"
MAX_SESSION_AGE = 4 * 60 * 60


def install_mobile_dashboard(app, invoke_tool):
    mobile = Blueprint("sandbox_mobile", __name__, url_prefix="/mobile")

    def configured():
        password = os.environ.get("ALENAZ_DASHBOARD_PASSWORD", "")
        secret = os.environ.get("ALENAZ_MCP_ACCESS_TOKEN", "")
        return len(password) >= 16 and len(secret) >= 32

    def signing():
        return URLSafeTimedSerializer(
            os.environ.get("ALENAZ_MCP_ACCESS_TOKEN", ""),
            salt="alenaz-sandbox-mobile-v1",
        )

    def current_session():
        if not configured():
            return None
        ticket = request.cookies.get(COOKIE_NAME, "")
        if not ticket:
            return None
        try:
            data = signing().loads(ticket, max_age=MAX_SESSION_AGE)
        except (BadSignature, SignatureExpired):
            return None
        if isinstance(data, dict) and data.get("authorized") is True:
            nonce = data.get("nonce")
            if isinstance(nonce, str) and len(nonce) == 32:
                return data
        return None

    def csrf_for(data):
        return hmac.new(
            os.environ["ALENAZ_MCP_ACCESS_TOKEN"].encode(),
            ("mobile-csrf:" + data["nonce"]).encode(),
            hashlib.sha256,
        ).hexdigest()

    def origin_allowed():
        origin = request.headers.get("Origin", "")
        if origin:
            return hmac.compare_digest(origin, request.url_root.rstrip("/"))
        # Some mobile clients omit Origin on same-origin requests.
        referer = request.headers.get("Referer", "")
        return referer.startswith(request.url_root.rstrip("/") + "/mobile")

    def ajax_guard():
        data = current_session()
        if not data:
            return None, (jsonify({"error": "Sign in on this phone first."}), 401)
        provided = request.headers.get("X-CSRF-Token", "")
        if not provided or not hmac.compare_digest(provided, csrf_for(data)):
            return None, (jsonify({"error": "Session expired. Refresh the page."}), 403)
        if not origin_allowed():
            return None, (jsonify({"error": "Untrusted request origin."}), 403)
        if not request.is_json:
            return None, (jsonify({"error": "JSON request required."}), 415)
        return data, None

    @mobile.after_request
    def mobile_headers(response):
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Content-Security-Policy"] = (
            "default-src 'none'; base-uri 'none'; form-action 'self'; "
            "connect-src 'self'; style-src 'unsafe-inline'; "
            "script-src 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'"
        )
        return response

    @mobile.get("")
    @mobile.get("/")
    def home():
        auth = current_session()
        return render_template(
            "mobile.html",
            setup_needed=not configured(),
            authenticated=bool(auth),
            csrf_token=csrf_for(auth) if auth else "",
        )

    @mobile.post("/login")
    def login():
        if not configured():
            return jsonify({"error": "Owner must configure dashboard password first."}), 503
        if not request.is_json or not origin_allowed():
            return jsonify({"error": "Invalid sign-in request."}), 403
        body = request.get_json(silent=True) or {}
        password = body.get("password", "")
        if not isinstance(password, str) or len(password) > 256:
            return jsonify({"error": "Invalid password."}), 400
        expected = os.environ["ALENAZ_DASHBOARD_PASSWORD"]
        # Avoid a plain string comparison; passwords are stored server-side only.
        entered_hash = hashlib.pbkdf2_hmac(
            "sha256", password.encode(), b"alenaz-mobile-password-v1", 200_000
        )
        expected_hash = hashlib.pbkdf2_hmac(
            "sha256", expected.encode(), b"alenaz-mobile-password-v1", 200_000
        )
        if not hmac.compare_digest(entered_hash, expected_hash):
            return jsonify({"error": "Incorrect password."}), 401
        value = signing().dumps({"authorized": True, "nonce": secrets.token_hex(16)})
        response = make_response(jsonify({"ok": True}))
        response.set_cookie(
            COOKIE_NAME, value,
            max_age=MAX_SESSION_AGE,
            httponly=True, secure=True, samesite="Strict",
            path="/mobile",
        )
        return response

    @mobile.post("/logout")
    def logout():
        _, err = ajax_guard()
        if err:
            return err
        response = make_response(jsonify({"ok": True}))
        response.delete_cookie(COOKIE_NAME, path="/mobile", secure=True, samesite="Strict")
        return response

    @mobile.post("/api/check")
    def check():
        _, err = ajax_guard()
        if err:
            return err
        try:
            result = invoke_tool("check_sandbox_connection", {})
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400
        return jsonify(result)

    @mobile.post("/api/plan")
    def plan():
        _, err = ajax_guard()
        if err:
            return err
        body = request.get_json(silent=True) or {}
        plan_id = body.get("plan_id", "")
        if not isinstance(plan_id, str) or not re.fullmatch(r"P-[A-Z0-9]{12,60}", plan_id):
            return jsonify({"error": "Enter a valid PayPal test Plan ID, beginning P-."}), 400
        try:
            result = invoke_tool("inspect_sandbox_plan", {"plan_id": plan_id})
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400
        return jsonify(result)

    @mobile.post("/api/create")
    def create():
        _, err = ajax_guard()
        if err:
            return err
        body = request.get_json(silent=True) or {}
        if body.get("confirm_sandbox_creation") is not True:
            return jsonify({"error": "Confirm Sandbox-only plan creation."}), 400
        key = body.get("idempotency_key", "")
        if not isinstance(key, str) or not re.fullmatch(r"[A-Za-z0-9_-]{12,56}", key):
            return jsonify({"error": "Invalid creation reference."}), 400
        try:
            result = invoke_tool("create_alenaz_premium_sandbox_plan", {
                "confirm_sandbox_creation": True, "idempotency_key": key
            })
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400
        return jsonify(result)

    app.register_blueprint(mobile)
