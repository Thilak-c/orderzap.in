# ⚡ oz-monitor — OrderZap Service Monitor

Real-time CLI dashboard monitoring **PostgreSQL** and **Convex** with auto-retry and rebuild.

---

## Quick Start

```bash
cd oz-monitor
npm install
cp .env.example .env   # edit with your values
node monitor.js
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `CONVEX_URL` | `http://127.0.0.1:3210` | Convex deployment URL |
| `PG_HOST` | `127.0.0.1` | PostgreSQL hostname |
| `PG_PORT` | `5432` | PostgreSQL port |
| `OZ_REBUILD_CMD` | `npx convex deploy` | Shell command for rebuild |
| `CHECK_INTERVAL` | `10000` | Check interval in ms |

## How It Works

```
Every 10s (configurable)
  ├── Ping PostgreSQL (TCP connect to host:port)
  ├── Ping Convex (HTTP GET /version)
  │
  ├── If Convex DOWN:
  │    ├── Retry 1/3  (wait 5s)
  │    ├── Retry 2/3  (wait 5s)
  │    ├── Retry 3/3  (wait 5s)
  │    └── All failed → Run OZ_REBUILD_CMD → Resume monitoring
  │
  └── Render dashboard + event log
```

## Dependencies

chalk, dotenv, cli-table3, ora — pure Node.js, no TypeScript.
