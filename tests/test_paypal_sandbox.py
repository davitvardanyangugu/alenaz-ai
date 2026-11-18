"""Sandbox-only PayPal configuration, validation and secret-handling tests.

Run: python -m unittest discover -s tests -v
No real PayPal network requests are made.
"""
import json
import os
import unittest
from unittest.mock import patch

import app as server
from paypal_sandbox import SANDBOX_API, verify_test_subscription


class FakeResponse:
    def __init__(self, value):
        self.body = json.dumps(value).encode("utf-8")

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def read(self, size=-1):
        return self.body[:size]


class SandboxCheckoutTests(unittest.TestCase):
    env = {
        "VERCEL_ENV": "preview",
        "PAYPAL_MODE": "sandbox",
        "PAYPAL_CLIENT_ID": "A" * 40,
        "PAYPAL_CLIENT_SECRET": "secret-value-do-not-expose",
        "PAYPAL_PREMIUM_PLAN_ID": "P-1234567890123456789",
        "ALENAZ_SANDBOX_SESSION_SECRET": "S" * 48,
    }

    def setUp(self):
        server.app.config["TESTING"] = True
        self.original_secret = server.app.secret_key
        server.app.secret_key = "S" * 48
        self.client = server.app.test_client()
        server.usage.clear()

    def tearDown(self):
        server.app.secret_key = self.original_secret

    def bind_checkout(self, checkout_ref="session-bound-checkout-reference-12345"):
        with self.client.session_transaction() as browser_session:
            browser_session["sandbox_checkout_ref"] = checkout_ref
        return checkout_ref

    def test_missing_plan_id_disables_checkout_without_secrets(self):
        env = dict(self.env)
        env.pop("PAYPAL_PREMIUM_PLAN_ID")
        with patch.dict(os.environ, env, clear=True):
            response = self.client.get("/api/paypal/sandbox-config")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json["enabled"])
        self.assertIn("PAYPAL_PREMIUM_PLAN_ID (Sandbox)", response.json["missing"])
        self.assertNotIn("secret-value-do-not-expose", response.get_data(as_text=True))
        self.assertNotIn("client_id", response.json)

    def test_configured_preview_only_shares_public_client_id(self):
        with patch.dict(os.environ, self.env, clear=True), patch.object(
                server, "verify_sandbox_plan", return_value=True):
            response = self.client.get("/api/paypal/sandbox-config")
        self.assertTrue(response.json["enabled"])
        self.assertEqual(response.json["client_id"], "A" * 40)
        self.assertEqual(response.json["plan_id"], self.env["PAYPAL_PREMIUM_PLAN_ID"])
        self.assertNotIn("client_secret", response.json)
        self.assertNotIn("secret-value-do-not-expose", response.get_data(as_text=True))

    def test_live_and_production_always_disabled(self):
        for changes in ({"PAYPAL_MODE": "live"}, {"VERCEL_ENV": "production"}):
            env = dict(self.env, **changes)
            with patch.dict(os.environ, env, clear=True):
                response = self.client.get("/api/paypal/sandbox-config")
                check = self.client.post("/api/paypal/sandbox-verify",
                                         json={"subscription_id": "I-1234567890123"})
            self.assertFalse(response.json["enabled"])
            self.assertEqual(check.status_code, 503)

    def test_bad_subscription_ids_rejected_before_paypal_calls(self):
        self.bind_checkout()
        with patch.dict(os.environ, self.env, clear=True):
            for payload in ({}, {"subscription_id": ""}, {"subscription_id": "X-123"},
                            {"subscription_id": "I-ABC", "other": "evil"}):
                response = self.client.post("/api/paypal/sandbox-verify", json=payload)
                self.assertEqual(response.status_code, 400)

    def test_origin_guard_prevents_cross_site_verification(self):
        with patch.dict(os.environ, self.env, clear=True):
            response = self.client.post("/api/paypal/sandbox-verify",
                json={"subscription_id": "I-1234567890123"},
                headers={"Origin": "https://attacker.example"})
        self.assertEqual(response.status_code, 403)

    def test_paypal_status_verified_read_only(self):
        nonce = self.bind_checkout()
        calls = []
        responses = [
            FakeResponse({"access_token": "fake-token"}),
            FakeResponse({"plan_id": self.env["PAYPAL_PREMIUM_PLAN_ID"], "status": "ACTIVE", "custom_id": nonce})
        ]
        def fake_urlopen(req, timeout):
            calls.append(req)
            return responses.pop(0)
        with patch.dict(os.environ, self.env, clear=True), patch(
                "paypal_sandbox.urlopen", side_effect=fake_urlopen):
            response = self.client.post("/api/paypal/sandbox-verify",
                json={"subscription_id": "I-1234567890123"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["status"], "ACTIVE")
        self.assertTrue(response.json["sandbox_verified"])
        self.assertTrue(response.json["test_premium_active"])
        self.assertFalse(response.json["premium_unlocked"])
        with patch.dict(os.environ, self.env, clear=True):
            entitled = self.client.get("/api/paypal/sandbox-entitlement")
        self.assertTrue(entitled.json["test_premium_active"])
        self.assertEqual(len(calls), 2)
        self.assertTrue(all(req.full_url.startswith(SANDBOX_API) for req in calls))
        self.assertNotIn("secret-value-do-not-expose", response.get_data(as_text=True))

    def test_mismatched_plan_fails_closed(self):
        self.bind_checkout()
        responses = [
            FakeResponse({"access_token": "fake-token"}),
            FakeResponse({"plan_id": "P-9999999999999999999", "status": "ACTIVE"})
        ]
        with patch.dict(os.environ, self.env, clear=True), patch(
                "paypal_sandbox.urlopen", side_effect=lambda *a, **k: responses.pop(0)):
            response = self.client.post("/api/paypal/sandbox-verify",
                json={"subscription_id": "I-1234567890123"})
        self.assertEqual(response.status_code, 400)
        self.assertNotIn("premium_unlocked", response.json)


    def test_subscription_id_without_checkout_nonce_rejected(self):
        with patch.dict(os.environ, self.env, clear=True):
            response = self.client.post("/api/paypal/sandbox-verify",
                json={"subscription_id": "I-1234567890123"})
        self.assertEqual(response.status_code, 403)

    def test_free_user_cannot_send_premium_personalization(self):
        with patch.dict(os.environ, self.env, clear=True):
            response = self.client.post("/api/chat_stream", json={
                "message": "Hello", "personalization": {"memory": "my secret notes"}
            })
        self.assertEqual(response.status_code, 403)
        self.assertIn(b"requires a verified", response.data)

    def test_checkout_returns_random_session_reference_not_membership(self):
        with patch.dict(os.environ, self.env, clear=True), patch.object(
                server, "verify_sandbox_plan", return_value=True):
            result = self.client.post("/api/paypal/sandbox-start", json={})
        self.assertEqual(result.status_code, 200)
        self.assertGreaterEqual(len(result.json["checkout_ref"]), 24)
        with patch.dict(os.environ, self.env, clear=True):
            entitlement = self.client.get("/api/paypal/sandbox-entitlement")
        self.assertFalse(entitlement.json["test_premium_active"])

    def test_paypal_subscription_cannot_be_replayed_from_another_browser(self):
        nonce = self.bind_checkout("different-checkout-nonce-9876543210")
        with patch.dict(os.environ, self.env, clear=True), patch.object(
                server, "verify_test_subscription",
                side_effect=ValueError("Sandbox subscription does not belong to this checkout session.")):
            response = self.client.post("/api/paypal/sandbox-verify",
                json={"subscription_id": "I-1234567890123"})
        self.assertEqual(response.status_code, 400)
        with patch.dict(os.environ, self.env, clear=True):
            self.assertFalse(self.client.get("/api/paypal/sandbox-entitlement").json["test_premium_active"])


if __name__ == "__main__":
    unittest.main()
