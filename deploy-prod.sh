#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_ENV="$ROOT_DIR/server/.env"
COMPOSE_FILE="$ROOT_DIR/docker-compose.prod.yml"

if [ ! -f "$SERVER_ENV" ]; then
  echo "Missing server/.env"
  echo "Create it from server/.env.production.example before deploying."
  exit 1
fi

echo "Validating Docker Compose config..."
docker compose -f "$COMPOSE_FILE" config >/dev/null

echo "Building and starting production containers..."
docker compose -f "$COMPOSE_FILE" up --build -d

echo "Deployment command completed."
echo "Open: http://YOUR_SERVER_IP"
