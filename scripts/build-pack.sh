#!/usr/bin/env bash

set -euo pipefail
# set -x

source "$(dirname "$0")/lib/common.sh"


PACK="${1:?usage: build-pack.sh <pack> <version>}"
VERSION="${2:?usage: build-pack.sh <pack> <version>}"

require_cmd zip
require_cmd jq


PACK_DIR="packs/$PACK"
[ -d "$PACK_DIR" ] || fatal "Pack '$PACK' not found at $PACK_DIR"

log "Validating JSON files..."
while IFS= read -r -d '' f; do
  jq empty "$f" || fatal "Invalid JSON: $f"
done < <(find "$PACK_DIR" -name '*.json' -o -name '*.mcmeta' -print0)

PACK_CAP="$(capitalize "$PACK")"
OUT_FILE="${PACK_CAP}-Imprints-${VERSION}.zip"
OUT_PATH="dist/$OUT_FILE"

mkdir -p dist
rm -f "$OUT_PATH"

LICENSE_SRC=""
if   [ -f "$PACK_DIR/LICENSE" ];     then LICENSE_SRC="$PACK_DIR/LICENSE"
elif [ -f "LICENSE" ];               then LICENSE_SRC="LICENSE"
else fatal "No LICENSE file found (looked in $PACK_DIR/ and repo root)"
fi
log "Using license from: $LICENSE_SRC"

TMP_LICENSE="$PACK_DIR/LICENSE.txt"
[ "$LICENSE_SRC" = "$TMP_LICENSE" ] || cp "$LICENSE_SRC" "$TMP_LICENSE"
if [ "$LICENSE_SRC" != "$TMP_LICENSE" ]; then
  trap 'rm -f "$TMP_LICENSE"' EXIT
fi

log "Building $OUT_PATH..."

(
  cd "$PACK_DIR"
  zip -r -q "../../$OUT_PATH" . \
    -x "*.DS_Store" \
    -x "Thumbs.db" \
    -x "README.md" \
    -x "CHANGELOG.md" \
    -x ".gitignore" \
    -x "*.bak" \
    -x "*~"
)

SIZE=$(du -h "$OUT_PATH" | cut -f1)
log "Built: $OUT_PATH ($SIZE)"

if [ -n "${GITHUB_OUTPUT:-}" ]; then
  {
    echo "filename=$OUT_FILE"
    echo "path=$OUT_PATH"
    echo "size=$SIZE"
  } >> "$GITHUB_OUTPUT"
fi

