# Test Frontend Architecture

## Option A: Backend-Controlled Writes with Real-time Reads

This test application demonstrates the **Option A** architecture pattern for OrderZap.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Test Frontend                            │
│                      (Next.js on :3002)                          │
│                                                                   │
│  ┌──────────────────┐              ┌──────────────────┐         │
│  │   Write Layer    │              │   Read Layer     │         │
│  │   (lib/api.ts)   │              │  (Convex hooks)  │         │
│  │                  │              │                  │         │
│  │  - createOrder() │              │  - useQuery()    │         │
│  │  - updateOrder() │              │  - Real-time     │         │
│  │  - REST calls    │              │  - WebSocket     │         │
│  └────────┬─────────┘              └────────▲─────────┘         │
│           │                                  │                   │
└───────────┼──────────────────────────────────┼───────────────────┘
            │                                  │
            │ HTTP POST                        │ WebSocket
            │ :3001/api/orders                 │ Subscribe
            │                                  │
            ▼                                  │
┌─────────────────────────────────────────────┼───────────────────┐
│                    Backend API                                   │
│                 (Express on :3001)           │                   │
│                                              │                   │
│  ┌──────────────────┐    ┌─────────────────┴────────┐          │
│  │  Order Service   │    │   Convex Sync Service    │          │
│  │                  │    │                           │          │
│  │  1. Validate     │───>│  3. Sync to Convex       │          │
│  │  2. Save to PG   │    │  4. Retry on failure     │          │
│  │  3. Return       │    │  5. Log sync status      │          │
│  └──────────────────┘    └──────────────────────────┘          │
│           │                         │                            │
└───────────┼─────────────────────────┼────────────────────────────┘
            │                         │
            ▼                         ▼
    ┌──────────────┐          ┌──────────────┐
    │  PostgreSQL  │          │    Convex    │
    │  (Source of  │          │   (Cache +   │
    │    Truth)    │          │  Real-time)  │
    └──────────────┘          └──────────────┘
```

## Data Flow

### Write Flow (Create Order)

```
1. User clicks "Create Order"
   ↓
2. Frontend calls createOrder() from lib/api.ts
   ↓
3. HTTP POST to http://localhost:3001/api/orders
   ↓
4. Backend validates request
   ↓
5. Backend saves to PostgreSQL (RETURNING *)
   ↓
6. Backend syncs to Convex (with retry logic)
   ↓
7. Backend returns response to frontend
   ↓
8. Convex broadcasts update via WebSocket
   ↓
9. Frontend receives real-time update
   ↓
10. UI updates automatically
```

### Read Flow (List Orders)

```
1. Component mounts
   ↓
2. useQuery(api.orders.listOrders, { restaurantId })
   ↓
3. Convex WebSocket connection established
   ↓
4. Initial data fetched from Convex
   ↓
5. Component renders with data
   ↓
6. [When order created/updated]
   ↓
7. Convex pushes update via WebSocket
   ↓
8. useQuery hook receives update
   ↓
9. Component re-renders automatically
```

## Key Components

### 1. Write Layer (`lib/api.ts`)

**Purpose**: Handle all write operations via Backend API

**Functions**:
- `generateTestToken()` - Get auth token for testing
- `createOrder()` - Create new order
- `updateOrder()` - Update existing order
- `getOrders()` - Fetch orders (for comparison)

**Why Backend API?**
- ✅ Centralized validation
- ✅ Business logic enforcement
- ✅ Rate limiting
- ✅ Audit logging
- ✅ Complex transactions
- ✅ Third-party integrations

### 2. Read Layer (Convex Hooks)

**Purpose**: Real-time data subscriptions

**Usage**:
```typescript
const orders = useQuery(api.orders.listOrders, {
  restaurantId,
  limit: 10,
});
```

**Benefits**:
- ✅ Automatic real-time updates
- ✅ Optimistic UI updates
- ✅ Offline support
- ✅ Automatic reconnection
- ✅ No polling needed
- ✅ Efficient WebSocket protocol

### 3. Convex Provider (`lib/convex-provider.tsx`)

**Purpose**: Initialize Convex client and provide context

```typescript
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
```

**Configuration**:
- Uses backend's Convex deployment
- Shared URL: `https://capable-sardine-64.convex.cloud`
- No separate deployment needed

## Backend Sync Logic

### Sync Service (`orderzap-backend/src/lib/convexClient.ts`)

```typescript
// Simplified flow
async function syncOrderToConvex(order) {
  // 1. Transform PostgreSQL data
  const convexData = {
    postgresId: order.id,
    restaurantId: order.restaurant_id,
    orderNumber: order.order_number,
    // ... only include non-null fields
  };

  // 2. Call Convex mutation
  await convex.mutation(api.orders.upsertOrder, convexData);

  // 3. Retry on failure (3 attempts)
  // 4. Log success/failure
}
```

