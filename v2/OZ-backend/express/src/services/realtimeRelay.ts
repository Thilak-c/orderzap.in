import { Server as HttpServer } from "http";
import { Server as SocketServer, Socket } from "socket.io";

/**
 * realtimeRelay.ts — Socket.io Real-Time Relay
 * ─────────────────────────────────────────────
 * Manages WebSocket connections for pushing real-time updates
 * from the Express API to connected frontend clients.
 *
 * Events pushed to clients:
 *   - order:new        → A new order was placed
 *   - order:updated    → An order's status changed
 *   - menu:updated     → A menu item's stock changed
 *   - menu:synced      → Full menu sync completed
 *   - convex:status    → Convex health status changed
 */

const API_KEY = process.env.API_KEY;

let io: SocketServer | null = null;

/**
 * Initialize the Socket.io server on the given HTTP server.
 * Validates API key on connection handshake.
 */
export function initSocketServer(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: "*", // Allow all origins (React Native doesn't have a fixed origin)
      methods: ["GET", "POST"],
    },
    pingTimeout: 20_000,
    pingInterval: 10_000,
  });

  // Authenticate on connection via API key in handshake auth
  io.use((socket: Socket, next) => {
    const clientKey = socket.handshake.auth?.apiKey as string | undefined;

    if (!API_KEY) {
      return next(new Error("Server API key not configured"));
    }

    if (!clientKey || clientKey !== API_KEY) {
      return next(new Error("Authentication failed: invalid API key"));
    }

    next();
  });

  io.on("connection", (socket: Socket) => {
    console.log(`📡 Client connected: ${socket.id}`);

    socket.on("disconnect", (reason) => {
      console.log(`📡 Client disconnected: ${socket.id} (${reason})`);
    });
  });

  console.log("📡 Socket.io server initialized");
  return io;
}

/**
 * Get the Socket.io server instance.
 */
export function getIO(): SocketServer | null {
  return io;
}

// ── Emit Helpers ──────────────────────────────────

/** Emit when a new order is placed */
export function emitNewOrder(order: Record<string, unknown>): void {
  io?.emit("order:new", order);
}

/** Emit when an order status is updated */
export function emitOrderUpdate(data: { pg_id: number; status: string }): void {
  io?.emit("order:updated", data);
}

/** Emit when a menu item's stock changes */
export function emitMenuUpdate(data: { pg_id: number; in_stock: boolean }): void {
  io?.emit("menu:updated", data);
}

/** Emit when a full menu sync completes */
export function emitMenuSynced(data: { synced: number }): void {
  io?.emit("menu:synced", data);
}

/** Emit Convex status changes */
export function emitConvexStatus(status: string): void {
  io?.emit("convex:status", { status, timestamp: new Date().toISOString() });
}
