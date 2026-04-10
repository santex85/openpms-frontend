#!/usr/bin/env bash
# Health check for OpenPMS API (Testing Guide §2.5). Uses VITE_API_BASE_URL from .env when set;
# otherwise tries Caddy :80 then direct :8000.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ROOT}/.env"

base_url_from_env() {
  [[ -f "$ENV_FILE" ]] || return 1
  local line
  line="$(grep -E '^[[:space:]]*VITE_API_BASE_URL=' "$ENV_FILE" | tail -1)" || return 1
  local v="${line#*=}"
  v="${v//\"/}"
  v="${v//\'/}"
  v="$(echo -n "$v" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
  [[ -n "$v" ]] || return 1
  echo "${v%/}"
}

url=""
if base="$(base_url_from_env 2>/dev/null)"; then
  url="$base"
else
  for try in "http://127.0.0.1:80" "http://localhost:80" "http://127.0.0.1:8000" "http://localhost:8000"; do
    if curl -fsS -m 3 "$try/health" >/dev/null 2>&1; then
      url="$try"
      echo "No VITE_API_BASE_URL in .env — detected API at $url"
      break
    fi
  done
fi

if [[ -z "$url" ]]; then
  echo "API unreachable. Start the stack (make up), then set VITE_API_BASE_URL in .env — e.g. http://127.0.0.1 for Caddy (TZ-13)." >&2
  exit 1
fi

echo "GET ${url}/health"
body="$(curl -fsS -m 6 "${url}/health")"
echo "$body"
echo "$body" | grep -q '"status"' || exit 1
echo "OK"
