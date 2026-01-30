# Quick Start Guide

Get the test frontend running in 3 steps:

## 1. Start Backend (Terminal 1)

```bash
cd orderzap-backend
npm run dev
```

Wait for: `✔ Convex functions ready!`

## 2. Start Test Frontend (Terminal 2)

```bash
cd test-frontend
npm run dev
```

## 3. Test the App

Open http://localhost:3002

### Test Flow:

1. Click **"3. Cart & Orders →"**
2. Click **"Create Test Order"**
3. Watch the order appear in real-time below! 🎉

### What Just Happened?

```
Frontend → Backend API → PostgreSQL → Convex → Frontend (real-time)
```

1. Frontend sent order to Backend API (port 3001)
2. Backend saved to PostgreSQL
3. Backend synced to Convex
4. Convex pushed update via WebSocket
5. Frontend received and displayed the order instantly

## Test Restaurant ID

```
550e8400-e29b-41d4-a716-446655440000
```

## Ports

- Test Frontend: **3002**
- Backend API: **3001**
- User-side (production): **3000**

## Troubleshooting

**"Failed to generate test token"?**
→ Backend not running. Start it first.

**Orders not appearing?**
→ Check backend logs for sync errors.

**Real-time not working?**
→ Check browser console for WebSocket errors.

## Next Steps

- Open two browser tabs and watch real-time sync
- Check backend logs to see the sync process
- Try updating order status via backend API
- Explore the code in `lib/api.ts` and `app/cart/[restaurantId]/page.tsx`

---

**Architecture**: Option A (Frontend writes via Backend, reads via Convex)  
**Documentation**: See `README.md` for full details
