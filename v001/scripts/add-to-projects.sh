#!/bin/bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title Add to Projects
# @raycast.mode silent
# @raycast.argument1 { "type": "text", "placeholder": "What's the project?" }

# Optional parameters:
# @raycast.icon 📁

set -e

CLAUDE="/Users/tedpearlman/.local/bin/claude"
JQ="/usr/bin/jq"
CURL="/usr/bin/curl"
API_BASE="https://data.ifnotfor.com"
TEXT="$1"

UBERS=$("$CURL" -s "$API_BASE/api/projects/uber-list" | "$JQ" -r '.names | join(", ")')

SYSTEM="Pick the best-fitting uber_project for the given sentence. uber_project MUST be exactly one of the allowed names. Respond with ONLY a raw JSON object, no markdown fences. Shape: {\"uber_project\":\"...\"}"

PROMPT="Sentence: $TEXT
Allowed uber_projects: $UBERS"

RAW=$("$CLAUDE" -p "$PROMPT" \
  --model haiku \
  --output-format json \
  --tools "" \
  --no-session-persistence \
  --system-prompt "$SYSTEM" | "$JQ" -r '.result')

UBER=$(printf '%s' "$RAW" | sed -E 's/^```json//;s/^```//;s/```$//' | "$JQ" -r '.uber_project')

JSON=$("$JQ" -nc --arg title "$TEXT" --arg uber "$UBER" '{title: $title, uber_project: $uber}')

"$CURL" -s -X POST "$API_BASE/api/projects/quick-create" \
  -H "Content-Type: application/json" \
  --data "$JSON" > /dev/null
