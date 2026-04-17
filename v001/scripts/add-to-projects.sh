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

SYSTEM="Extract a concise project title (2-8 words, imperative) and pick the best-fitting uber_project. uber_project MUST be exactly one of the allowed names. Respond with ONLY a raw JSON object, no markdown fences. Shape: {\"title\":\"...\",\"uber_project\":\"...\"}"

PROMPT="Sentence: $TEXT
Allowed uber_projects: $UBERS"

RAW=$("$CLAUDE" -p "$PROMPT" \
  --model haiku \
  --output-format json \
  --tools "" \
  --no-session-persistence \
  --system-prompt "$SYSTEM" | "$JQ" -r '.result')

JSON=$(printf '%s' "$RAW" | sed -E 's/^```json//;s/^```//;s/```$//' | "$JQ" -c .)

"$CURL" -s -X POST "$API_BASE/api/projects/quick-create" \
  -H "Content-Type: application/json" \
  --data "$JSON" > /dev/null
