/**
 * databaseRouter.ts — Hybrid Query Routing Engine
 * ──────────────────────────────────────────────
 * This utility determines whether a request should be served by 
 * PostgreSQL (Source-of-Truth) or Convex (Real-time Mirror).
 */

export enum EntityType {
  RESTAURANT = "restaurants",
  ZONE = "zones",
  CATEGORY = "categories",
  MENU_ITEM = "menu_items",
  TABLE = "tables",
  STAFF = "staff",
  ORDER = "orders",
  ATTENDANCE = "attendance",
  INVENTORY = "inventory",
  CUSTOMER = "customers",
  RESERVATION = "reservations",
  CALL = "staff_calls",
  NOTIFICATION = "notifications",
}

export enum DatabaseTarget {
  POSTGRES = "postgres",
  CONVEX = "convex",
  HYBRID = "hybrid", // Postgres primary, Convex mirror
}

/**
 * Get the target database for a specific entity type and operation.
 */
export function getRoute(entity: EntityType, operation: "read" | "write"): DatabaseTarget {
  switch (entity) {
    // ── Persistent Data (Primary: Postgres) ──────────
    case EntityType.RESTAURANT:
    case EntityType.ZONE:
    case EntityType.CATEGORY:
    case EntityType.MENU_ITEM:
    case EntityType.TABLE:
    case EntityType.STAFF:
    case EntityType.INVENTORY:
    case EntityType.CUSTOMER:
    case EntityType.RESERVATION:
      return DatabaseTarget.POSTGRES;

    // ── Hybrid Data (Primary: Postgres, Mirror: Convex) ──────────
    case EntityType.ORDER:
    case EntityType.ATTENDANCE:
      // Writes go to both (Hybrid), Reads usually from Postgres unless 'live' is specified
      return operation === "write" ? DatabaseTarget.HYBRID : DatabaseTarget.POSTGRES;

    // ── Real-time Data (Primary: Convex) ───────────
    case EntityType.CALL:
    case EntityType.NOTIFICATION:
      return DatabaseTarget.CONVEX;

    default:
      return DatabaseTarget.POSTGRES;
  }
}

/**
 * Determine if a specific query should be served from Convex for performance.
 * Example: Live Kitchen Dashboard vs Historical Reports.
 */
export function isLiveRequest(entity: EntityType, query: any): boolean {
  if (entity === EntityType.ORDER && query.status === "active") {
    return true;
  }
  if (entity === EntityType.CALL) {
    return true;
  }
  return false;
}
