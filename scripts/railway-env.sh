#!/usr/bin/env bash
# Push the worker's environment to the linked Railway service from .env.local (values are never printed).
# Usage: bash scripts/railway-env.sh [--service worker]
set -euo pipefail
cd "$(dirname "$0")/.."
KEYS=(NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY ANTHROPIC_API_KEY FIRECRAWL_API_KEY FIRECRAWL_MIN_GAP_MS APIFY_TOKEN KROGER_CLIENT_ID KROGER_CLIENT_SECRET NEXT_PUBLIC_MAPBOX_TOKEN MAPBOX_SERVER_TOKEN LAUNCH_CITY LAUNCH_CITY_SLUG LAUNCH_CENTER_LAT LAUNCH_CENTER_LNG LAUNCH_RADIUS_KM LAUNCH_BBOX LAUNCH_TZ EXTRACTION_MODEL EXTRACTION_EFFORT EXTRACTION_AUTO_APPROVE_THRESHOLD FLIPP_ENABLED NEXT_PUBLIC_APP_URL ADMIN_EMAILS WORKER_POLL_MS WORKER_BATCH)
ARGS=()
missing=()
while IFS= read -r line; do
  [[ "$line" =~ ^[A-Z_]+= ]] || continue
  k="${line%%=*}"; v="${line#*=}"
  v="${v%\"}"; v="${v#\"}"; v="${v%\'}"; v="${v#\'}"
  for want in "${KEYS[@]}"; do [[ "$k" == "$want" ]] && ARGS+=(--set "$k=$v"); done
done < .env.local
for want in "${KEYS[@]}"; do grep -q "^$want=" .env.local || missing+=("$want"); done
ARGS+=(--set "NODE_ENV=production" --set "WORKER_POLL_MS=${WORKER_POLL_MS:-5000}" --set "WORKER_BATCH=${WORKER_BATCH:-5}")
echo "setting $(( ${#ARGS[@]} / 2 )) variables on Railway service '${2:-worker}' (missing locally: ${missing[*]:-none})"
npx --yes @railway/cli variables "$@" "${ARGS[@]}" --skip-deploys >/dev/null
echo "done"
