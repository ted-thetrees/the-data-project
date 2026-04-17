#!/bin/bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title Add to Projects
# @raycast.mode silent
# @raycast.argument1 { "type": "text", "placeholder": "What's the project?" }

# Optional parameters:
# @raycast.icon 📁

ENDPOINT="https://data.ifnotfor.com/api/projects/quick-create"

curl -s -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  --data "$(jq -n --arg text "$1" '{text: $text}')" > /dev/null 2>&1
