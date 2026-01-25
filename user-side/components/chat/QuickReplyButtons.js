"use client";
import { useChat } from "@/lib/chat";

const QUICK_REPLIES = [
  { label: "Popular here", action: "popular_items", icon: "🔥" },
  { label: "What can I order?", action: "available_items", icon: "📋" },
  { label: "Place order", action: "place_order", icon: "✅" },
  { label: "Track order", action: "track_order", icon: "📦" },
  { label: "Call staff", action: "call_staff", icon: "🔔" },
];

export default function QuickReplyButtons() {
  const { sendQuickReply, isLoading } = useChat();

  return (
    <div className="px-3 pb-2 overflow-x-auto scrollbar-hide">
      <div className="flex gap-2">
        {QUICK_REPLIES.map((reply) => (
          <button
            key={reply.action}
            onClick={() => sendQuickReply(reply.action)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[--card] border border-[--border] text-xs text-[--text-secondary] whitespace-nowrap hover:border-[--primary]/30 hover:text-[--text-primary] transition-all disabled:opacity-50"
          >
            <span>{reply.icon}</span>
            <span>{reply.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
