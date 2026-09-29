#!/bin/bash
set -e

cd "$(dirname "$0")"

if [ ! -d "venv" ]; then
  echo "Alenaz is not set up yet. Running setup first..."
  bash setup_mac.sh
fi

source venv/bin/activate

if ! python check_key.py 2>/dev/null | grep -q "^configured$"; then
  echo "No API key found. Opening secure Keychain setup..."
  python setup_key.py
fi

echo
echo "Starting Alenaz..."
echo "Open: http://localhost:5050"
echo "Press Control+C here to stop Alenaz."
echo

python app.py
