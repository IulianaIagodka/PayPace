#!/usr/bin/env bash
# Local Mac production IPA → TestFlight (free; no EAS cloud minutes).
# Usage (from repo root):
#   npm run build:ios:local:submit
#   ./scripts/build-ios-local.sh
#   ./scripts/build-ios-local.sh --no-pull
#   ./scripts/build-ios-local.sh --no-submit

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DO_PULL=1
DO_SUBMIT=1
IPA_PATH="$ROOT/PayPace.ipa"

for arg in "$@"; do
  case "$arg" in
    --no-pull) DO_PULL=0 ;;
    --no-submit) DO_SUBMIT=0 ;;
    -h|--help)
      echo "Usage: $0 [--no-pull] [--no-submit]"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 1
      ;;
  esac
done

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This script only runs on a Mac with Xcode." >&2
  exit 1
fi

export EAS_BUILD_NO_EXPO_GO_WARNING=true
export LANG="${LANG:-en_US.UTF-8}"
export LC_ALL="${LC_ALL:-en_US.UTF-8}"

# Load local secrets for the production build (gitignored .env).
if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
  echo "Loaded .env"
else
  echo "No .env found — relying on EAS production env vars if configured."
fi

if [[ "$DO_PULL" -eq 1 ]]; then
  echo "→ git pull"
  git pull --ff-only
fi

echo "→ npm install"
npm install

KEYCHAIN="${HOME}/Library/Keychains/login.keychain-db"
if [[ -f "$KEYCHAIN" ]]; then
  echo "→ unlock login keychain (enter Mac password if prompted)"
  security unlock-keychain "$KEYCHAIN" || true
fi

rm -f "$IPA_PATH"

echo "→ eas build --local → $IPA_PATH"
npx eas-cli build \
  --platform ios \
  --profile production \
  --local \
  --non-interactive \
  --output "$IPA_PATH"

if [[ ! -f "$IPA_PATH" ]]; then
  echo "IPA not found at $IPA_PATH" >&2
  exit 1
fi

echo "IPA ready: $IPA_PATH"

if [[ "$DO_SUBMIT" -eq 1 ]]; then
  echo "→ submit to TestFlight"
  npx eas-cli submit \
    --platform ios \
    --profile production \
    --path "$IPA_PATH" \
    --non-interactive
  echo "Done. Check App Store Connect / TestFlight."
else
  echo "Skipped submit. Later:"
  echo "  npx eas-cli submit --platform ios --profile production --path \"$IPA_PATH\""
fi