**Key Features**:
- Null handling (PostgreSQL NULL → undefined for Convex)
- Retry logic (3 attempts with exponential backoff)
- Error logging
- Field transformation (snake_case → camelCase)

## Environment Variables

### Test Frontend (`.env.local`)

```env
# Backend's Convex deployment (shared)
NEXT_PUBLIC_CONVEX_URL=https://capable-sardine-64.convex.cloud

# Backend API for writes
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Backend (`orderzap-backend/.env`)

```env
# Convex deployment URL
CONVEX_URL=https://capable-sardine-64.convex.cloud

# PostgreSQL connection
DATABASE_URL=postgresql://...
```

## Security Model

### Authentication Flow

```
1. Frontend calls generateTestToken()
   ↓
2. Backend generates JWT with:
   - userId
   - restaurantId
   - role
   - expiry
   ↓
3. Frontend stores token
   ↓
4. Frontend includes token in all API calls:
   Authorization: Bearer <token>
   ↓
5. Backend validates token
   ↓
6. Backend enforces permissions
```

### Convex Security

- Frontend connects to Convex with public URL
- No authentication needed for reads (restaurant-scoped)
- Writes only via Backend API (authenticated)
- Convex acts as read-only cache for frontend

## Comparison: Option A vs Option B

### Option A (Implemented)

```
Frontend → Backend API → PostgreSQL → Convex
Frontend ← Convex (real-time reads)
```

**Pros**:
- ✅ Backend controls all writes
- ✅ Centralized business logic
- ✅ Easy to add validation/rate limiting
- ✅ Real-time reads via Convex
- ✅ Single source of truth (PostgreSQL)

**Cons**:
- ❌ Extra hop for writes
- ❌ Backend must handle sync

### Option B (Not Implemented)

```
Frontend → Convex → PostgreSQL (via Convex actions)
Frontend ← Convex (real-time reads)
```

**Pros**:
- ✅ Simpler architecture
- ✅ Fewer moving parts
- ✅ Convex handles sync

**Cons**:
- ❌ Business logic in Convex
- ❌ Harder to add complex validation
- ❌ Less control over writes

## Testing the Architecture

### Test 1: Write → Read Flow

1. Open http://localhost:3002/cart/550e8400-e29b-41d4-a716-446655440000
2. Click "Create Test Order"
3. Watch backend logs:
   ```
   [info]: Creating order
   [info]: Order created successfully
   [info]: Syncing order to Convex
   [info]: Convex sync successful
   ```
4. Watch order appear in real-time on frontend

### Test 2: Real-time Updates

1. Open two browser tabs to cart page
2. Create order in Tab 1
3. Watch it appear instantly in Tab 2
4. No refresh needed!

### Test 3: Offline Resilience

1. Stop backend
2. Try to create order → Error
3. Start backend
4. Create order → Success
5. Real-time updates work immediately

## Performance Characteristics

### Write Latency

```
Frontend → Backend → PostgreSQL → Convex → Frontend
  ~10ms     ~20ms      ~50ms       ~30ms     ~10ms
                    Total: ~120ms
```

### Read Latency

```
Frontend → Convex (WebSocket)
  ~5ms (after initial connection)
```

### Scalability

- **Backend**: Can scale horizontally
- **PostgreSQL**: Vertical scaling + read replicas
- **Convex**: Automatically scales
- **WebSocket**: Convex handles connection pooling

## Error Handling

### Write Errors

```typescript
try {
  await createOrder(orderData, token);
} catch (error) {
  // Show error to user
  // Backend logs error
  // No partial state in Convex
}
```

### Sync Errors

- Backend retries 3 times
- Exponential backoff
- Logs all failures
- Can add dead letter queue for manual retry

### Read Errors

- Convex automatically reconnects
- `useQuery` returns `undefined` while loading
- Shows loading state to user

## Future Enhancements

1. **Optimistic Updates**: Update UI before backend confirms
2. **Offline Queue**: Queue writes when offline
3. **Conflict Resolution**: Handle concurrent updates
4. **Batch Sync**: Sync multiple orders at once
5. **Webhook Support**: Notify external systems
6. **Analytics**: Track sync performance

## Related Files

- `lib/api.ts` - Write operations
- `lib/convex-provider.tsx` - Convex setup
- `app/cart/[restaurantId]/page.tsx` - Example usage
- `convex/_generated/api.js` - Convex API types
- `../orderzap-backend/src/lib/convexClient.ts` - Sync logic
- `../orderzap-backend/convex/orders.ts` - Convex mutations

## Summary

This architecture provides:

✅ **Reliability**: PostgreSQL as source of truth  
✅ **Real-time**: Convex for instant updates  
✅ **Control**: Backend enforces business logic  
✅ **Scalability**: Each layer can scale independently  
✅ **Developer Experience**: Simple, predictable data flow  

The test frontend demonstrates this pattern in a minimal, easy-to-understand way.
