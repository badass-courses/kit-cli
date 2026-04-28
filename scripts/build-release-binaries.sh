#!/usr/bin/env bash
set -euo pipefail

mkdir -p release

bun build src/index.ts --compile --target=bun-linux-x64 --outfile release/kit-linux-x64
bun build src/index.ts --compile --target=bun-linux-arm64 --outfile release/kit-linux-arm64
bun build src/index.ts --compile --target=bun-darwin-x64 --outfile release/kit-darwin-x64
bun build src/index.ts --compile --target=bun-darwin-arm64 --outfile release/kit-darwin-arm64

cp release/kit-linux-x64 release/kit-cli-linux-x64
cp release/kit-linux-arm64 release/kit-cli-linux-arm64
cp release/kit-darwin-x64 release/kit-cli-darwin-x64
cp release/kit-darwin-arm64 release/kit-cli-darwin-arm64

shasum -a 256 release/* > release/SHA256SUMS
