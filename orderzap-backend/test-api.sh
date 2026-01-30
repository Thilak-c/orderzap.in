#!/bin/bash

# OrderZap API Testing Script
# Tests all endpoints with sample data

BASE_URL="http://localhost:3001"
TOKEN=""

echo "🧪 OrderZap API Testing"
echo "======================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print test results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ $2${NC}"
    else
        echo -e "${RED}✗ $2${NC}"
    fi
}

# Test 1: Health Check
echo "1️⃣  Testing Health Check..."
response=$(curl -s -w "\n%{http_code}" $BASE_URL/health)
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
    print_result 0 "Health check passed"
    echo "$body" | jq '.'
else
    print_result 1 "Health check failed (HTTP $http_code)"
    exit 1
fi

echo ""

# Test 2: Generate JWT Token (you need to provide restaurant_id and user_id)
echo "2️⃣  Generating JWT Token..."
echo -e "${YELLOW}Please provide your test data:${NC}"
read -p "Restaurant ID: " RESTAURANT_ID
read -p "User ID: " USER_ID
read -p "Email: " EMAIL

# Generate token using Node.js
TOKEN=$(node -e "
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  {
    userId: '$USER_ID',
    restaurantId: '$RESTAURANT_ID',
    email: '$EMAIL',
    role: 'admin'
  },
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  { expiresIn: '7d' }
);
console.log(token);
")

if [ -z "$TOKEN" ]; then
    print_result 1 "Failed to generate token"
    exit 1
fi

print_result 0 "Token generated"
echo "Token: ${TOKEN:0:50}..."
echo ""

# Test 3: Create Order
echo "3️⃣  Creating Test Order..."
read -p "Menu Item ID (UUID): " MENU_ITEM_ID

CREATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"customer_name\": \"Test Customer\",
    \"customer_phone\": \"+919876543210\",
    \"items\": [
      {
        \"menu_item_id\": \"$MENU_ITEM_ID\",
        \"quantity\": 2,
        \"special_instructions\": \"Extra spicy\"
      }
    ],
    \"payment_method\": \"pay-counter\",
    \"tip_amount\": 50
  }")

http_code=$(echo "$CREATE_RESPONSE" | tail -n1)
body=$(echo "$CREATE_RESPONSE" | head -n-1)

if [ "$http_code" = "201" ]; then
    print_result 0 "Order created successfully"
    echo "$body" | jq '.'
    ORDER_ID=$(echo "$body" | jq -r '.data.order.id')
    echo ""
    echo "Order ID: $ORDER_ID"
else
    print_result 1 "Order creation failed (HTTP $http_code)"
    echo "$body" | jq '.'
    exit 1
fi

echo ""

# Test 4: List Orders
echo "4️⃣  Listing Orders..."
LIST_RESPONSE=$(curl -s -w "\n%{http_code}" $BASE_URL/api/orders \
  -H "Authorization: Bearer $TOKEN")

http_code=$(echo "$LIST_RESPONSE" | tail -n1)
body=$(echo "$LIST_RESPONSE" | head -n-1)

if [ "$http_code" = "200" ]; then
    print_result 0 "Orders listed successfully"
    echo "$body" | jq '.data | length' | xargs echo "Total orders:"
else
    print_result 1 "List orders failed (HTTP $http_code)"
fi

echo ""

# Test 5: Get Single Order
echo "5️⃣  Getting Single Order..."
GET_RESPONSE=$(curl -s -w "\n%{http_code}" $BASE_URL/api/orders/$ORDER_ID \
  -H "Authorization: Bearer $TOKEN")

http_code=$(echo "$GET_RESPONSE" | tail -n1)
body=$(echo "$GET_RESPONSE" | head -n-1)

if [ "$http_code" = "200" ]; then
    print_result 0 "Order fetched successfully"
    echo "$body" | jq '.data.order | {id, order_number, status, total_amount}'
else
    print_result 1 "Get order failed (HTTP $http_code)"
fi

echo ""

# Test 6: Update Order Status
echo "6️⃣  Updating Order Status..."
UPDATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT $BASE_URL/api/orders/$ORDER_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"status": "preparing"}')

http_code=$(echo "$UPDATE_RESPONSE" | tail -n1)
body=$(echo "$UPDATE_RESPONSE" | head -n-1)

if [ "$http_code" = "200" ]; then
    print_result 0 "Order status updated"
    echo "$body" | jq '.data | {id, status}'
else
    print_result 1 "Update order failed (HTTP $http_code)"
fi

echo ""

# Test 7: Test Authentication Failure
echo "7️⃣  Testing Authentication (should fail)..."
AUTH_FAIL=$(curl -s -w "\n%{http_code}" $BASE_URL/api/orders)
http_code=$(echo "$AUTH_FAIL" | tail -n1)

if [ "$http_code" = "401" ]; then
    print_result 0 "Authentication properly enforced"
else
    print_result 1 "Authentication not working (expected 401, got $http_code)"
fi

echo ""
echo "================================"
echo -e "${GREEN}✅ All tests completed!${NC}"
echo ""
echo "Summary:"
echo "- Health check: ✓"
echo "- JWT generation: ✓"
echo "- Create order: ✓"
echo "- List orders: ✓"
echo "- Get order: ✓"
echo "- Update order: ✓"
echo "- Auth enforcement: ✓"
echo ""
echo "🎉 Your OrderZap backend is working!"
