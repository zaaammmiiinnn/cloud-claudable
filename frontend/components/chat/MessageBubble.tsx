"use client";
import { User, Bot } from "lucide-react";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

export default function MessageBubble({ role, content, timestamp }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={`flex gap-3 animate-fade-in ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center mt-1">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}
      <div className="flex flex-col max-w-2xl">
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "bg-gradient-to-br from-brand-600 to-brand-700 text-white rounded-br-md"
              : "glass-card text-gray-200 rounded-bl-md"
          }`}
        >
          <div className="whitespace-pre-wrap font-mono text-[13px]">{content}</div>
        </div>
        {timestamp && (
          <span className={`text-[10px] text-gray-600 mt-1 ${isUser ? "text-right" : "text-left"}`}>
            {new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-surface-400 flex items-center justify-center mt-1">
          <User className="w-4 h-4 text-gray-300" />
        </div>
      )}
    </div>
  );
}
