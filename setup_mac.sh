#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "======================================"
echo "        ALENAZ Mac Setup"
echo "======================================"
echo

if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 was not found."
  echo "Install Python 3, then run this script again."
  exit 1
fi

if [ ! -d "venv" ]; then
  echo "Creating Alenaz virtual environment..."
  python3 -m venv venv
fi

source venv/bin/activate

echo "Updating pip..."
python -m pip install --upgrade pip

echo "Installing Alenaz dependencies..."
python -m pip install -r requirements.txt

echo
python check_key.py || true

if ! python check_key.py 2>/dev/null | grep -q "^configured$"; then
  echo
  echo "Alenaz needs your OpenAI API key."
  echo "It will be saved in macOS Keychain, not GitHub."
  python setup_key.py
fi

echo
echo "Setup complete."
echo "Next time, run:"
echo "  ./start_mac.sh"
echo
