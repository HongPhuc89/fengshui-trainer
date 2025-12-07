#!/bin/bash

# Mind Map API Verification Script
# This script tests all mind map endpoints

BASE_URL="http://localhost:3000/api"

echo "=== Mind Map System API Verification ==="
echo ""

# Check if server is running
echo "1. Checking if server is running..."
SERVER_CHECK=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL)
if [ "$SERVER_CHECK" -eq 404 ]; then
  echo "✅ Server is running"
else
  echo "❌ Server not responding correctly (status: $SERVER_CHECK)"
  exit 1
fi

echo ""
echo "2. Preparing test data..."
echo "NOTE: This script requires:"
echo "  - Admin JWT token saved in test_token.txt"
echo "  - At least one chapter exists in database"
echo ""

# Check for token file
if [ ! -f "test_token.txt" ]; then
  echo "⚠️  No test_token.txt found. Please create admin token first."
  echo "   You can get a token by logging in as admin user."
  exit 1
fi

TOKEN=$(cat test_token.txt)
CHAPTER_ID=1

echo "3. Testing Admin Endpoints..."
echo ""

# Test 1: Create Mind Map
echo "Test 1: Create Mind Map"
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/admin/chapters/$CHAPTER_ID/mindmap" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Mind Map - Chapter 1",
    "description": "Automated test mind map",
    "structure": {
      "version": "1.0",
      "layout": "radial",
      "centerNode": {
        "id": "root",
        "text": "Feng Shui Basics",
        "color": "#4A90E2"
      },
      "nodes": [
        {
          "id": "node1",
          "parentId": "root",
          "text": "Five Elements",
          "color": "#7ED321"
        },
        {
          "id": "node2",
          "parentId": "node1",
          "text": "Wood",
          "color": "#8BC34A"
        }
      ],
      "connections": [],
      "theme": {
        "fontFamily": "Inter, sans-serif",
        "fontSize": 14
      }
    },
    "is_active": true
  }')

echo "$CREATE_RESPONSE" | jq '.'
echo ""

# Test 2: Get Mind Map (Admin)
echo "Test 2: Get Mind Map (Admin)"
GET_RESPONSE=$(curl -s -X GET "$BASE_URL/admin/chapters/$CHAPTER_ID/mindmap" \
  -H "Authorization: Bearer $TOKEN")
echo "$GET_RESPONSE" | jq '.'
echo ""

# Test 3: Update Mind Map
echo "Test 3: Update Mind Map"
UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/admin/chapters/$CHAPTER_ID/mindmap" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Test Mind Map"
  }')
echo "$UPDATE_RESPONSE" | jq '.'
echo ""

# Test 4: Validate Structure - Valid
echo "Test 4: Validate Structure (Valid)"
VALIDATE_VALID=$(curl -s -X POST "$BASE_URL/admin/chapters/$CHAPTER_ID/mindmap/validate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "structure": {
      "version": "1.0",
      "layout": "radial",
      "centerNode": {"id": "root", "text": "Test"},
      "nodes": []
    }
  }')
echo "$VALIDATE_VALID" | jq '.'
echo ""

# Test 5: Validate Structure - Invalid (circular reference)
echo "Test 5: Validate Structure (Invalid - Circular Reference)"
VALIDATE_INVALID=$(curl -s -X POST "$BASE_URL/admin/chapters/$CHAPTER_ID/mindmap/validate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "structure": {
      "version": "1.0",
      "layout": "radial",
      "centerNode": {"id": "root", "text": "Root"},
      "nodes": [
        {"id": "a", "parentId": "b", "text": "A"},
        {"id": "b", "parentId": "a", "text": "B"}
      ]
    }
  }')
echo "$VALIDATE_INVALID" | jq '.'
echo ""

# Test 6: Toggle Active Status
echo "Test 6: Toggle Active Status"
TOGGLE_RESPONSE=$(curl -s -X PATCH "$BASE_URL/admin/chapters/$CHAPTER_ID/mindmap/toggle-active" \
  -H "Authorization: Bearer $TOKEN")
echo "$TOGGLE_RESPONSE" | jq '.'
echo ""

echo "4. Testing User Endpoints..."
echo ""

# Test 7: Get Mind Map (User) - assuming book_id=1
BOOK_ID=1
echo "Test 7: Get Mind Map (User - No Auth)"
USER_GET=$(curl -s -X GET "$BASE_URL/books/$BOOK_ID/chapters/$CHAPTER_ID/mindmap")
echo "$USER_GET" | jq '.'
echo ""

# Test 8: Export Mind Map
echo "Test 8: Export Mind Map"
curl -s -X GET "$BASE_URL/books/$BOOK_ID/chapters/$CHAPTER_ID/mindmap/export" \
  -o mindmap-export-test.json
if [ -f mindmap-export-test.json ]; then
  echo "✅ Export file created"
  cat mindmap-export-test.json | jq '.'
  rm mindmap-export-test.json
fi
echo ""

# Test 9: Security - Unauthorized Access
echo "Test 9: Security - Unauthorized Access (No Token)"
UNAUTHORIZED=$(curl -s -X POST "$BASE_URL/admin/chapters/$CHAPTER_ID/mindmap" \
  -H "Content-Type: application/json" \
  -d '{"title": "Should Fail"}')
echo "$UNAUTHORIZED" | jq '.'
echo ""

# Test 10: Delete Mind Map
echo "Test 10: Delete Mind Map"
DELETE_RESPONSE=$(curl -s -X DELETE "$BASE_URL/admin/chapters/$CHAPTER_ID/mindmap" \
  -H "Authorization: Bearer $TOKEN")
echo "$DELETE_RESPONSE" | jq '.'
echo ""

echo "=== Verification Complete ==="
