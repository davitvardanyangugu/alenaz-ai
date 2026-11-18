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
    }

    def setUp(self):
        server.app.config["TESTING"] = True
        self.client = server.app.test_client()
        server.usage.clear()

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
        with patch.dict(os.environ, self.env, clear=True):
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
        calls = []
        responses = [
            FakeResponse({"access_token": "fake-token"}),
            FakeResponse({"plan_id": self.env["PAYPAL_PREMIUM_PLAN_ID"], "status": "ACTIVE"})
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
        self.assertFalse(response.json["premium_unlocked"])
        self.assertEqual(len(calls), 2)
        self.assertTrue(all(req.full_url.startswith(SANDBOX_API) for req in calls))
        self.assertNotIn("secret-value-do-not-expose", response.get_data(as_text=True))

    def test_mismatched_plan_fails_closed(self):
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


if __name__ == "__main__":
    unittest.main()
