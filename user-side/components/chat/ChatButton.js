"use client";
import { MessageCircle } from "lucide-react";
import { useChat } from "@/lib/chat";

export default function ChatButton() {
  const { openChat, isOpen } = useChat();

  if (isOpen) return null;

  return (
    <button
      onClick={openChat}
      className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-[--primary] flex items-center justify-center shadow-lg hover:bg-[--primary-hover] transition-all z-40 animate-scale-in"
      aria-label="Open chat assistant"
    >
      <MessageCircle size={24} className="text-black" />
    </button>
  );
}
