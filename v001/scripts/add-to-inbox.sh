#!/bin/bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title Add to Inbox
# @raycast.mode silent
# @raycast.argument1 { "type": "text", "placeholder": "Message" }

# Optional parameters:
# @raycast.icon 📥

TEABLE_API="https://teable.ifnotfor.com/api"
TEABLE_KEY="teable_accBVjzbvmeCokrM6ze_O6kUviK93INcHygqLBy7VrHSnfW3caFrANfX9702Xr0="
TABLE_ID="tblxWdmSHnBdDYjcmKX"
CONTENT_FIELD="fldAfD5hZNUos5KGlC5"
TYPE_FIELD="fldEVTQl8EJPElDtkfB"
DATE_FIELD="fldfpyVFT5nNdWcMizX"
NOW=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

curl -s -X POST "$TEABLE_API/table/$TABLE_ID/record" \
  -H "Authorization: Bearer $TEABLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"fieldKeyType\":\"id\",\"records\":[{\"fields\":{\"$CONTENT_FIELD\":\"$1\",\"$TYPE_FIELD\":\"Note\",\"$DATE_FIELD\":\"$NOW\"}}]}"
