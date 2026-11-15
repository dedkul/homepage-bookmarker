#!/bin/sh
# Builds lumen-<version>.zip for the Chrome Web Store from extension/.
# Leaves out local-only files (config.local.js holds a dev key; it must never ship).
set -e
cd "$(dirname "$0")/.."
v=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' extension/manifest.json)
out="lumen-$v.zip"
rm -f "$out"
(cd extension && zip -qr "../$out" . -x "config.local.js" -x "*.DS_Store")
if unzip -l "$out" | grep -q "config.local.js"; then echo "config.local.js leaked into $out" >&2; rm -f "$out"; exit 1; fi
echo "Built $out"; unzip -l "$out" | tail -1
