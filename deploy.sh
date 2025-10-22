#!/usr/bin/env bash
# Simple deploy script for AlmaLinux - bun only
# Place this on the server in the repo directory and make it executable: chmod +x deploy.sh

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
BRANCH=${1:-main}

echo "Deploying branch: $BRANCH in $REPO_DIR"

cd "$REPO_DIR"

# fetch & reset to remote branch
git fetch origin $BRANCH
git reset --hard origin/$BRANCH

# install dependencies with bun
if command -v bun >/dev/null 2>&1; then
  echo "Installing backend dependencies with bun..."
  bun install
else
  echo "ERROR: bun is required but not found. Please install bun: https://bun.sh"
  exit 1
fi

# build frontend
echo "Building frontend..."
cd frontend
bun install
VITE_BASE_PATH=/ bun run build
cd ..

# reload via pm2
if command -v pm2 >/dev/null 2>&1; then
  echo "Reloading pm2 process..."
  pm2 startOrReload ecosystem.config.js --env production
  pm2 save
else
  echo "ERROR: pm2 is required but not found. Please install pm2: bun add -g pm2"
  exit 1
fi

echo "Deploy complete"
