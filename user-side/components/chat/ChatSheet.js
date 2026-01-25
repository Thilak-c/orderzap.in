"use client";
import { useRef, useEffect, useState } from "react";
import { X, Send } from "lucide-react";
import { useChat } from "@/lib/chat";
import { useBranding } from "@/lib/useBranding";
import ChatMessage from "./ChatMessage";
import QuickReplyButtons from "./QuickReplyButtons";

export default function ChatSheet() {
  const {
    messages,
    isOpen,
    isLoading,
    tableContext,
    sendMessage,
    closeChat,
  } = useChat();
  const { brandName } = useBranding();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      requestAnimationFrame(() => setIsAnimating(true));
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const input = inputRef.current;
    if (input?.value.trim()) {
      sendMessage(input.value);
      input.value = "";
    }
  };

  if (!shouldRender) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isAnimating ? 'opacity-100' : 'opacity-0'}`}
        onClick={closeChat}
      />

      {/* Sheet */}
      <div className={`relative bg-[--bg] rounded-t-2xl max-h-[70vh] flex flex-col border-t border-[--border] transition-transform duration-300 ease-out ${isAnimating ? 'translate-y-0' : 'translate-y-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[--border]">
          <div>
            <h2 className="font-semibold text-[--text-primary]">{brandName} Assistant</h2>
            {tableContext && (
              <p className="text-xs text-[--muted]">
                Table {tableContext.tableNumber}
                {tableContext.zoneName && ` • ${tableContext.zoneName}`}
              </p>
            )}
          </div>
          <button
            onClick={closeChat}
            className="w-8 h-8 rounded-lg bg-[--card] border border-[--border] flex items-center justify-center hover:border-[--primary]/30 transition-all"
            aria-label="Close chat"
          >
            <X size={16} className="text-[--muted]" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px]">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          {isLoading && (
            <div className="flex gap-1 px-3 py-2">
              <span className="w-2 h-2 bg-[--primary] rounded-full animate-pulse" />
              <span className="w-2 h-2 bg-[--primary] rounded-full animate-pulse delay-75" />
              <span className="w-2 h-2 bg-[--primary] rounded-full animate-pulse delay-150" />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Replies */}
        <QuickReplyButtons />

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-3 border-t border-[--border]">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="Ask me anything..."
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="w-10 h-10 rounded-xl bg-[--primary] flex items-center justify-center hover:bg-[--primary-hover] transition-all disabled:opacity-50"
              aria-label="Send message"
            >
              <Send size={18} className="text-black" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
