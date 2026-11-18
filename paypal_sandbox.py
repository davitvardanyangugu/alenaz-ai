"""PayPal Sandbox-only subscription testing for Alenaz.

This module intentionally never contacts live PayPal, enables real billing,
stores customer details, or grants Premium access.
"""
import base64
import json
import os
import re
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

SANDBOX_API = "https://api-m.sandbox.paypal.com"
PLAN_RE = re.compile(r"^P-[A-Z0-9]{12,60}$")
CLIENT_RE = re.compile(r"^[A-Za-z0-9_-]{15,220}$")
SUBSCRIPTION_RE = re.compile(r"^I-[A-Z0-9]{6,45}$")


def sandbox_settings():
    """Return safe, PUBLIC sandbox settings; keep the client secret on the server."""
    env = os.getenv("VERCEL_ENV", "").strip().lower()
    mode = os.getenv("PAYPAL_MODE", "").strip().lower()
    if env == "production" or mode != "sandbox":
        return {"enabled": False, "mode": "disabled",
                "message": "PayPal test checkout is disabled outside Sandbox Preview."}
    client_id = os.getenv("PAYPAL_CLIENT_ID", "").strip()
    secret = os.getenv("PAYPAL_CLIENT_SECRET", "").strip()
    plan_id = os.getenv("PAYPAL_PREMIUM_PLAN_ID", "").strip()
    missing = []
    if not CLIENT_RE.fullmatch(client_id):
        missing.append("PAYPAL_CLIENT_ID (Sandbox)")
    if not secret:
        missing.append("PAYPAL_CLIENT_SECRET (Sandbox)")
    if not PLAN_RE.fullmatch(plan_id):
        missing.append("PAYPAL_PREMIUM_PLAN_ID (Sandbox)")
    if missing:
        return {"enabled": False, "mode": "sandbox", "missing": missing,
                "message": "PayPal Sandbox setup is incomplete; no checkout is available yet."}
    return {"enabled": True, "mode": "sandbox",
            "client_id": client_id, "plan_id": plan_id,
            "message": "TEST ONLY — PayPal Sandbox. No real charges or Premium entitlement."}


def _fetch_json(request):
    """Read bounded JSON from the fixed PayPal sandbox API only."""
    try:
        with urlopen(request, timeout=12) as response:
            raw = response.read(262145)
            if len(raw) > 262144:
                raise ValueError("PayPal Sandbox response was too large.")
            return json.loads(raw)
    except (HTTPError, URLError, TimeoutError, ValueError, UnicodeError) as exc:
        raise RuntimeError("PayPal Sandbox request failed.") from exc



def verify_sandbox_plan(client_id, secret, plan_id):
    """Verify the plan exists in this merchant's PayPal Sandbox and matches $9.99/month.

    Prevents putting a Live Plan ID (or another merchant's plan) into a test button.
    Only fixed Sandbox API endpoints are used, with no buyer charge.
    """
    from decimal import Decimal, InvalidOperation

    if not CLIENT_RE.fullmatch(client_id) or not secret or not PLAN_RE.fullmatch(plan_id):
        raise ValueError("Sandbox credentials or plan are not configured.")
    basic = base64.b64encode(f"{client_id}:{secret}".encode()).decode("ascii")
    auth = Request(
        SANDBOX_API + "/v1/oauth2/token",
        data=b"grant_type=client_credentials",
        method="POST",
        headers={"Authorization": "Basic " + basic,
                 "Content-Type": "application/x-www-form-urlencoded",
                 "Accept": "application/json"},
    )
    token = _fetch_json(auth).get("access_token")
    if not isinstance(token, str) or not token:
        raise RuntimeError("PayPal Sandbox authentication failed.")
    request = Request(
        SANDBOX_API + "/v1/billing/plans/" + plan_id,
        method="GET",
        headers={"Authorization": "Bearer " + token,
                 "Accept": "application/json"},
    )
    plan = _fetch_json(request)
    if plan.get("id") != plan_id or plan.get("status") != "ACTIVE":
        raise ValueError("Plan is not active in the configured PayPal Sandbox merchant account.")
    cycles = plan.get("billing_cycles") or []
    regular = [x for x in cycles if x.get("tenure_type") == "REGULAR"]
    if len(regular) != 1 or len(cycles) != 1:
        raise ValueError("Expected one monthly billing cycle with no trial.")
    billing = regular[0]
    frequency = billing.get("frequency") or {}
    price = (billing.get("pricing_scheme") or {}).get("fixed_price") or {}
    try:
        correct_price = price.get("currency_code") == "USD" and Decimal(str(price.get("value"))) == Decimal("9.99")
    except (InvalidOperation, TypeError, ValueError):
        correct_price = False
    if (frequency.get("interval_unit") != "MONTH"
            or frequency.get("interval_count") != 1
            or billing.get("total_cycles") != 0
            or not correct_price):
        raise ValueError("Expected an unlimited $9.99 USD monthly Sandbox plan without a trial.")
    return True


def verify_test_subscription(subscription_id, client_id, secret, expected_plan_id, expected_checkout_ref=None):
    """Query PayPal server-to-server. Does not grant access or retain PII."""
    if not SUBSCRIPTION_RE.fullmatch(subscription_id):
        raise ValueError("Invalid Sandbox subscription ID.")
    if not CLIENT_RE.fullmatch(client_id) or not secret or not PLAN_RE.fullmatch(expected_plan_id):
        raise ValueError("Sandbox merchant settings are incomplete.")
    basic = base64.b64encode(f"{client_id}:{secret}".encode()).decode("ascii")
    token_request = Request(
        SANDBOX_API + "/v1/oauth2/token",
        data=b"grant_type=client_credentials",
        method="POST",
        headers={"Authorization": "Basic " + basic,
                 "Content-Type": "application/x-www-form-urlencoded",
                 "Accept": "application/json"},
    )
    token_info = _fetch_json(token_request)
    token = token_info.get("access_token")
    if not isinstance(token, str) or not token:
        raise RuntimeError("PayPal Sandbox authentication failed.")
    details_request = Request(
        SANDBOX_API + "/v1/billing/subscriptions/" + subscription_id,
        method="GET",
        headers={"Authorization": "Bearer " + token, "Accept": "application/json"},
    )
    details = _fetch_json(details_request)
    if details.get("plan_id") != expected_plan_id:
        raise ValueError("This Sandbox subscription belongs to a different plan.")
    if expected_checkout_ref is not None and details.get("custom_id") != expected_checkout_ref:
        raise ValueError("Sandbox subscription does not belong to this checkout session.")
    state = details.get("status", "UNKNOWN")
    if state not in {"APPROVAL_PENDING", "APPROVED", "ACTIVE", "SUSPENDED", "CANCELLED", "EXPIRED"}:
        state = "UNKNOWN"
    return {"status": state, "sandbox_verified": state == "ACTIVE",
            "premium_unlocked": False,
            "message": ("Sandbox subscription confirmed as ACTIVE. This is a test only; "
                        "no real membership or billing was activated."
                        if state == "ACTIVE" else
                        "PayPal Sandbox currently reports status: " + state +
                        ". No Premium access is granted.")}
