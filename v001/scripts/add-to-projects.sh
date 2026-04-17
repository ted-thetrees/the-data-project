#!/bin/bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title Add to Projects
# @raycast.mode silent
# @raycast.argument1 { "type": "text", "placeholder": "What's the project?" }

# Optional parameters:
# @raycast.icon 📁

set -e

API_BASE="https://data.ifnotfor.com"
TEXT="$1"

UBERS=$(curl -s "$API_BASE/api/projects/uber-list" | jq -r '.names | join(", ")')

PROMPT="Extract a concise project title (2-8 words, imperative) and pick the best-fitting uber project. The uber_project MUST be exactly one of: $UBERS.

Respond with ONLY a raw JSON object, no markdown fences, no commentary. Shape: {\"title\": \"...\", \"uber_project\": \"...\"}

Sentence: $TEXT"

RAW=$(claude -p "$PROMPT" --output-format json --model haiku | jq -r '.result')
JSON=$(printf '%s' "$RAW" | sed -E 's/^```json//;s/^```//;s/```$//' | jq -c .)

curl -s -X POST "$API_BASE/api/projects/quick-create" \
  -H "Content-Type: application/json" \
  --data "$JSON" > /dev/null
