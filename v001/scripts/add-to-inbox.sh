#!/bin/bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title Add to Inbox
# @raycast.mode silent
# @raycast.argument1 { "type": "text", "placeholder": "Message" }

# Optional parameters:
# @raycast.icon 📥

ENDPOINT="https://data.ifnotfor.com/api/inbox"

curl -s -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  --data "$(jq -n --arg title "$1" '{title: $title, type: "Note"}')" > /dev/null 2>&1
