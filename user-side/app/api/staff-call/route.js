import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

export async function POST(request) {
  try {
    const { tableId, tableNumber, zoneName, reason } = await request.json();

    if (!tableId || tableNumber === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const callId = await convex.mutation(api.staffCalls.create, {
      tableId: String(tableId),
      tableNumber: Number(tableNumber),
      zoneName: zoneName || undefined,
      reason: reason || undefined,
    });

    return NextResponse.json({ success: true, callId });
  } catch (error) {
    console.error("Staff call API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create staff call" },
      { status: 500 }
    );
  }
}
