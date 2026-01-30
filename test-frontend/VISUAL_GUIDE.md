# Visual Guide: How It All Works

## The Complete Flow (Step by Step)

### Step 1: User Opens App

```
Browser → http://localhost:3002
```

**What happens:**
```
┌─────────────────────────┐
│   Home Page Loads       │
│                         │
│  [1. Restaurant →]      │
│  [2. Menu →]            │
│  [3. Cart & Orders →]   │
│                         │
│  Architecture Info      │
└─────────────────────────┘
```

### Step 2: User Clicks "Cart & Orders"

```
Browser → http://localhost:3002/cart/550e8400-e29b-41d4-a716-446655440000
```

**What happens:**

1. **Page loads**
   ```
   ┌─────────────────────────────────┐
   │  Cart & Orders Page             │
   │                                 │
   │  [Create Test Order] ← Button   │
   │                                 │
   │  Recent Orders (Real-time)      │
   │  ┌─────────────────────────┐   │
   │  │  Loading orders...      │   │
   │  └─────────────────────────┘   │
   └─────────────────────────────────┘
   ```

2. **Convex connection established**
   ```
   Frontend ──WebSocket──> Convex
                           │
                           └─> Fetches existing orders
                           │
   Frontend <──WebSocket─── Convex
   ```

3. **Orders displayed**
   ```
   ┌─────────────────────────────────┐
   │  Recent Orders (Real-time)      │
   │  ┌─────────────────────────┐   │
   │  │ ORD-2026-01-29-0001     │   │
   │  │ Test Customer           │   │
   │  │ Status: received        │   │
   │  │ Total: ₹598             │   │
   │  └─────────────────────────┘   │
   └─────────────────────────────────┘
   ```

### Step 3: User Clicks "Create Test Order"

**Frontend Action:**
```javascript
// 1. Generate token
const token = await generateTestToken();

// 2. Create order
const result = await createOrder({
  restaurantId: "550e8400-e29b-41d4-a716-446655440000",
  tableId: "table-1",
  customerName: "Test Customer",
  items: [{ name: "Test Item", price: 299, quantity: 2 }]
}, token);
```

**Network Flow:**
```
┌──────────┐
│ Frontend │
└────┬─────┘
     │ HTTP POST
     │ /api/orders
     │ Authorization: Bearer <token>
     │ Body: { restaurantId, items, ... }
     ▼
┌──────────────┐
│ Backend API  │
│   :3001      │
└────┬─────────┘
     │
     │ 1. Validate token ✓
     │ 2. Validate data ✓
     │ 3. Generate order number
     │
     ▼
┌──────────────┐
│ PostgreSQL   │
│              │
│ INSERT INTO orders ...
│ RETURNING *
└────┬─────────┘
     │
     │ Returns: { id, order_number, ... }
     │
     ▼
┌──────────────┐
│ Backend API  │
│              │
│ Sync to Convex
└────┬─────────┘
     │
     │ Transform data:
     │ - snake_case → camelCase
     │ - null → undefined
     │ - Add timestamps
     │
     ▼
┌──────────────┐
│   Convex     │
│              │
│ upsertOrder()
└────┬─────────┘
     │
     │ Broadcast to all
     │ connected clients
     │
     ▼
┌──────────────┐
│ Frontend(s)  │
│              │
│ useQuery hook
│ receives update
└──────────────┘
```

### Step 4: Real-time Update Appears

**Timeline:**

```
T+0ms    User clicks button
         │
T+10ms   Frontend sends HTTP request
         │
T+30ms   Backend receives request
         │
T+50ms   PostgreSQL saves order
         │
T+70ms   Backend syncs to Convex
         │
T+100ms  Convex broadcasts update
         │
T+110ms  Frontend receives update
         │
T+120ms  UI re-renders with new order
         │
         ✅ Order appears!
```

**UI Update:**

```
Before:
┌─────────────────────────────────┐
│  Recent Orders (Real-time)      │
│  ┌─────────────────────────┐   │
│  │ ORD-2026-01-29-0001     │   │
│  └─────────────────────────┘   │
└─────────────────────────────────┘

After (automatically):
┌─────────────────────────────────┐
│  Recent Orders (Real-time)      │
│  ┌─────────────────────────┐   │
│  │ ORD-2026-01-29-0002 ← NEW! │
│  │ Test Customer           │   │
│  │ Status: received        │   │
│  │ Total: ₹598             │   │
│  └─────────────────────────┘   │
│  ┌─────────────────────────┐   │
│  │ ORD-2026-01-29-0001     │   │
│  └─────────────────────────┘   │
└─────────────────────────────────┘
```

## Multi-Tab Real-time Demo

### Setup: Open Two Tabs

```
Tab 1: http://localhost:3002/cart/...
Tab 2: http://localhost:3002/cart/...
```

**Both tabs connect to Convex:**
```
Tab 1 ──WebSocket──┐
                   ├──> Convex
Tab 2 ──WebSocket──┘
```

### Action: Create Order in Tab 1

