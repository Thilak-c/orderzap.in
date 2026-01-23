"use client";
import { createContext, useContext, useState, useCallback, useRef } from "react";

const ChatContext = createContext();

// Parse action tags from AI response
function parseActions(content) {
  const actions = [];

  // Match [ADD_TO_CART:ItemName:Quantity]
  const addMatches = content.matchAll(/\[ADD_TO_CART:([^:]+):(\d+)\]/g);
  for (const match of addMatches) {
    actions.push({ type: "add", itemName: match[1].trim(), quantity: parseInt(match[2]) });
  }

  // Match [REMOVE_FROM_CART:ItemName]
  const removeMatches = content.matchAll(/\[REMOVE_FROM_CART:([^\]]+)\]/g);
  for (const match of removeMatches) {
    actions.push({ type: "remove", itemName: match[1].trim() });
  }

  // Match [PLACE_ORDER:PaymentMethod:Notes]
  const orderMatches = content.matchAll(/\[PLACE_ORDER:([^:]+):([^\]]+)\]/g);
  for (const match of orderMatches) {
    actions.push({
      type: "place_order",
      paymentMethod: match[1].trim(),
      notes: match[2].trim() === "none" ? "" : match[2].trim()
    });
  }

  // Match [SHOW_CART]
  if (content.includes("[SHOW_CART]")) {
    actions.push({ type: "show_cart" });
  }

  // Clean content by removing action tags
  const cleanContent = content
    .replace(/\[ADD_TO_CART:[^\]]+\]/g, "")
    .replace(/\[REMOVE_FROM_CART:[^\]]+\]/g, "")
    .replace(/\[PLACE_ORDER:[^\]]+\]/g, "")
    .replace(/\[SHOW_CART\]/g, "")
    .trim();

  return { actions, cleanContent };
}

