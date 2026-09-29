import keyring

SERVICE = "Alenaz AI"
ACCOUNT = "OPENAI_API_KEY"

try:
    keyring.delete_password(SERVICE, ACCOUNT)
    print("Alenaz API key removed from macOS Keychain.")
except keyring.errors.PasswordDeleteError:
    print("No Alenaz API key was stored in Keychain.")
