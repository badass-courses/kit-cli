# kit-cli

Effect-powered CLI wrapper around the Kit API v4, with agent-friendly JSON output and a few launch-ops helpers for broadcast drafts.

## Install

### From GitHub with Bun

```bash
bun install -g github:badass-courses/kit-cli
```

This installs both binaries:

```bash
kit --help
kit-cli --help
```

### Local development install

```bash
git clone https://github.com/badass-courses/kit-cli.git
cd kit-cli
bun install
bun run build
bun link
```

## Auth

Use a Kit API key from the environment:

```bash
KIT_API_KEY="..." kit whoami --auth api-key
```

Or store one with the CLI:

```bash
kit auth api set --api-key "..."
kit whoami --auth api-key
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

## Development

```bash
bun install
bun run typecheck
bun run test
bun run build
```

The generated Kit operation list is built from `openapi/kit-v4.json`:

```bash
bun run gen
```
