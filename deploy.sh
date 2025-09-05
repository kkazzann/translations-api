#!/usr/bin/env bash
# Simple deploy script for AlmaLinux
# Place this on the server in the repo directory and make it executable: chmod +x deploy.sh

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
BRANCH=${1:-main}

echo "Deploying branch: $BRANCH in $REPO_DIR"

cd "$REPO_DIR"

# fetch & reset to remote branch
git fetch origin $BRANCH
git reset --hard origin/$BRANCH

# install dependencies (using bun if available, otherwise fallback to pnpm)
if command -v bun >/dev/null 2>&1; then
  echo "Using bun to install dependencies"
  bun install
else
  if command -v pnpm >/dev/null 2>&1; then
    echo "Using pnpm to install dependencies"
    pnpm install --frozen-lockfile
  else
    echo "No bun or pnpm found - skipping install step"
  fi
fi

# reload via pm2
if command -v pm2 >/dev/null 2>&1; then
  echo "Reloading pm2 process..."
  pm2 startOrReload ecosystem.config.js --env production
  pm2 save
else
  echo "pm2 not installed. Please install pm2 globally: npm i -g pm2"
fi

echo "Deploy complete"
