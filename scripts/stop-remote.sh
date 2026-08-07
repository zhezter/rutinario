#!/usr/bin/env bash
set -u

pkill -f "[n]grok http" 2>/dev/null || true
pkill -f "[e]xpo start" 2>/dev/null || true
sleep 1
echo "Stopped Metro and ngrok."
