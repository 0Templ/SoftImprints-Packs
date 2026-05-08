#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/lib/common.sh"

TAG="${1:?usage: parse-tag.sh <tag-name>}"

if [[ ! "$TAG" =~ ^([a-z][a-z0-9_-]*)-v([0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.-]+)?)$ ]]; then
  fatal "Invalid tag format: '$TAG'. Expected: <pack>-v<semver>"
fi

PACK="${BASH_REMATCH[1]}"
VERSION="${BASH_REMATCH[2]}"

PACK_CAP="$(tr '[:lower:]' '[:upper:]' <<< "${PACK:0:1}")${PACK:1}"

log "Parsed tag '$TAG': pack='$PACK', version='$VERSION'"

if [ -n "${GITHUB_OUTPUT:-}" ]; then
  {
    echo "pack=$PACK"
    echo "version=$VERSION"
    echo "tag=$TAG"
    echo "pack_capitalized=$PACK_CAP"
  } >> "$GITHUB_OUTPUT"
fi