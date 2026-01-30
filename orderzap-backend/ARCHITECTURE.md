# OrderZap Backend Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     OrderZap Backend                         │
│                  (Express + TypeScript)                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              │
        ┌─────────────────────┴─────────────────────┐
        │                                           │
        ▼                                           ▼
┌──────────────────┐                      ┌──────────────────┐
│   PostgreSQL     │                      │     Convex       │
│ (Source of Truth)│◄─────────────────────│  (Realtime Cache)│
│                  │      Sync/Repair     │                  │
└──────────────────┘                      └──────────────────┘
```

## Data Flow

### Write Operation (Create/Update/Delete)

```
Client Request
     │
     ▼
┌─────────────────────┐
│  Express Middleware │
│  - CORS             │
│  - Body Parser      │
│  - Auth (JWT)       │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  OrderController    │
│  - Validate Input   │
│  - Extract User     │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│   OrderService      │
│  - Business Logic   │
└─────────┬───────────┘
          │
          ├──────────────────────────┐
          │                          │
          ▼                          ▼
┌──────────────────┐      ┌──────────────────┐
│   PostgreSQL     │      │     Convex       │
│   BEGIN TRANS    │      │   (Async Write)  │
│   INSERT order   │      │                  │
│   INSERT items   │      │   If fails:      │
│   COMMIT         │      │   - Log error    │
│   ✓ Success      │      │   - Retry later  │
└──────────────────┘      └──────────────────┘
          │
          ▼
    Response to Client
```

### Read Operation (List/Get)

```
Client Request
     │
     ▼
┌─────────────────────┐
│  Express Middleware │
│  - Auth (JWT)       │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│   OrderService      │
└─────────┬───────────┘
          │
          ▼
┌──────────────────────┐
│  Try Convex First    │
│  (Fast Read)         │
└─────────┬────────────┘
          │
          ├─── Success? ───► Return Data
          │
          ▼ Failed
┌──────────────────────┐
│  Fallback to         │
│  PostgreSQL          │
│  (Reliable Read)     │
└─────────┬────────────┘
          │
          ▼
┌──────────────────────┐
│  Repair Convex       │
│  (Background)        │
└──────────────────────┘
          │
          ▼
    Return Data to Client
```

## Multi-Tenant Isolation

Every request is scoped to a restaurant:

```
JWT Token
    │
    ├─ userId
    ├─ restaurantId  ◄─── Extracted by middleware
    ├─ email
    └─ role
         │
         ▼
┌─────────────────────────────────┐
│  All Database Queries Include:  │
│  WHERE restaurant_id = ?         │
│  AND deleted_at IS NULL          │
└─────────────────────────────────┘
```

## Database Schema (PostgreSQL)

```
restaurants
├── id (UUID, PK)
├── name
├── slug (unique)
├── email
└── created_at

users
├── id (UUID, PK)
├── restaurant_id (FK → restaurants)
├── email
├── password_hash
├── role (admin/staff/customer)
└── created_at

orders
├── id (UUID, PK)
├── restaurant_id (FK → restaurants)
├── order_number (auto-increment)
├── customer_name
├── customer_phone
├── status (received/preparing/ready/completed)
├── total_amount
├── payment_method
├── deleted_at (soft delete)
└── timestamps

order_items
├── id (UUID, PK)
├── order_id (FK → orders)
├── menu_item_id (FK → menu_items)
├── quantity
├── price
├── special_instructions
└── timestamps

menu_items
├── id (UUID, PK)
├── restaurant_id (FK → restaurants)
├── name
├── price
├── is_available
└── timestamps
```

## Convex Schema (Mirror)

```javascript
// convex/schema.ts
orders: defineTable({
  restaurantId: v.string(),
  orderNumber: v.number(),
  customerName: v.string(),
  status: v.string(),
  totalAmount: v.number(),
  // ... mirrors PostgreSQL
})

