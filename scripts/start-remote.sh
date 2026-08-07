#!/usr/bin/env bash
set -euo pipefail

# Start an ngrok tunnel to the Expo dev server (Metro) so the app can be
# opened from anywhere (e.g. while away from home with the PC on).
#
# Usage:
#   ./scripts/start-remote.sh                          # random URL (free plan)
#   NGROK_STATIC_DOMAIN=myapp.ngrok.app ./scripts/start-remote.sh  # pinned URL
#
# The exp:// URL is written to ./remote-url.txt and printed at the end.
# Stop everything with ./scripts/stop-remote.sh

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="${TMPDIR:-/tmp}"
NGROK_LOG="$LOG_DIR/ngrok.log"
METRO_LOG="$LOG_DIR/opencode_metro.log"
PORT=8081

echo "==> Stopping any existing Metro / ngrok..."
"$ROOT/scripts/stop-remote.sh" || true
sleep 1

echo "==> Starting ngrok tunnel on :$PORT ..."
if [[ -n "${NGROK_STATIC_DOMAIN:-}" ]]; then
  setsid nohup ngrok http "$PORT" --url="$NGROK_STATIC_DOMAIN" --log stdout >"$NGROK_LOG" 2>&1 </dev/null &
else
  setsid nohup ngrok http "$PORT" --log stdout >"$NGROK_LOG" 2>&1 </dev/null &
fi

TUNNEL_URL=""
for _ in $(seq 1 30); do
  TUNNEL_URL="$(curl -s http://127.0.0.1:4040/api/tunnels | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{const t=JSON.parse(d).tunnels.filter(x=>x.proto==="https")[0];process.stdout.write(t?t.public_url:"")}catch{}})' || true)"
  [[ -n "$TUNNEL_URL" ]] && break
  sleep 1
done
if [[ -z "$TUNNEL_URL" ]]; then
  echo "ERROR: ngrok did not create a tunnel. See $NGROK_LOG"; exit 1
fi
echo "    tunnel: $TUNNEL_URL"

HOST="$(echo "$TUNNEL_URL" | sed -E 's|https?://||')"

echo "==> Starting Metro pointed at the tunnel..."
setsid nohup env EXPO_PACKAGER_PROXY_URL="$TUNNEL_URL" npx expo start --port "$PORT" >"$METRO_LOG" 2>&1 </dev/null &

code=""
for _ in $(seq 1 60); do
  code="$(curl -s -o /dev/null -w '%{http_code}' -H 'Expo-Platform: android' "$TUNNEL_URL/" --max-time 10 || true)"
  [[ "$code" == "200" ]] && break
  sleep 2
done
if [[ "$code" != "200" ]]; then
  echo "ERROR: Metro did not answer through the tunnel. See $METRO_LOG"; exit 1
fi

echo "exp://$HOST" >"$ROOT/remote-url.txt"
echo
echo "==========================================="
echo " App is running remotely."
echo " On your phone, open Expo Go and enter:"
echo
echo "   exp://$HOST"
echo
echo " (Stored in ./remote-url.txt)"
echo "==========================================="
