import { NextResponse } from "next/server";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2:3b";

function buildSystemPrompt(tableContext, menuItems, activeOrder, cart) {
  const availableItems = menuItems.filter((item) => item.isAvailableInZone);
  const menuList = availableItems
    .map((item) => `${item.name}: $${item.price.toFixed(2)}`)
    .join(", ");

  let orderInfo = "";
  if (activeOrder) {
    const itemsList = activeOrder.items.map((i) => `${i.quantity}x ${i.name}`).join(", ");
    const statusText = {
      pending: "received, waiting to prepare",
      preparing: "being prepared now",
      ready: "ready to serve",
      completed: "done"
    }[activeOrder.status] || activeOrder.status;
    orderInfo = `\nCurrent order: ${itemsList} - $${activeOrder.total.toFixed(2)} - ${statusText}`;
  }

  let cartInfo = "";
  if (cart && cart.length > 0) {
    const cartItems = cart.map((i) => `${i.quantity}x ${i.name}`).join(", ");
    const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    cartInfo = `\nCart: ${cartItems} ($${cartTotal.toFixed(2)})`;
  }

  return `You are a restaurant assistant. Table ${tableContext.tableNumber}, ${tableContext.zoneName || "Main"} zone.

Menu: ${menuList}${orderInfo}${cartInfo}

IMPORTANT RULES:
1. To add items, ALWAYS include: [ADD_TO_CART:ItemName:Quantity]
2. To place order, ALWAYS include: [PLACE_ORDER:pay-later:none] or [PLACE_ORDER:pay-now:special request here]
3. When user says "checkout", "place order", "confirm", "submit order" - include the PLACE_ORDER tag
4. You can add items AND place order in the same response: [ADD_TO_CART:ItemName:1][PLACE_ORDER:pay-later:none]
5. Keep responses short (1-2 sentences max)
6. Use exact menu item names from the menu list above

Examples:
- User: "add pizza" -> "[ADD_TO_CART:Margherita Pizza:1] Added to cart!"
- User: "checkout" -> "[PLACE_ORDER:pay-later:none] Order placed!"
- User: "order me a pizza" -> "[ADD_TO_CART:Margherita Pizza:1][PLACE_ORDER:pay-later:none] Done! Your pizza is on the way!"
- User: "place order, pay now, no onions" -> "[PLACE_ORDER:pay-now:no onions] Done!"`;
}

export async function POST(request) {
  try {
    const { message, tableContext, menuItems, activeOrder, conversationHistory, cart, stream } = await request.json();

    const systemPrompt = buildSystemPrompt(tableContext, menuItems || [], activeOrder, cart);

    const messages = [
      { role: "system", content: systemPrompt },
      ...(conversationHistory || []).slice(-6).map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: "user", content: message },
    ];

    if (stream) {
      const response = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          messages,
          stream: true,
          options: { temperature: 0.5, num_predict: 150 },
        }),
      });

      if (!response.ok) {
        return NextResponse.json(
          { message: "I'm having trouble connecting. Please try again." },
          { status: 200 }
        );
      }

      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value);
              const lines = chunk.split("\n").filter(Boolean);

              for (const line of lines) {
                try {
                  const json = JSON.parse(line);
                  if (json.message?.content) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: json.message.content })}\n\n`));
                  }
                  if (json.done) {
                    controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                  }
                } catch (e) { }
              }
            }
          } finally {
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: false,
        options: { temperature: 0.5, num_predict: 150 },
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { message: "I'm having trouble connecting. Please try again." },
        { status: 200 }
      );
    }

    const data = await response.json();
    return NextResponse.json({ message: data.message?.content || "I will check with staff." });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { message: "I'm having trouble connecting. Please try again." },
      { status: 200 }
    );
  }
}
