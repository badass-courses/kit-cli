#!/usr/bin/env bash
set -euo pipefail

REPO="badass-courses/kit-cli"
BIN_NAME="kit"
INSTALL_DIR="${INSTALL_DIR:-$HOME/.local/bin}"
VERSION="${KIT_CLI_VERSION:-latest}"

usage() {
  cat <<'EOF'
Install kit-cli from GitHub Releases.

Usage:
  curl -fsSL https://raw.githubusercontent.com/badass-courses/kit-cli/main/install.sh | bash

Options via env:
  INSTALL_DIR=/usr/local/bin   Install directory. Default: ~/.local/bin
  KIT_CLI_VERSION=v0.2.1       Release tag. Default: latest
EOF
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "error: required command not found: $1" >&2
    exit 1
  fi
}

need curl
need uname

os="$(uname -s | tr '[:upper:]' '[:lower:]')"
arch="$(uname -m)"

case "$os" in
  darwin) os="darwin" ;;
  linux) os="linux" ;;
  *) echo "error: unsupported OS: $os" >&2; exit 1 ;;
esac

case "$arch" in
  x86_64|amd64) arch="x64" ;;
  arm64|aarch64) arch="arm64" ;;
  *) echo "error: unsupported architecture: $arch" >&2; exit 1 ;;
esac

asset="kit-${os}-${arch}"
if [[ "$VERSION" == "latest" ]]; then
  url="https://github.com/${REPO}/releases/latest/download/${asset}"
else
  url="https://github.com/${REPO}/releases/download/${VERSION}/${asset}"
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

mkdir -p "$INSTALL_DIR"

echo "Installing kit-cli ${VERSION} (${os}/${arch}) to ${INSTALL_DIR}"
curl -fL "$url" -o "$tmp/kit"
chmod +x "$tmp/kit"

mv "$tmp/kit" "${INSTALL_DIR}/kit"
ln -sf "${INSTALL_DIR}/kit" "${INSTALL_DIR}/kit-cli"

echo "Installed: ${INSTALL_DIR}/kit"
if ! command -v kit >/dev/null 2>&1; then
  echo "Heads up: ${INSTALL_DIR} is not on PATH. Add this to your shell profile:" >&2
  echo "  export PATH=\"${INSTALL_DIR}:\$PATH\"" >&2
fi
