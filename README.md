# Elysia with Bun runtime

## Requirements

This project requires **bun** to be installed. Install it from [https://bun.sh](https://bun.sh)

## Getting Started

To get started with this template, simply paste this command into your terminal:

```bash
bun create elysia ./elysia-example
```

## Development

To start the development server run:

```bash
bun run dev
```

Open http://localhost:3000/ with your browser to see the result.

# Translations API

...existing README content...

## Deployment (AlmaLinux) — PM2 + Bun

Quick steps:

1. On the server, clone the repo into the desired path.
2. Install runtime tools: bun and pm2.
   - Install bun: `curl -fsSL https://bun.sh/install | bash`
   - Install pm2: `bun add -g pm2@5.4.2`
3. Copy `ecosystem.config.js` and `deploy.sh` are already in repo.
4. Make `deploy.sh` executable: `chmod +x deploy.sh`
5. Create a system user and set up SSH key for GitHub Actions.
6. Add GitHub Actions secrets:
   - `DEPLOY_HOST` — server IP or DNS
   - `DEPLOY_USER` — ssh user
   - `DEPLOY_KEY` — private key (PEM)
   - `DEPLOY_PORT` — ssh port (optional)
   - `DEPLOY_PATH` — absolute path to the repo on the server
7. On push to `main`, the workflow will SSH to the server and run `./deploy.sh main` which:
   - fetches the latest code
   - installs deps with bun
   - runs `pm2 startOrReload ecosystem.config.js`

Notes:

- `ecosystem.config.js` uses `bun` as the interpreter exclusively.
- PM2 version 5.4.2 is recommended for better bun compatibility.
- You can instead configure a GitHub webhook and a lightweight webhook handler on the server to call `./deploy.sh` on push.
