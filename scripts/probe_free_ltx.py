"""Read-only diagnostic for a free LTX ZeroGPU Gradio Space.

This probe does not submit jobs, use tokens, or incur generation charges.
Run locally or in a temporary test environment:
    python scripts/probe_free_ltx.py
"""
import json
import urllib.error
import urllib.request

SPACE = "amisima/LTX-2.3-Studio"
API = "https://huggingface.co/api/spaces/" + SPACE
SCHEMA = "https://amisima-ltx-2-3-studio.hf.space/gradio_api/openapi.json"

def fetch_json(url):
    request = urllib.request.Request(url, headers={"User-Agent": "Alenaz-Video-Experiment/1.0"})
    with urllib.request.urlopen(request, timeout=15) as response:
        return json.load(response)

def main():
    try:
        metadata = fetch_json(API)
        print("Space:", SPACE)
        print("Runtime:", metadata.get("runtime", {}).get("stage", "unknown"))
        print("SDK:", metadata.get("sdk", "unknown"))
        print("Hardware:", metadata.get("runtime", {}).get("hardware", "unknown"))
    except (urllib.error.URLError, ValueError, TimeoutError) as exc:
        print("Space metadata unavailable:", type(exc).__name__, str(exc)[:180])
        return 1
    try:
        schema = fetch_json(SCHEMA)
        paths = schema.get("paths", {})
        print("Gradio API paths:", json.dumps(list(paths), indent=2))
        generate = [p for p in paths if "generate" in p.lower()]
        print("Generation endpoints:", generate)
        if not generate:
            print("No generation endpoint found; do not enable integration.")
            return 2
        print("Schema reachable. Next: inspect parameters, output types, license and external-use limits.")
        print("NO VIDEO GENERATION REQUEST WAS SUBMITTED.")
        return 0
    except (urllib.error.URLError, ValueError, TimeoutError) as exc:
        print("Live API schema unavailable:", type(exc).__name__, str(exc)[:180])
        print("Do not enable integration.")
        return 3

if __name__ == "__main__":
    raise SystemExit(main())
