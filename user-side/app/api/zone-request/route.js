import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

export async function POST(request) {
    try {
        const { tableId, tableNumber, currentZone, requestedZone } = await request.json();

        if (!tableId || tableNumber === undefined || !requestedZone) {
            return NextResponse.json(
                { success: false, error: "Missing required fields" },
                { status: 400 }
            );
        }

        const requestId = await convex.mutation(api.zoneRequests.create, {
            tableId: String(tableId),
            tableNumber: Number(tableNumber),
            currentZone: currentZone || undefined,
            requestedZone,
        });

        return NextResponse.json({ success: true, requestId });
    } catch (error) {
        console.error("Zone request API error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to create zone request" },
            { status: 500 }
        );
    }
}
