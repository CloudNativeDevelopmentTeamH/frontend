#!/bin/sh
set -eu

: "${API_BASE_URL:=}"
: "${APP_VERSION:=unknown}"

TEMPLATE="/app/public/runtime-config.template.js"
OUT="/app/public/runtime-config.js"
API_ESCAPED=$(printf '%s' "$API_BASE_URL" | sed 's/[\/&]/\\&/g')
VER_ESCAPED=$(printf '%s' "$APP_VERSION" | sed 's/[\/&]/\\&/g')

if [ -f "$TEMPLATE" ]; then
    sed \
        -e "s/__API_BASE_URL__/$API_ESCAPED/g" \
        -e "s/__APP_VERSION__/$VER_ESCAPED/g" \
        "$TEMPLATE" > "$OUT"
else
    cat > "$OUT" <<EOF
window.__RUNTIME_CONFIG__ = { API_BASE_URL: "$API_BASE_URL", APP_VERSION: "$APP_VERSION" };
EOF
fi

exec "$@"
