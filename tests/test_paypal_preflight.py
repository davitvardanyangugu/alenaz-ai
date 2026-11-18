"""Preflight checks for sandbox billing plan verification. No external requests."""
import unittest
from unittest.mock import patch
from paypal_sandbox import verify_sandbox_plan, SANDBOX_API


class SandboxPlanTests(unittest.TestCase):
    def test_accepted_monthly_plan_and_rejected_wrong_amount(self):
        plan_id = "P-1234567890123456789"
        plan = {
            "id": plan_id, "status": "ACTIVE",
            "billing_cycles": [{
                "tenure_type": "REGULAR", "total_cycles": 0,
                "frequency": {"interval_unit": "MONTH", "interval_count": 1},
                "pricing_scheme": {
                    "fixed_price": {"currency_code": "USD", "value": "9.99"}
                }
            }]
        }
        calls = []

        def fake_fetch(request):
            calls.append(request.full_url)
            return {"access_token": "testing"} if request.full_url.endswith("/v1/oauth2/token") else plan

        with patch("paypal_sandbox._fetch_json", side_effect=fake_fetch):
            self.assertTrue(verify_sandbox_plan("A" * 40, "placeholder", plan_id))
        self.assertEqual(len(calls), 2)
        self.assertTrue(all(url.startswith(SANDBOX_API) for url in calls))

        plan["billing_cycles"][0]["pricing_scheme"]["fixed_price"]["value"] = "99.99"
        with patch("paypal_sandbox._fetch_json", side_effect=fake_fetch):
            with self.assertRaises(ValueError):
                verify_sandbox_plan("A" * 40, "placeholder", plan_id)

    def test_live_plan_not_found_blocks(self):
        with patch("paypal_sandbox._fetch_json", side_effect=[
                {"access_token": "testing"}, {"status": "ACTIVE", "id": "P-0000000000000000000"}]):
            with self.assertRaises(ValueError):
                verify_sandbox_plan("A" * 40, "placeholder", "P-1234567890123456789")


if __name__ == "__main__":
    unittest.main()