```
Tab 1: User clicks "Create Test Order"
       │
       ├──> Backend API
       │    │
       │    └──> PostgreSQL
       │         │
       │         └──> Convex
       │              │
       │              ├──> Tab 1 (WebSocket)
       │              │
       │              └──> Tab 2 (WebSocket)
       │
       ▼
Tab 1: Order appears ✅
Tab 2: Order appears ✅ (without refresh!)
```

## Data Transformation Example

### PostgreSQL → Convex

**PostgreSQL Row:**
```sql
{
  id: "abc-123",
  restaurant_id: "550e8400...",
  order_number: "ORD-2026-01-29-0002",
  customer_name: "Test Customer",
  total_amount: 598.00,
  status: "received",
  cancellation_reason: NULL,  ← NULL in database
  created_at: "2026-01-30 01:30:00"
}
```

**Transformed for Convex:**
```javascript
{
  postgresId: "abc-123",
  restaurantId: "550e8400...",
  orderNumber: "ORD-2026-01-29-0002",
  customerName: "Test Customer",
  totalAmount: 598,
  status: "received",
  // cancellationReason: omitted (was NULL)
  createdAt: 1706579400000,
  lastSyncedAt: 1706579400100
}
```

**Why transform?**
- ✅ Convex doesn't accept `null` for optional fields
- ✅ camelCase is JavaScript convention
- ✅ Timestamps as numbers for Convex
- ✅ Add sync metadata

## Error Handling Flow

### Scenario: Backend is Down

```
User clicks "Create Test Order"
       │
       ├──> Frontend: fetch("http://localhost:3001/api/orders")
       │
       ✗ Connection refused
       │
       ├──> Frontend: catch (error)
       │
       └──> UI: Shows error message
            ┌─────────────────────────┐
            │ ❌ Error                │
            │ Failed to create order  │
            └─────────────────────────┘
```

**No partial state!**
- ❌ Order NOT in PostgreSQL
- ❌ Order NOT in Convex
- ❌ Order NOT in UI
- ✅ System remains consistent

### Scenario: Convex Sync Fails

```
User clicks "Create Test Order"
       │
       ├──> Backend API
       │    │
       │    └──> PostgreSQL ✅ Saved
       │         │
       │         └──> Convex ✗ Failed
       │              │
       │              ├──> Retry 1 ✗
       │              ├──> Retry 2 ✗
       │              └──> Retry 3 ✗
       │
       └──> Backend: Logs error
            Frontend: Order created (from API response)
            Convex: Will sync on next update
```

**Eventual consistency:**
- ✅ Order in PostgreSQL (source of truth)
- ⏳ Order will sync to Convex later
- ✅ User sees success (order was created)

## WebSocket Connection Lifecycle

### Initial Connection

```
1. Page loads
   │
2. ConvexClientProvider initializes
   │
3. WebSocket connection established
   │
   Frontend ──CONNECT──> Convex
   │
4. Subscribe to queries
   │
   Frontend ──SUBSCRIBE──> orders.listOrders({ restaurantId })
   │
5. Receive initial data
   │
   Frontend <──DATA────── Convex
   │
6. Render UI
```

### Ongoing Updates

```
Loop:
  │
  ├──> Wait for changes
  │    │
  │    └──> [Order created/updated in Convex]
  │         │
  │         └──> Convex ──PUSH──> Frontend
  │              │
  │              └──> useQuery hook updates
  │                   │
  │                   └──> Component re-renders
  │
  └──> Repeat
```

### Reconnection

```
Network drops:
  │
  ├──> WebSocket disconnected
  │    │
  │    └──> Convex client detects
  │         │
  │         └──> Auto-reconnect (exponential backoff)
  │              │
  │              ├──> Attempt 1 (1s delay)
  │              ├──> Attempt 2 (2s delay)
  │              ├──> Attempt 3 (4s delay)
  │              │
  │              └──> Connected! ✅
  │                   │
  │                   └──> Re-subscribe to queries
  │                        │
  │                        └──> Fetch latest data
  │                             │
  │                             └──> UI updates
```

## Performance Characteristics

### Write Operation (Create Order)

```
Frontend → Backend → PostgreSQL → Convex → Frontend
  10ms      20ms       50ms        30ms      10ms
                    Total: ~120ms
```

**Breakdown:**
- Frontend → Backend: Network latency
- Backend processing: Validation, business logic
- PostgreSQL: INSERT query
- Convex sync: API call + broadcast
- Frontend update: WebSocket push

### Read Operation (List Orders)

```
Frontend → Convex (WebSocket)
  5ms (after initial connection)
```

**Why so fast?**
- ✅ WebSocket already connected
- ✅ No HTTP overhead
- ✅ Binary protocol
- ✅ Server push (no polling)

## Summary

The test frontend demonstrates:

1. **Clean Architecture**: Separate write/read layers
2. **Real-time Updates**: WebSocket for instant sync
3. **Error Handling**: Graceful degradation
4. **Performance**: Fast reads, acceptable write latency
5. **Reliability**: PostgreSQL as source of truth
6. **Developer Experience**: Simple, predictable flow

All working together to create a seamless user experience! 🚀
