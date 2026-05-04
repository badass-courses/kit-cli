# kit-cli

Effect-powered CLI wrapper around the Kit API v4, with agent-friendly JSON output and launch-ops helpers for broadcast drafts.

## Install

### GitHub Release installer

```bash
curl -fsSL https://raw.githubusercontent.com/badass-courses/kit-cli/main/install.sh | bash
```

This downloads the latest standalone binary from GitHub Releases and installs:

```bash
~/.local/bin/kit
~/.local/bin/kit-cli
```

Options:

```bash
curl -fsSL https://raw.githubusercontent.com/badass-courses/kit-cli/main/install.sh | \
  INSTALL_DIR=/usr/local/bin KIT_CLI_VERSION=v0.2.2 bash
```

GitHub releases include standalone binaries compiled with `bun build --compile`, so Bun is not required to run `kit`.

Release assets:

- `kit-darwin-arm64` / `kit-cli-darwin-arm64`
- `kit-darwin-x64` / `kit-cli-darwin-x64`
- `kit-linux-arm64` / `kit-cli-linux-arm64`
- `kit-linux-x64` / `kit-cli-linux-x64`

### Local development install

```bash
git clone https://github.com/badass-courses/kit-cli.git
cd kit-cli
bun install
bun run build
bun link
```

## Accounts and auth

Store named accounts with short aliases:

```bash
kit account add code-with-antonio --api-key "..." --alias cwa,antonio --name "Code with Antonio"
kit account add totaltypescript-ai-hero --api-key "..." --alias aih,aihero --name "AI Hero / Total TypeScript"
kit account list
kit account use cwa
kit account pin cwa
kit whoami --auth api-key
```

`kit account use <id-or-alias>` sets the user default Kit account in `~/.config/kit-cli/config.json`. `kit account pin <id-or-alias>` writes a project-local `.kit/config.json` for the current directory so repo-specific account selection wins without env vars. API keys live in `~/.config/kit-cli/credentials.json` under provider keys like `kit:code-with-antonio`.

For one-off scripts, you can still use an env var:

```bash
KIT_API_KEY="..." kit whoami --auth api-key
```

## Common commands

```bash
kit whoami --auth api-key
kit bcasts list --auth api-key
kit bcasts text <broadcast-id> --auth api-key
kit bcasts lint <broadcast-id> --auth api-key
kit bcasts replace <broadcast-id> --auth api-key --find "old" --replace "new"
```

All commands return JSON envelopes with `ok`, `command`, `result`, `next_actions`, and structured error details when something fails.

## Broadcast replacement safety

`kit bcasts replace` fetches a broadcast, performs exact HTML content replacements, and PUTs back a safe update payload. It intentionally avoids round-tripping Kit's default `all_subscribers` subscriber filter because Kit's update endpoint only accepts segment or tag filters.

## Release

Releases are tag-driven:

```bash
npm version patch
git push origin main --tags
```

The GitHub Action:

1. installs dependencies with Bun
2. runs typecheck, tests, and build
3. compiles standalone Linux/macOS binaries with the Bun runtime embedded
4. uploads binaries and checksums to the GitHub release

## Development

```bash
bun install
bun run typecheck
bun test
bun run build
```

The generated Kit operation list is built from `openapi/kit-v4.json`:

```bash
bun run gen
```