orderItems: defineTable({
  orderId: v.string(),
  menuItemId: v.string(),
  quantity: v.number(),
  price: v.number(),
  // ... mirrors PostgreSQL
})
```

## API Layer

```
src/
├── index.ts                    # Express app entry
├── api/
│   ├── routes/
│   │   └── orders.ts          # Route definitions
│   ├── controllers/
│   │   └── OrderController.ts # HTTP handlers
│   └── middleware/
│       ├── auth.ts            # JWT verification
│       └── errorHandler.ts    # Error responses
├── services/
│   └── OrderService.ts        # Business logic
├── db/
│   ├── postgres/
│   │   ├── schema.sql         # Database schema
│   │   └── pool.ts            # Connection pool
│   └── convex/
│       ├── schema.ts          # Convex schema
│       └── client.ts          # Convex operations
└── utils/
    ├── logger.ts              # Winston logging
    ├── jwt.ts                 # Token management
    └── validation.ts          # Zod schemas
```

## Security Features

### 1. Authentication
```
JWT Token Required
├── Signed with JWT_SECRET
├── Contains: userId, restaurantId, role
├── Expires in 7 days (configurable)
└── Verified on every request
```

### 2. Authorization
```
Restaurant Isolation
├── restaurantId extracted from JWT
├── All queries filtered by restaurantId
├── Cannot access other restaurant's data
└── Enforced at database level
```

### 3. Input Validation
```
Zod Schemas
├── Validate all input data
├── Type checking
├── Required fields
└── Format validation (phone, email, etc.)
```

### 4. SQL Injection Prevention
```
Parameterized Queries
├── Never concatenate SQL strings
├── Use $1, $2 placeholders
├── pg library handles escaping
└── Safe from SQL injection
```

### 5. Soft Deletes
```
Never Hard Delete
├── Set deleted_at = NOW()
├── Filter with WHERE deleted_at IS NULL
├── Can restore if needed
└── Audit trail preserved
```

## Error Handling

```
Try-Catch Blocks
     │
     ▼
┌─────────────────────┐
│  Custom Errors      │
│  - NotFoundError    │
│  - ValidationError  │
│  - AuthError        │
│  - DatabaseError    │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Error Middleware   │
│  - Log error        │
│  - Format response  │
│  - Set status code  │
└─────────┬───────────┘
          │
          ▼
    JSON Response
    {
      "success": false,
      "error": {
        "message": "...",
        "code": "..."
      }
    }
```

## Logging

```
Winston Logger
├── Console (development)
├── File: logs/app.log (all logs)
├── File: logs/error.log (errors only)
├── File: logs/exceptions.log (uncaught)
└── File: logs/rejections.log (unhandled promises)
```

## Environment Variables

```
# Database
DATABASE_URL=postgresql://user:pass@host:port/db
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=orderzap
POSTGRES_USER=user
POSTGRES_PASSWORD=password

# Convex
CONVEX_DEPLOYMENT=https://xxx.convex.cloud

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Server
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000
```

## Performance Considerations

### 1. Connection Pooling
```javascript
// PostgreSQL pool
max: 20 connections
idleTimeoutMillis: 30000
connectionTimeoutMillis: 2000
```

### 2. Indexes
```sql
-- Optimized queries
CREATE INDEX idx_orders_restaurant ON orders(restaurant_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at);
```

### 3. Caching Strategy
```
Convex = Fast Read Cache
├── Realtime updates
├── Automatic subscriptions
├── Fallback to PostgreSQL
└── Self-healing (repair on miss)
```

## Deployment Architecture

```
┌─────────────────────────────────────────┐
│           Production Setup              │
└─────────────────────────────────────────┘

Frontend (Vercel)
     │
     ▼
Backend (Railway/Render)
     │
     ├──► PostgreSQL (Railway/Supabase)
     │
     └──► Convex (Convex Cloud)
```

## Future Enhancements

1. **Sync Worker**
   - Background job to retry failed Convex writes
   - Runs every 30 seconds
   - Checks sync_logs table

2. **WebSocket Notifications**
   - Use Convex subscriptions
   - Real-time order updates
   - Kitchen display updates

3. **Rate Limiting**
   - Prevent API abuse
   - Per-restaurant limits
   - Token bucket algorithm

4. **Monitoring**
   - Sentry for error tracking
   - Datadog for metrics
   - Health check endpoints

5. **Testing**
   - Jest unit tests
   - Integration tests
   - Load testing

---

**This architecture provides:**
- ✅ Reliability (PostgreSQL as source of truth)
- ✅ Speed (Convex for realtime)
- ✅ Security (JWT + multi-tenant isolation)
- ✅ Scalability (Connection pooling + caching)
- ✅ Maintainability (Clean separation of concerns)
