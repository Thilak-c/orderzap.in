"use client";

export default function ChatMessage({ message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} animate-fade-in`}>
      <div
        className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
          isUser
            ? "bg-[--primary] text-black rounded-br-sm"
            : "bg-[--card] text-[--text-primary] border border-[--border] rounded-bl-sm"
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}
