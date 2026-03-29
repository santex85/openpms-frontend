#!/usr/bin/env bash
# Mint an HS256 JWT like OpenPMS (tenant_id + exp) using the same secret as the api container.
# Requires Docker containers from the OpenPMS compose project (default names below).

set -euo pipefail

API_CONTAINER="${OPENPMS_API_CONTAINER:-openpms-api-1}"
DB_CONTAINER="${OPENPMS_DB_CONTAINER:-openpms-db-1}"
FRONTEND_LOGIN_ORIGIN="${OPENPMS_LOGIN_ORIGIN:-http://localhost:5173}"

if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running or not reachable." >&2
  exit 1
fi

for c in "$API_CONTAINER" "$DB_CONTAINER"; do
  if ! docker inspect "$c" >/dev/null 2>&1; then
    echo "Container not found: $c (set OPENPMS_API_CONTAINER / OPENPMS_DB_CONTAINER)" >&2
    exit 21
  fi
done

TENANT="$(
  docker exec "$DB_CONTAINER" psql -U openpms -d openpms -t -A -c \
    "SELECT id FROM tenants WHERE name = 'Demo Hotel Group' LIMIT 1;" 2>/dev/null | tr -d '[:space:]'
)"
if [[ -z "$TENANT" ]]; then
  TENANT="$(
    docker exec "$DB_CONTAINER" psql -U openpms -d openpms -t -A -c \
      "SELECT id FROM tenants LIMIT 1;" 2>/dev/null | tr -d '[:space:]'
  )"
fi

if [[ -z "$TENANT" ]]; then
  echo "No row in tenants. Start OpenPMS and run migrations/seed." >&2
  exit 22
fi

TOKEN="$(
  docker exec -e TENANT_ID="$TENANT" "$API_CONTAINER" python -c "
import jwt, os
from datetime import datetime, timedelta, timezone
secret = os.environ['JWT_SECRET']
tenant_id = os.environ['TENANT_ID']
payload = {'tenant_id': tenant_id, 'exp': datetime.now(timezone.utc) + timedelta(days=365)}
print(jwt.encode(payload, secret, algorithm='HS256'))
"
)"

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required to URL-encode the login link." >&2
  echo ""
  echo "JWT (paste into login field):"
  echo "$TOKEN"
  exit 0
fi

ENC="$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$TOKEN")"

echo "JWT (paste into token field):"
echo "$TOKEN"
echo ""
echo "One-click dev login URL:"
echo "${FRONTEND_LOGIN_ORIGIN}/login#dev_token=${ENC}"