export function ChatProvider({ children, tableContext, menuItems, activeOrder, cart, cartActions, sessionId }) {
  const [messages, setMessages] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const streamingIdRef = useRef(null);
  
  // Use refs to always have the latest values
  const cartRef = useRef(cart);
  const cartActionsRef = useRef(cartActions);
  const sessionIdRef = useRef(sessionId);
  const tableContextRef = useRef(tableContext);
  
  // Keep refs updated
  cartRef.current = cart;
  cartActionsRef.current = cartActions;
  sessionIdRef.current = sessionId;
  tableContextRef.current = tableContext;

  const addMessage = useCallback((message) => {
    const id = Date.now().toString();
    setMessages((prev) => [...prev, { ...message, id, timestamp: new Date() }]);
    return id;
  }, []);

  const updateMessage = useCallback((id, content) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, content } : msg))
    );
  }, []);

  // Place order function - uses refs to get latest values
  const placeOrderInternal = useCallback(async (paymentMethod, notes, cartOverride = null) => {
    const currentCart = cartOverride || cartRef.current;
    const currentTableContext = tableContextRef.current;
    const currentSessionId = sessionIdRef.current;
    const currentCartActions = cartActionsRef.current;
    
    if (!currentCart || currentCart.length === 0 || !currentTableContext || !currentSessionId) {
      return false;
    }

    try {
      const response = await fetch("/api/place-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: currentTableContext.tableId,
          items: currentCart,
          paymentMethod: paymentMethod === "pay-now" ? "pay-now" : "pay-later",
          notes: notes || "",
          sessionId: currentSessionId,
        }),
      });

      const data = await response.json();
      
      if (data.success && currentCartActions?.clearCart) {
        currentCartActions.clearCart();
      }
      return data.success;
    } catch (error) {
      console.error("Place order error:", error);
      return false;
    }
  }, []);

  // Execute cart actions from AI response
  const executeActions = useCallback(async (actions) => {
    if (!cartActionsRef.current || !menuItems) return;

    // Build a local cart copy to track additions
    let localCart = [...(cartRef.current || [])];

    for (const action of actions) {
      if (action.type === "add") {
        const item = menuItems.find(
          (m) => m.name.toLowerCase() === action.itemName.toLowerCase() && m.isAvailableInZone
        );
        if (item) {
          for (let i = 0; i < action.quantity; i++) {
            const cartItem = {
              menuItemId: item._id,
              name: item.name,
              price: item.price,
              image: item.image,
            };
            cartActionsRef.current.addToCart(cartItem);
            
            // Also update local cart for place_order
            const existingIdx = localCart.findIndex(c => c.menuItemId === item._id);
            if (existingIdx >= 0) {
              localCart[existingIdx] = { ...localCart[existingIdx], quantity: localCart[existingIdx].quantity + 1 };
            } else {
              localCart.push({ ...cartItem, quantity: 1 });
            }
          }
        }
      } else if (action.type === "remove" && cartActionsRef.current.removeFromCart) {
        const item = menuItems.find(
          (m) => m.name.toLowerCase() === action.itemName.toLowerCase()
        );
        if (item) {
          cartActionsRef.current.removeFromCart(item._id);
          localCart = localCart.filter(c => c.menuItemId !== item._id);
        }
      } else if (action.type === "place_order") {
        // Pass the local cart to ensure we have the latest items
        const success = await placeOrderInternal(action.paymentMethod, action.notes, localCart);
        if (success) {
          addMessage({
            role: "assistant",
            content: "Your order has been placed! You can track it in the My Orders page.",
          });
        } else {
          addMessage({
            role: "assistant",
            content: "Sorry, I couldn't place your order. Please try again or call staff.",
          });
        }
      }
    }
  }, [menuItems, placeOrderInternal, addMessage]);

  const sendMessageStreaming = useCallback(async (content, conversationHistory) => {
    if (isLoading) return;

    setIsLoading(true);

    const assistantId = addMessage({ role: "assistant", content: "..." });
    streamingIdRef.current = assistantId;
    let fullContent = "";
    let hasReceivedContent = false;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          tableContext,
          menuItems,
          activeOrder,
          cart,
          conversationHistory,
          stream: true,
        }),
      });

      if (!response.ok) throw new Error("Stream failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]" || !data) continue;

          try {
            const json = JSON.parse(data);
            if (json.content) {
              hasReceivedContent = true;
              fullContent += json.content;
              const { cleanContent } = parseActions(fullContent);
              // Always show cleanContent, show "Processing..." if empty
              updateMessage(assistantId, cleanContent || "Processing your request...");
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }

      // Final update
      if (hasReceivedContent) {
        const { actions, cleanContent } = parseActions(fullContent);
        // If cleanContent is empty but we have actions, show a default message
        const displayContent = cleanContent || (actions.length > 0 ? "Done!" : "I will check with the staff for you.");
        updateMessage(assistantId, displayContent);
        if (actions.length > 0) {
          await executeActions(actions);
        }
      } else {
        updateMessage(assistantId, "I will check with the staff for you.");
      }

    } catch (error) {
      console.error("Stream error:", error);
      updateMessage(assistantId, "I'm having trouble connecting. Please try again.");
    } finally {
      setIsLoading(false);
      streamingIdRef.current = null;
    }
  }, [tableContext, menuItems, activeOrder, cart, isLoading, addMessage, updateMessage, executeActions]);

  const sendMessage = useCallback(async (content) => {
    if (!content.trim() || isLoading) return;

    addMessage({ role: "user", content });
    await sendMessageStreaming(content, messages.slice(-10));
  }, [messages, isLoading, addMessage, sendMessageStreaming]);

  const sendQuickReply = useCallback(async (action) => {
    if (isLoading) return;

    const quickMessages = {
      popular_items: "What are the most popular items in this zone?",
      available_items: "What can I order here?",
      track_order: "What's the status of my order?",
      place_order: "Place my order",
      call_staff: "I'd like to call staff please.",
      request_vip: "I'd like to move to the VIP zone.",
    };

    const message = quickMessages[action];
    if (message) {
      addMessage({ role: "user", content: message });

      if (action === "call_staff") {
        await callStaffInternal();
      } else if (action === "request_vip") {
        await requestZoneChangeInternal("VIP Lounge");
      } else if (action === "place_order") {
        // Directly place the order using ref
        const currentCart = cartRef.current;
        if (!currentCart || currentCart.length === 0) {
          addMessage({
            role: "assistant",
            content: "Your cart is empty. Add some items first!",
          });
        } else {
          const success = await placeOrderInternal("pay-later", "");
          addMessage({
            role: "assistant",
            content: success
              ? "Your order has been placed! You can track it in My Orders."
              : "Sorry, I couldn't place your order. Please try again or call staff.",
          });
        }
      } else {
        await sendMessageStreaming(message, messages.slice(-10));
      }
    }
  }, [messages, isLoading, addMessage, sendMessageStreaming, placeOrderInternal]);

  const callStaffInternal = useCallback(async (reason) => {
    if (!tableContext) return;

    try {
      const response = await fetch("/api/staff-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: tableContext.tableId,
          tableNumber: tableContext.tableNumber,
          zoneName: tableContext.zoneName,
          reason,
        }),
      });

      const data = await response.json();
      addMessage({
        role: "assistant",
        content: data.success
          ? "I've notified our staff. Someone will be with you shortly."
          : "I couldn't reach staff right now. Please try again in a moment.",
      });
    } catch (error) {
      console.error("Staff call error:", error);
      addMessage({
        role: "assistant",
        content: "I couldn't reach staff right now. Please try again in a moment.",
      });
    }
  }, [tableContext, addMessage]);

  const requestZoneChangeInternal = useCallback(async (targetZone) => {
    if (!tableContext) return;

    try {
      const response = await fetch("/api/zone-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: tableContext.tableId,
          tableNumber: tableContext.tableNumber,
          currentZone: tableContext.zoneName,
          requestedZone: targetZone,
        }),
      });

      const data = await response.json();
      addMessage({
        role: "assistant",
        content: data.success
          ? `I've submitted your request to move to the ${targetZone}. Our staff will assist you shortly.`
          : "I couldn't submit the request right now. Please try again or call staff.",
      });
    } catch (error) {
      console.error("Zone request error:", error);
      addMessage({
        role: "assistant",
        content: "I couldn't submit the request right now. Please try again or call staff.",
      });
    }
  }, [tableContext, addMessage]);

  const callStaff = useCallback(async (reason) => {
    await callStaffInternal(reason);
  }, [callStaffInternal]);

  const requestZoneChange = useCallback(async (targetZone) => {
    await requestZoneChangeInternal(targetZone);
  }, [requestZoneChangeInternal]);

  const openChat = useCallback(() => {
    setIsOpen(true);
    if (messages.length === 0 && tableContext) {
      addMessage({
        role: "assistant",
        content: `Welcome to BTS DISC! I'm here to help you at Table ${tableContext.tableNumber}${tableContext.zoneName ? ` in the ${tableContext.zoneName}` : ""}. How may I assist you today?`,
      });
    }
  }, [messages.length, tableContext, addMessage]);

  const closeChat = useCallback(() => setIsOpen(false), []);

  return (
    <ChatContext.Provider
      value={{
        messages,
        isOpen,
        isLoading,
        tableContext,
        sendMessage,
        sendQuickReply,
        openChat,
        closeChat,
        callStaff,
        requestZoneChange,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};
