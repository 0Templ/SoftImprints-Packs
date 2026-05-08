#!/usr/bin/env bash

set -euo pipefail
source "$(dirname "$0")/lib/common.sh"

CHANGELOG="${1:?usage: extract-changelog.sh <CHANGELOG.md> <version>}"
VERSION="${2:?usage: extract-changelog.sh <CHANGELOG.md> <version>}"

if [ ! -f "$CHANGELOG" ]; then
  log "No CHANGELOG at $CHANGELOG, using fallback"
  echo "Release v$VERSION"
  exit 0
fi

SECTION="$(awk -v ver="$VERSION" '
  $0 ~ "^## \\[" ver "\\]" { in_section = 1; next }
  in_section && /^## \[/    { exit }
  in_section                { print }
' "$CHANGELOG")"

SECTION="$(echo "$SECTION" | sed -e '/./,$!d' -e :a -e '/^\n*$/{$d;N;ba' -e '}')"

if [ -z "$SECTION" ]; then
  log "No section for v$VERSION found in $CHANGELOG, using fallback"
  echo "Release v$VERSION"
else
  echo "$SECTION"
fi
