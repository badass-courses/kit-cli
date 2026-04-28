# kit-cli

Effect-powered CLI wrapper around the Kit API v4, with agent-friendly JSON output and launch-ops helpers for broadcast drafts.

## Install

### npm package

```bash
bun install -g kit-cli
```

This installs both binaries:

```bash
kit --help
kit-cli --help
```

The npm/GitHub package executes `src/index.ts` directly via Bun, so Bun must be installed and on your `PATH`. Use the standalone GitHub release binaries if you want the Bun runtime embedded.

### Standalone binaries with Bun runtime embedded

GitHub releases include standalone binaries compiled with `bun build --compile`, so the Bun runtime is embedded.

Download the right asset from the latest release:

- `kit-darwin-arm64` / `kit-cli-darwin-arm64`
- `kit-darwin-x64` / `kit-cli-darwin-x64`
- `kit-linux-arm64` / `kit-cli-linux-arm64`
- `kit-linux-x64` / `kit-cli-linux-x64`

Example:

```bash
curl -L https://github.com/badass-courses/kit-cli/releases/latest/download/kit-darwin-arm64 -o /usr/local/bin/kit
chmod +x /usr/local/bin/kit
kit --help
```

### From GitHub with Bun

```bash
bun install -g github:badass-courses/kit-cli#main
```

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
kit whoami --auth api-key
```

`kit account use <id-or-alias>` sets the default Kit account in `~/.config/kit-cli/config.json`. API keys live in `~/.config/kit-cli/credentials.json` under provider keys like `kit:code-with-antonio`.

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
2. runs typecheck and tests
3. publishes the Bun-source npm package with `bun publish --access public`
4. compiles standalone Linux/macOS binaries with the Bun runtime embedded
5. uploads binaries and checksums to the GitHub release

Required repo secret:

- `NPM_TOKEN` with publish rights for the `kit-cli` package

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
