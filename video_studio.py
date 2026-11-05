"""Video Studio API: disabled until an officially supported provider is configured.

The Sora 2 Videos API was retired September 24, 2026. Never bill users or
submit jobs through a retired endpoint. This module deliberately provides a
safe capability contract, not a fake rendering service.
"""
from flask import Blueprint, jsonify, request

video_studio = Blueprint("video_studio", __name__, url_prefix="/api/videos")

@video_studio.get("/capabilities")
def capabilities():
    return jsonify({
        "enabled": False,
        "provider": "openai",
        "model": None,
        "reason": "OpenAI retired the Sora 2 Videos API on September 24, 2026. No supported replacement has been announced.",
        "billing_enabled": False,
        "pricing_verified": False,
        "max_seconds": None,
        "documentation": "https://developers.openai.com/api/docs/deprecations"
    })

@video_studio.post("")
def create_video():
    return jsonify({"error": "Video generation is unavailable. No paid job was started.", "code": "VIDEO_PROVIDER_UNAVAILABLE"}), 503

@video_studio.get("/<video_id>")
def get_video(video_id):
    return jsonify({"error": "No video jobs can be created while the provider is unavailable.", "code": "VIDEO_PROVIDER_UNAVAILABLE"}), 503

@video_studio.get("/<video_id>/content")
def download_video(video_id):
    return jsonify({"error": "Video downloads are unavailable until a supported provider is connected.", "code": "VIDEO_PROVIDER_UNAVAILABLE"}), 503
