"use client";
import { ConvexProvider, ConvexReactClient } from "convex/react";

// Use environment variable for Convex URL
// Falls back to production URL if not set
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "https://db.orderzap.in";
console.log("🔍 Convex URL being used:", convexUrl);

const convex = new ConvexReactClient(convexUrl);

export function ConvexClientProvider({ children }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
