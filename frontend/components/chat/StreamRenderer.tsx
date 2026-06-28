"use client";
import { Bot, Wrench, CheckCircle, AlertCircle, Terminal } from "lucide-react";

interface StreamEvent {
  type: string;
  event?: string;
  text?: string;
  tool?: string;
  input?: Record<string, any>;
  content?: string;
  is_error?: boolean;
  cost_usd?: number;
  duration_ms?: number;
}

interface StreamRendererProps {
  events: StreamEvent[];
  isStreaming: boolean;
}

export default function StreamRenderer({ events, isStreaming }: StreamRendererProps) {
  if (events.length === 0 && !isStreaming) return null;

  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center mt-1">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 max-w-2xl space-y-2">
        {events.map((ev, i) => (
          <StreamEventBlock key={i} event={ev} />
        ))}
        {isStreaming && (
          <span className="inline-block w-2 h-5 bg-brand-400 animate-typing-cursor rounded-sm ml-1" />
        )}
      </div>
    </div>
  );
}

function StreamEventBlock({ event }: { event: StreamEvent }) {
  const evType = event.event || event.type;

  if (evType === "assistant" || evType === "text" || evType === "chunk") {
    const text = event.text || "";
    if (!text) return null;
    return (
      <div className="glass-card rounded-xl px-4 py-3 text-[13px] font-mono leading-relaxed text-gray-200 whitespace-pre-wrap">
        {text}
      </div>
    );
  }

  if (evType === "tool_use") {
    const toolName = event.tool || "unknown";
    const input = event.input || {};
    const displayInput = formatToolInput(toolName, input);
    return (
      <div className="rounded-xl border border-brand-900/40 bg-brand-950/20 px-4 py-3 text-[13px]">
        <div className="flex items-center gap-2 text-brand-400 mb-1">
          <Wrench className="w-3.5 h-3.5" />
          <span className="font-semibold">{toolName}</span>
        </div>
        {displayInput && (
          <div className="text-gray-500 font-mono text-xs mt-1 truncate">{displayInput}</div>
        )}
      </div>
    );
  }

  if (evType === "tool_result") {
    const isError = event.is_error;
    const content = event.content || "";
    return (
      <div
        className={`rounded-xl px-4 py-3 text-[12px] font-mono border ${
          isError
            ? "border-red-900/40 bg-red-950/10 text-red-300"
            : "border-green-900/30 bg-green-950/10 text-green-300"
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          {isError ? (
            <AlertCircle className="w-3.5 h-3.5 text-red-400" />
          ) : (
            <CheckCircle className="w-3.5 h-3.5 text-green-400" />
          )}
          <span className="text-xs font-semibold">{isError ? "Error" : "Success"}</span>
        </div>
        <div className="whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
          {content}
        </div>
      </div>
    );
  }

  if (evType === "result") {
    const cost = event.cost_usd;
    const duration = event.duration_ms;
    return (
      <div className="flex items-center gap-3 text-[11px] text-gray-500 py-1">
        <Terminal className="w-3 h-3" />
        <span>Completed</span>
        {duration != null && <span>· {(duration / 1000).toFixed(1)}s</span>}
        {cost != null && <span>· ${cost.toFixed(4)}</span>}
      </div>
    );
  }

  // Fallback: raw text
  const text = event.text || "";
  if (!text) return null;
  return (
    <div className="text-[13px] font-mono text-gray-400 whitespace-pre-wrap">
      {text}
    </div>
  );
}

function formatToolInput(tool: string, input: Record<string, any>): string {
  if (tool === "Write" || tool === "write") {
    return input.file_path || input.path || "";
  }
  if (tool === "Read" || tool === "read") {
    return input.file_path || input.path || "";
  }
  if (tool === "Bash" || tool === "bash") {
    return input.command || "";
  }
  if (tool === "Edit" || tool === "edit") {
    return input.file_path || input.path || "";
  }
  const keys = Object.keys(input);
  if (keys.length > 0) {
    return keys.map((k) => `${k}: ${JSON.stringify(input[k]).slice(0, 60)}`).join(", ");
  }
  return "";
}
