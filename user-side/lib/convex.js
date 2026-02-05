"use client";
import { ConvexProvider, ConvexReactClient } from "convex/react";

// Hardcoded production URL to avoid environment variable issues
const convexUrl = "https://db.orderzap.in";
console.log("🔍 Convex URL being used:", convexUrl);

const convex = new ConvexReactClient(convexUrl);

export function ConvexClientProvider({ children }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
