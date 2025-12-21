#!/bin/bash

# Test script to verify Markmap integration

echo "🧪 Testing Markmap Integration..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="http://localhost:3000/api"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="admin123"
CHAPTER_ID=1

echo "📝 Step 1: Login as admin..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | sed 's/"access_token":"//')

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Login failed!${NC}"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Login successful!${NC}"
echo ""

echo "📝 Step 2: Create Mind Map with Markdown..."
MARKDOWN_CONTENT="# Ngũ Hành

## Mộc (Wood)
- Màu sắc: Xanh lá
- Hướng: Đông

## Hỏa (Fire)
- Màu sắc: Đỏ
- Hướng: Nam

## Thổ (Earth)
- Màu sắc: Vàng
- Hướng: Trung tâm"

CREATE_RESPONSE=$(curl -s -X POST "$API_URL/admin/chapters/$CHAPTER_ID/mindmap" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"title\": \"Test Markmap\",
    \"description\": \"Testing markdown content\",
    \"markdown_content\": $(echo "$MARKDOWN_CONTENT" | jq -Rs .),
    \"structure\": {
      \"version\": \"1.0\",
      \"layout\": \"tree\",
      \"centerNode\": {\"id\": \"root\", \"text\": \"Test\"},
      \"nodes\": []
    },
    \"is_active\": true
  }")

if echo "$CREATE_RESPONSE" | grep -q "markdown_content"; then
  echo -e "${GREEN}✅ Mind Map created successfully!${NC}"
  echo "Response: $CREATE_RESPONSE" | jq .
else
  echo -e "${RED}❌ Failed to create Mind Map${NC}"
  echo "Response: $CREATE_RESPONSE"
  exit 1
fi

echo ""
echo "📝 Step 3: Retrieve Mind Map..."
GET_RESPONSE=$(curl -s -X GET "$API_URL/admin/chapters/$CHAPTER_ID/mindmap" \
  -H "Authorization: Bearer $TOKEN")

if echo "$GET_RESPONSE" | grep -q "markdown_content"; then
  echo -e "${GREEN}✅ Mind Map retrieved successfully!${NC}"
  echo "Markdown content found: ✓"
  echo "$GET_RESPONSE" | jq '.markdown_content' | head -5
else
  echo -e "${RED}❌ Failed to retrieve Mind Map${NC}"
  echo "Response: $GET_RESPONSE"
  exit 1
fi

echo ""
echo -e "${GREEN}🎉 All tests passed!${NC}"
echo ""
echo "Next steps:"
echo "1. Open Admin Dashboard: http://localhost:5173"
echo "2. Navigate to Chapter $CHAPTER_ID → Mind Map tab"
echo "3. You should see the markdown editor with preview"
echo ""
echo "4. Open Mobile App and navigate to Chapter $CHAPTER_ID"
echo "5. Tap 'Mind Map' button to see Markmap rendering"
