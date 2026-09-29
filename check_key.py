from app import get_api_key

print("configured" if get_api_key() else "not configured")
