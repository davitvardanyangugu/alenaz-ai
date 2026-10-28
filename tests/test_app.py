"""Alenaz request validation, privacy and smoke tests.

Run with: python -m unittest discover -s tests -v
All AI calls are mocked; no credentials or paid provider requests are needed.
"""
import base64
import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import app as server


class AlenazAPITests(unittest.TestCase):
    def setUp(self):
        server.app.config["TESTING"] = True
        self.client = server.app.test_client()
        server.usage.clear()

    def fake_client(self, *, response=None, error=None):
        client = SimpleNamespace(
            responses=SimpleNamespace(
                create=MagicMock(side_effect=error) if error else MagicMock(return_value=response)
            ),
            images=SimpleNamespace(
                generate=MagicMock(side_effect=error) if error else MagicMock(return_value=response)
            ),
        )
        return client

    def test_home_and_health_headers(self):
        page = self.client.get("/")
        self.assertEqual(page.status_code, 200)
        self.assertIn(b"alenaz", page.data.lower())
        self.assertEqual(page.headers["X-Frame-Options"], "DENY")
        self.assertEqual(page.headers["X-Content-Type-Options"], "nosniff")
        self.assertIn("script-src 'self'", page.headers["Content-Security-Policy"])
        health = self.client.get("/api/health")
        self.assertEqual(health.status_code, 200)
        self.assertEqual(health.headers["Cache-Control"], "no-store")
        self.assertEqual(health.json["name"], "Alenaz")

    def test_invalid_content_type_and_nonobject_json(self):
        response = self.client.post("/api/chat_stream", data="plain text")
        self.assertEqual(response.status_code, 400)
        self.assertIn("Content-Type", response.json["error"])
        for payload in ('[]', '"str"', 'null'):
            response = self.client.post(
                "/api/search",
                data=payload,
                content_type="application/json",
            )
            self.assertEqual(response.status_code, 400)
        self.assertFalse(server.usage)

    def test_oversize_json_has_clear_error(self):
        response = self.client.post(
            "/api/chat_stream",
            data="x" * (12 * 1024 * 1024 + 1),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 413)
        self.assertIn("too large", response.json["error"].lower())

    def test_cross_origin_requests_denied(self):
        response = self.client.post(
            "/api/image",
            json={"prompt": "A beach"},
            headers={"Origin": "https://not-alenaz.example"},
        )
        self.assertEqual(response.status_code, 403)
        response = self.client.post(
            "/api/image",
            json={"prompt": "A beach"},
            headers={"Sec-Fetch-Site": "cross-site"},
        )
        self.assertEqual(response.status_code, 403)
        self.assertFalse(server.usage)

    def test_message_history_and_mode_validation(self):
        invalid = [
            {"message": [1, 2]},
            {"message": "hello", "history": "not a list"},
            {"message": "hello", "mode": "root"},
            {"message": "hello", "mode": ["auto"]},
            {"message": "x" * 12001},
            {"message": " "},
        ]
        for payload in invalid:
            with self.subTest(payload=str(payload)[:60]):
                response = self.client.post("/api/chat_stream", json=payload)
                self.assertEqual(response.status_code, 400)

    def test_valid_upload_and_windows_filename(self):
        contents = base64.b64encode(b"image-payload").decode("ascii")
        payload = {
            "message": "Describe it",
            "attachment": {
                "name": "C:\\Users\\me\\picture.png",
                "type": "image/png",
                "data": "data:image/png;base64," + contents,
            },
        }
        result = server.build_input(payload)
        self.assertEqual(result[-1]["content"][0]["text"], "Describe it")
        self.assertEqual(result[-1]["content"][1]["type"], "input_image")
        filename = server.validated_attachment(payload["attachment"])["name"]
        self.assertEqual(filename, "picture.png")

    def test_attachment_rejection(self):
        data = base64.b64encode(b"abc").decode("ascii")
        bad_attachments = [
            "bad",
            {"name": "a.exe", "type": "application/octet-stream",
             "data": "data:application/octet-stream;base64," + data},
            {"name": "a.pdf", "type": "application/pdf",
             "data": "data:image/png;base64," + data},
            {"name": "a.png", "type": "image/png",
             "data": "data:image/png;base64,INVALID!!!"},
        ]
        for attachment in bad_attachments:
            with self.subTest(attachment=str(attachment)[:50]):
                response = self.client.post(
                    "/api/search", json={"message": "Explain", "attachment": attachment}
                )
                self.assertEqual(response.status_code, 400)

    def test_image_prompt_validation(self):
        for payload in [
            {}, {"prompt": 123}, {"prompt": " "},
            {"prompt": "a" * 4001},
        ]:
            with self.subTest(payload=str(payload)[:45]):
                response = self.client.post("/api/image", json=payload)
                self.assertEqual(response.status_code, 400)

    def test_urls_must_be_safe_http_links(self):
        for value in ["javascript:alert(1)", "data:text/html,test", "file:///etc/passwd",
                      "https://alice:password@example.com", "https://example.com\\nother"]:
            self.assertFalse(server.safe_http_url(value), value)
        self.assertTrue(server.safe_http_url("https://example.com/article"))
        self.assertTrue(server.safe_http_url("http://example.com/path"))

    def test_search_filters_untrusted_source_links(self):
        def citation(url):
            return SimpleNamespace(
                type="url_citation", url=url,
                title="Example source", start_index=0, end_index=5,
            )
        part = SimpleNamespace(
            annotations=[
                citation("javascript:alert(1)"),
                citation("https://example.com/article"),
            ]
        )
        reply = SimpleNamespace(
            output_text="A result.",
            output=[SimpleNamespace(type="message", content=[part])]
        )
        fake = self.fake_client(response=reply)
        with patch.object(server, "require_client", return_value=(fake, None)):
            response = self.client.post("/api/search", json={"message": "Search now"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json["sources"]), 1)
        self.assertEqual(response.json["sources"][0]["url"], "https://example.com/article")

    def test_chat_stream_respects_identity(self):
        chunks = iter([
            SimpleNamespace(type="response.output_text.delta", delta="I am Alenaz.")
        ])
        fake = self.fake_client(response=chunks)
        with patch.object(server, "require_client", return_value=(fake, None)):
            response = self.client.post("/api/chat_stream", json={"message": "Who are you?"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_data(as_text=True), "I am Alenaz.")
        self.assertIn("David Vardanyan",
                      fake.responses.create.call_args.kwargs["instructions"])

    def test_provider_failures_do_not_expose_exception_text(self):
        secret = "SECRET_TEST_DO_NOT_EXPOSE"
        fake = self.fake_client(error=RuntimeError(secret))
        with patch.object(server, "require_client", return_value=(fake, None)):
            research = self.client.post("/api/search", json={"message": "Some research"})
            image = self.client.post("/api/image", json={"prompt": "A red dragon"})
            streamed = self.client.post("/api/chat_stream", json={"message": "Hello"})
        for response in (research, image, streamed):
            self.assertNotIn(secret.encode(), response.data)
        self.assertEqual(research.status_code, 502)
        self.assertEqual(image.status_code, 502)
        self.assertEqual(streamed.status_code, 200)
        self.assertIn(b"temporarily unavailable", streamed.data)

    def test_valid_request_uses_quota_only_after_validation(self):
        response = self.client.post("/api/image", json={"prompt": ["invalid"]})
        self.assertEqual(response.status_code, 400)
        self.assertFalse(server.usage)


if __name__ == "__main__":
    unittest.main()
