#!/usr/bin/env bash
# Install agent-sdlc for development in this repository.
# Delegates to the Node installer (cross-platform, testable).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_ROOT}"

if [[ ! -d node_modules ]]; then
  npm install
fi

exec npm run install:plugin -- --mode dev "$@"
