"use client";
import { ChatProvider } from "@/lib/chat";
import ChatButton from "./ChatButton";
import ChatSheet from "./ChatSheet";

export default function ChatAssistant({ tableContext, menuItems, activeOrder, cart, cartActions, sessionId }) {
  if (!tableContext) return null;

  return (
    <ChatProvider
      tableContext={tableContext}
      menuItems={menuItems}
      activeOrder={activeOrder}
      cart={cart}
      cartActions={cartActions}
      sessionId={sessionId}
    >
      <ChatButton />
      <ChatSheet />
    </ChatProvider>
  );
}
