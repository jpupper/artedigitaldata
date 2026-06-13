#!/bin/bash
TOKEN=$(cat /d/temp_token.txt)
echo "Token length: ${#TOKEN}"
echo "Calling generate API..."
curl -s -X POST "http://localhost:2495/api/admin/autobot/generate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"maxItems":1,"publish":false}' 2>&1 | python3 -m json.tool 2>/dev/null | head -200
