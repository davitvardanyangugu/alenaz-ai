import getpass
import sys

import keyring

SERVICE = "Alenaz AI"
ACCOUNT = "OPENAI_API_KEY"


def main():
    print("Alenaz secure API-key setup")
    print("Your key will be stored in macOS Keychain and will not be written to GitHub.")
    print("The characters you type/paste below are hidden.")

    key = getpass.getpass("OpenAI API key: ").strip()

    if not key:
        print("No key entered. Nothing was changed.")
        return 1

    if len(key) < 20:
        print("That value looks too short to be an API key. Nothing was saved.")
        return 1

    try:
        keyring.set_password(SERVICE, ACCOUNT, key)
    except Exception as exc:
        print(f"Could not save the key to Keychain: {exc}")
        return 1

    saved = keyring.get_password(SERVICE, ACCOUNT)
    if saved != key:
        print("Keychain verification failed. Nothing else was changed.")
        return 1

    print("Success: the API key is stored securely in macOS Keychain.")
    print("Now run: python3 app.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
