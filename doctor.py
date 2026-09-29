import importlib.util
import platform
import sys

print("Alenaz Doctor")
print("=============")
print(f"Python: {sys.version.split()[0]}")
print(f"System: {platform.system()} {platform.release()}")

required = ["flask", "openai", "dotenv", "keyring"]
missing = [name for name in required if importlib.util.find_spec(name) is None]

if missing:
    print("Dependencies: missing " + ", ".join(missing))
else:
    print("Dependencies: OK")

try:
    from app import CHAT_MODEL, IMAGE_MODEL, get_api_key
    print("API key: configured" if get_api_key() else "API key: NOT configured")
    print(f"Chat model: {CHAT_MODEL}")
    print(f"Image model: {IMAGE_MODEL}")
except Exception as exc:
    print(f"App check failed: {exc}")
