"""Voice API smoke checks; provider calls are mocked to avoid charges.

Run with: python -m unittest discover -s tests -v
"""
import io
import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import app as server


class AlenazVoiceTests(unittest.TestCase):
    def setUp(self):
        server.app.config["TESTING"] = True
        self.client = server.app.test_client()
        server.usage.clear()

    def fake_provider(self):
        return SimpleNamespace(
            audio=SimpleNamespace(
                speech=SimpleNamespace(create=MagicMock(return_value=io.BytesIO(b"fake-mp3-data"))),
                transcriptions=SimpleNamespace(create=MagicMock(
                    return_value=SimpleNamespace(text="Բարև, Alenaz!")))
            )
        )

    def test_speech_requires_text_and_voice_allowlist(self):
        bad = self.client.post("/api/voice/speak", json={"text": "", "voice": "marin"})
        self.assertEqual(bad.status_code, 400)
        bad_voice = self.client.post("/api/voice/speak", json={
            "text": "Hello", "voice": "unapproved"})
        self.assertEqual(bad_voice.status_code, 400)
        bad_speed = self.client.post("/api/voice/speak", json={
            "text": "Hello", "voice": "marin", "speed": -1})
        self.assertEqual(bad_speed.status_code, 400)
        too_long = self.client.post("/api/voice/speak", json={
            "text": "a" * (server.MAX_SPOKEN_CHARS + 1), "voice": "marin"})
        self.assertEqual(too_long.status_code, 400)

    def test_speech_returns_mp3_with_no_cache(self):
        mocked = self.fake_provider()
        with patch.object(server, "require_client", return_value=(mocked, None)):
            resp = self.client.post("/api/voice/speak", json={
                "text": "Բարև, Հայաստան", "voice": "cedar", "speed": 1.0})
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.content_type.startswith("audio/mpeg"))
        self.assertEqual(resp.data, b"fake-mp3-data")
        self.assertEqual(resp.headers["Cache-Control"], "no-store")
        self.assertEqual(mocked.audio.speech.create.call_args.kwargs["voice"], "cedar")

    def test_transcription_requires_supported_short_audio(self):
        missing = self.client.post("/api/voice/transcribe", data={})
        self.assertEqual(missing.status_code, 400)
        bad = self.client.post("/api/voice/transcribe", data={
            "audio": (io.BytesIO(b"hello"), "test.txt", "text/plain")
        })
        self.assertEqual(bad.status_code, 400)
        too_big = self.client.post("/api/voice/transcribe", data={
            "audio": (io.BytesIO(b"x" * (server.MAX_AUDIO_UPLOAD_BYTES + 1)),
                      "test.webm", "audio/webm")
        })
        self.assertEqual(too_big.status_code, 400)

    def test_transcription_returns_multilingual_text(self):
        mocked = self.fake_provider()
        with patch.object(server, "require_client", return_value=(mocked, None)):
            resp = self.client.post("/api/voice/transcribe", data={
                "audio": (io.BytesIO(b"mock-audio"), "recording.webm", "audio/webm")
            })
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json["text"], "Բարև, Alenaz!")
        self.assertEqual(mocked.audio.transcriptions.create.call_args.kwargs["model"],
                         server.STT_MODEL)

    def test_voice_rate_limit(self):
        mocked = self.fake_provider()
        with patch.object(server, "require_client", return_value=(mocked, None)):
            for _ in range(server.TTS_HOURLY_LIMIT):
                self.assertEqual(self.client.post("/api/voice/speak", json={
                    "text": "Hello", "voice": "marin"}).status_code, 200)
            last = self.client.post("/api/voice/speak", json={
                "text": "Hello", "voice": "marin"})
        self.assertEqual(last.status_code, 429)

    def test_voice_endpoints_reject_cross_origin_post(self):
        with patch.object(server, "require_client", return_value=(self.fake_provider(), None)):
            resp = self.client.post("/api/voice/speak", json={"text": "Hi"},
                                    headers={"Origin": "https://malicious.example"})
        self.assertEqual(resp.status_code, 403)


if __name__ == "__main__":
    unittest.main()
