import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

export async function POST(request) {
  try {
    const { tableId, items, paymentMethod, notes, sessionId } = await request.json();

    if (!tableId || !items || items.length === 0 || !sessionId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const orderData = {
      tableId: String(tableId),
      items: items.map((item) => ({
        menuItemId: item.menuItemId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image || "🍽️",
      })),
      total,
      paymentMethod: paymentMethod || "pay-later",
      notes: notes || "",
      customerSessionId: sessionId,
    };

    const orderId = await convex.mutation(api.orders.create, orderData);

    return NextResponse.json({ success: true, orderId });
  } catch (error) {
    console.error("Place order API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to place order" },
      { status: 500 }
    );
  }
}
