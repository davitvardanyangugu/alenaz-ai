#!/bin/bash
set -e

cd "$(dirname "$0")"

cleanup() {
  if [ -n "$APP_PID" ] && kill -0 "$APP_PID" 2>/dev/null; then
    kill "$APP_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared is not installed."
  echo "Install it with: brew install cloudflared"
  exit 1
fi

if [ ! -d "venv" ]; then
  echo "Alenaz is not set up yet. Running setup..."
  bash setup_mac.sh
fi

source venv/bin/activate

if ! python check_key.py 2>/dev/null | grep -q "^configured$"; then
  echo "No API key found. Opening secure Keychain setup..."
  python setup_key.py
fi

echo "Starting Alenaz locally..."
python app.py > /tmp/alenaz-local.log 2>&1 &
APP_PID=$!

for i in {1..20}; do
  if curl -fsS http://127.0.0.1:5050/api/health >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl -fsS http://127.0.0.1:5050/api/health >/dev/null 2>&1; then
  echo "Alenaz did not start correctly."
  echo "Recent log:"
  tail -n 20 /tmp/alenaz-local.log || true
  exit 1
fi

echo
echo "Alenaz is running."
echo "Cloudflare will print your public URL below."
echo "Keep this terminal open while you want the site online."
echo "Press Control+C to stop both Alenaz and the tunnel."
echo

cloudflared tunnel --url http://localhost:5050
