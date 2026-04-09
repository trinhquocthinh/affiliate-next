#!/usr/bin/env bash
# Usage:
#   ./scripts/db-push.sh          → push to UAT    (reads .env)
#   ./scripts/db-push.sh prod     → push to PROD   (reads .env.production)
#   ./scripts/db-push.sh uat      → push to UAT    (reads .env)

set -e

ENV="${1:-uat}"

if [[ "$ENV" == "prod" ]]; then
  ENV_FILE=".env.production"
  LABEL="PRODUCTION"
else
  ENV_FILE=".env"
  LABEL="UAT"
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌  $ENV_FILE not found"
  exit 1
fi

# Extract DATABASE_URL from env file
DB_URL=$(grep -E '^DATABASE_URL=' "$ENV_FILE" | sed 's/DATABASE_URL=//;s/^"//;s/"$//')

if [[ -z "$DB_URL" ]]; then
  echo "❌  DATABASE_URL not found in $ENV_FILE"
  exit 1
fi

echo ""
echo "🎯  Target: $LABEL"
echo "📄  Env file: $ENV_FILE"
echo ""

if [[ "$ENV" == "prod" ]]; then
  read -r -p "⚠️  Bạn sắp push schema lên PRODUCTION. Xác nhận? (yes/N): " confirm
  if [[ "$confirm" != "yes" ]]; then
    echo "Cancelled."
    exit 0
  fi
fi

DATABASE_URL="$DB_URL" npx prisma db push --accept-data-loss

echo ""
echo "✅  Done — schema synced to $LABEL"
