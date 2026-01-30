# OrderZap Test Frontend

This is a test application demonstrating **Option A Architecture** for OrderZap.

## Architecture Overview

```
┌─────────────┐         ┌──────────────┐         ┌────────────┐
│   Frontend  │ Writes  │   Backend    │ Syncs   │   Convex   │
│  (Next.js)  │────────>│  REST API    │────────>│  (Cache)   │
│             │         │ (PostgreSQL) │         │            │
└─────────────┘         └──────────────┘         └────────────┘
       │                                                 │
       └─────────────────────────────────────────────────┘
                    Real-time Reads (WebSocket)
```

### Data Flow

- **Writes**: Frontend → Backend API (:3001) → PostgreSQL → Convex sync
- **Reads**: Frontend → Convex (real-time WebSocket subscriptions)

## Features

- ✅ Create orders via Backend API
- ✅ Real-time order updates via Convex
- ✅ Automatic PostgreSQL → Convex synchronization
- ✅ Test authentication token generation
- ✅ Clean separation of concerns

## Setup

### 1. Install Dependencies

```bash
cd test-frontend
npm install
```

### 2. Environment Variables

The `.env.local` file is already configured:

```env
NEXT_PUBLIC_CONVEX_URL=https://capable-sardine-64.convex.cloud
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Start Backend (Required)

The backend must be running for writes to work:

```bash
cd ../orderzap-backend
npm run dev
```

### 4. Start Test Frontend

```bash
npm run dev
```

The app will run on **http://localhost:3002**

## Routes

- `/` - Home page with navigation
- `/restaurant/[restaurantId]` - Restaurant info page
- `/menu/[restaurantId]` - Menu page (mock data)
- `/cart/[restaurantId]` - Cart & Orders page (real-time)

## Test Restaurant ID

```
550e8400-e29b-41d4-a716-446655440000
```

## How It Works

### Creating an Order

1. Click "Create Test Order" on the cart page
2. Frontend calls `createOrder()` from `lib/api.ts`
3. Request goes to Backend API at `http://localhost:3001/api/orders`
4. Backend writes to PostgreSQL
5. Backend syncs to Convex via `convexClient.ts`
6. Convex broadcasts update via WebSocket
7. Frontend receives real-time update and displays the new order

### Real-time Order List

The order list uses Convex's `useQuery` hook:

```tsx
const orders = useQuery(api.orders.listOrders, {
  restaurantId,
  limit: 10,
});
```

This automatically:
- Subscribes to order changes
- Updates in real-time when orders are created/updated
- Handles loading states
- Reconnects on network issues

## File Structure

```
test-frontend/
├── app/
│   ├── page.tsx                          # Home page
│   ├── layout.tsx                        # Root layout with Convex provider
│   ├── globals.css                       # Global styles
│   ├── restaurant/[restaurantId]/
│   │   └── page.tsx                      # Restaurant info
│   ├── menu/[restaurantId]/
│   │   └── page.tsx                      # Menu (mock data)
│   └── cart/[restaurantId]/
│       └── page.tsx                      # Cart & Orders (real-time)
├── lib/
│   ├── api.ts                            # Backend API client (writes)
│   └── convex-provider.tsx               # Convex provider (reads)
├── convex/
│   └── _generated/
│       ├── api.js                        # Convex API references
│       └── api.d.ts                      # TypeScript types
├── .env.local                            # Environment variables
└── package.json                          # Dependencies
```

## API Client (`lib/api.ts`)

### Generate Test Token

```typescript
const token = await generateTestToken();
```

### Create Order

```typescript
const result = await createOrder(
  {
    restaurantId: "550e8400-e29b-41d4-a716-446655440000",
    tableId: "table-1",
    customerName: "Test Customer",
    items: [
      {
        name: "Test Item",
        price: 299,
        quantity: 2,
      },
    ],
  },
  token
);
```

### Update Order

```typescript
await updateOrder(
  orderId,
  {
    status: "preparing",
    notes: "Updated notes",
  },
  token
);
```

## Convex Queries

### List Orders (Real-time)

```typescript
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const orders = useQuery(api.orders.listOrders, {
  restaurantId: "550e8400-e29b-41d4-a716-446655440000",
  limit: 10,
});
```

### Get Single Order

```typescript
const order = useQuery(api.orders.getOrder, {
  postgresId: "order-uuid-here",
});
```

## Testing the Architecture

### Test 1: Create Order

1. Go to http://localhost:3002
2. Click "Cart & Orders"
3. Click "Create Test Order"
4. Watch the order appear in real-time below

### Test 2: Real-time Updates

1. Open two browser tabs to the cart page
2. Create an order in one tab
3. Watch it appear instantly in the other tab

### Test 3: Backend Sync

1. Create an order via the test frontend
2. Check PostgreSQL database - order should be there
3. Check Convex dashboard - order should be synced
4. Frontend shows the order in real-time

## Troubleshooting

### Orders not appearing?

- Check backend is running on port 3001
- Check backend logs for sync errors
- Verify Convex URL in `.env.local`

### "Failed to generate test token"?

- Backend must be running
- Check `http://localhost:3001/health`

### Real-time not working?

- Check browser console for WebSocket errors
- Verify Convex URL is correct
- Check network tab for Convex connections

## Next Steps

To extend this test app:

1. Add menu items to backend Convex schema
2. Create menuItems queries in `orderzap-backend/convex/`
3. Update menu page to use real-time data
4. Add order status updates
5. Add payment flow testing
6. Add table management

## Comparison with user-side

This test app is simpler than `user-side/`:

- No complex routing conflicts
- Focused on testing Option A architecture
- Minimal UI for clarity
- Easy to understand data flow

The `user-side/` app is the production application with full features.

## Architecture Benefits

✅ **Single Source of Truth**: PostgreSQL is the source of truth  
✅ **Real-time Updates**: Convex provides instant UI updates  
✅ **Offline Resilience**: Backend handles retries and sync  
✅ **Scalability**: Backend can batch sync operations  
✅ **Security**: All writes go through authenticated backend API  
✅ **Flexibility**: Can add caching, rate limiting, validation at backend  

## Related Documentation

- Backend: `../orderzap-backend/README.md`
- Architecture: `../orderzap-backend/ARCHITECTURE.md`
- User-side: `../user-side/` (production app)
