#!/usr/bin/env bash
# Deploy speakeasel to Netlify via REST API.
# Why not the Netlify CLI: it exits 1 silently in this environment (all Node
# versions tried; installs routed through the WorkOS Socket firewall), so we
# talk to the API directly. Token lives in ~/.netlify/token (chmod 600).
set -euo pipefail

SITE_ID="3d23f8c6-1483-47d1-87d4-10f91e1f7a11" # speakeasel.netlify.app
URL="https://speakeasel.netlify.app"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TOKEN="$(tr -d '[:space:]' < "$HOME/.netlify/token")"

cd "$ROOT"
npm run build

ZIP="$(mktemp -d -t speakeasel-deploy)/site.zip"
(cd dist && zip -qr "$ZIP" .)

DEPLOY_ID=$(curl -sf -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/zip" \
  --data-binary "@$ZIP" \
  "https://api.netlify.com/api/v1/sites/$SITE_ID/deploys" \
  | node -e "let s='';process.stdin.on('data',c=>s+=c).on('end',()=>console.log(JSON.parse(s).id))")
rm -rf "$(dirname "$ZIP")"

STATE="unknown"
for _ in $(seq 1 30); do
  # A transient poll failure must not abort the deploy (set -e): default to
  # "polling" and try again within the window.
  STATE=$(curl -sf -H "Authorization: Bearer $TOKEN" \
    "https://api.netlify.com/api/v1/deploys/$DEPLOY_ID" \
    | node -e "let s='';process.stdin.on('data',c=>s+=c).on('end',()=>console.log(JSON.parse(s).state))" \
    || echo "polling")
  [ "$STATE" = "ready" ] && break
  [ "$STATE" = "error" ] && { echo "deploy errored" >&2; exit 1; }
  sleep 2
done
[ "$STATE" = "ready" ] || { echo "deploy timed out (state: $STATE)" >&2; exit 1; }

curl -sf -o /dev/null "$URL"
echo "deployed: $URL (deploy $DEPLOY_ID)"
