"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { useClaudeStream, StreamMessage } from "@/hooks/useClaudeStream";
import {
  Send,
  ChevronLeft,
  Download,
  Wifi,
  WifiOff,
  Loader2,
  Copy,
  Check,
  X,
  Sparkles,
  Terminal,
  Code2,
  Globe,
  Briefcase,
} from "lucide-react";
import SyntaxHighlighter from "react-syntax-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import Logo from "@/components/ui/Logo";
import MessageBubble from "@/components/chat/MessageBubble";
import StreamRenderer from "@/components/chat/StreamRenderer";
import FileTree from "@/components/files/FileTree";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

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

function detectLang(path: string) {
  const ext = path.split(".").pop() || "";
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    py: "python", json: "json", md: "markdown", css: "css", html: "html",
    sh: "bash", yml: "yaml", yaml: "yaml", sql: "sql", rs: "rust",
    go: "go", rb: "ruby", java: "java", xml: "xml", toml: "toml",
  };
  return map[ext] || "text";
}

const EXAMPLE_PROMPTS = [
  {
    text: "Build a full Todo app with React + local storage and dark mode",
    icon: Sparkles,
    color: "text-purple-400",
  },
  {
    text: "Create a CRM dashboard with mock contacts, deal pipeline, and revenue chart",
    icon: Briefcase,
    color: "text-blue-400",
  },
  {
    text: "Build an Expense Tracker with categories, monthly totals, and bar chart",
    icon: Terminal,
    color: "text-green-400",
  },
  {
    text: "Generate a personal portfolio website with hero section and projects grid",
    icon: Globe,
    color: "text-orange-400",
  },
];

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const { session, loading, token } = useAuth();
  const router = useRouter();

  const [project, setProject] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [streamEvents, setStreamEvents] = useState<StreamEvent[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { connected, streaming, output, files, sendPrompt, readFile, onMessage } =
    useClaudeStream(id, token);

  useEffect(() => {
    if (!loading && !session) router.push("/");
  }, [session, loading, router]);

  useEffect(() => {
    if (token && id) {
      api.getProject(token, id).then(setProject).catch(console.error);
      api.getChatHistory(token, id).then((history: any[]) =>
        setMessages(history.map((m) => ({ role: m.role, content: m.message, timestamp: m.timestamp })))
      ).catch(console.error);
    }
  }, [token, id]);

  // Listen for file_content and structured stream events
  useEffect(() => {
    const unsub = onMessage((msg: StreamMessage) => {
      if (msg.type === "file_content" && msg.content !== undefined) {
        setFileContent(msg.content);
      }
      // Collect structured stream events for the StreamRenderer
      if (msg.type === "chunk") {
        setStreamEvents((prev) => [...prev, msg as any]);
      }
      if (msg.type === "start") {
        setStreamEvents([]);
      }
    });
    return unsub;
  }, [onMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, output, streamEvents]);

  // When streaming ends, consolidate into a message
  useEffect(() => {
    if (!streaming && output) {
      setMessages((m) => {
        const last = m[m.length - 1];
        if (last?.role === "assistant" && last.content === output) return m;
        return [...m, { role: "assistant", content: output }];
      });
      setStreamEvents([]);
    }
  }, [streaming, output]);

  function handleSend(text?: string) {
    const prompt = (text || input).trim();
    if (!prompt || streaming) return;
    setMessages((m) => [...m, { role: "user", content: prompt }]);
    setInput("");
    setStreamEvents([]);
    sendPrompt(prompt);
  }

  function handleFileClick(path: string) {
    setSelectedFile(path);
    setFileContent("");
    readFile(path);
  }

  async function handleDownload() {
    if (!token) return;
    try {
      const { download_url } = await api.downloadProject(token, id);
      window.open(download_url, "_blank");
    } catch (err) {
      console.error("Download error:", err);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(fileContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex h-screen bg-surface-0 overflow-hidden">
      {/* ─── Sidebar: File Tree ─── */}
      <aside className="w-60 border-r border-white/[0.06] flex flex-col bg-surface-50/80 backdrop-blur-sm">
        {/* Sidebar header */}
        <div className="p-3 border-b border-white/[0.06] flex items-center gap-2">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-surface-300"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-white truncate flex-1">
            {project?.project_name || "Project"}
          </span>
        </div>

        {/* File tree */}
        <div className="flex-1 overflow-y-auto px-1">
          <FileTree files={files} selectedFile={selectedFile} onSelectFile={handleFileClick} />
        </div>

        {/* Sidebar footer */}
        <div className="p-3 border-t border-white/[0.06] space-y-2">
          <button
            onClick={handleDownload}
            className="w-full flex items-center gap-2 justify-center glass-card rounded-xl px-3 py-2 text-xs text-gray-400 hover:text-white transition-colors glass-card-hover"
          >
            <Download className="w-3.5 h-3.5" /> Download ZIP
          </button>
        </div>
      </aside>

      {/* ─── Chat Panel ─── */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Topbar */}
        <div className="border-b border-white/[0.06] px-5 py-2.5 flex items-center gap-4 glass">
          <Logo size="sm" showText={false} />
          <div className="h-4 w-px bg-surface-400" />
          <div
            className={`flex items-center gap-1.5 text-xs font-medium ${
              connected ? "text-green-400" : "text-gray-600"
            }`}
          >
            {connected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {connected ? "Connected" : "Disconnected"}
          </div>
          {streaming && (
            <div className="flex items-center gap-1.5 text-xs text-brand-400 font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Claude Code running...
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Empty state with prompt templates */}
          {messages.length === 0 && !streaming && (
            <div className="max-w-xl mx-auto pt-10 animate-fade-in-up">
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-600/20 to-brand-800/20 flex items-center justify-center mx-auto mb-4">
                  <Code2 className="w-7 h-7 text-brand-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">What would you like to build?</h2>
                <p className="text-gray-500 text-sm">
                  Claude Code will plan, write, and run your app — entirely in the cloud.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 stagger-children">
                {EXAMPLE_PROMPTS.map((p) => (
                  <button
                    key={p.text}
                    onClick={() => handleSend(p.text)}
                    className="text-left glass-card glass-card-hover rounded-xl px-5 py-4 flex items-center gap-4 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-surface-300 flex items-center justify-center flex-shrink-0 group-hover:bg-surface-400 transition-colors">
                      <p.icon className={`w-5 h-5 ${p.color}`} />
                    </div>
                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                      {p.text}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat messages */}
          {messages.map((m, i) => (
            <MessageBubble key={i} role={m.role} content={m.content} timestamp={m.timestamp} />
          ))}

          {/* Live streaming output */}
          {streaming && streamEvents.length > 0 && (
            <StreamRenderer events={streamEvents} isStreaming={streaming} />
          )}

          {/* Streaming with raw text fallback (when no structured events) */}
          {streaming && streamEvents.length === 0 && output && (
            <div className="flex gap-3 animate-fade-in">
              <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center mt-1">
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              </div>
              <div className="max-w-2xl glass-card rounded-2xl rounded-bl-md px-4 py-3 text-[13px] font-mono leading-relaxed text-gray-200 whitespace-pre-wrap">
                {output}
                <span className="inline-block w-2 h-5 bg-brand-400 animate-typing-cursor rounded-sm ml-1" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-white/[0.06] p-4 glass">
          <div className="flex gap-3 items-end max-w-3xl mx-auto">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Describe what you want to build... (Enter to send)"
              disabled={streaming || !connected}
              rows={2}
              className="flex-1 input-dark resize-none disabled:opacity-40 text-sm"
            />
            <button
              onClick={() => handleSend()}
              disabled={streaming || !connected || !input.trim()}
              className="btn-primary p-3 disabled:opacity-30"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Code Viewer ─── */}
      {selectedFile && (
        <div className="w-[500px] border-l border-white/[0.06] flex flex-col bg-surface-50/80 backdrop-blur-sm animate-slide-in-right">
          {/* Viewer header */}
          <div className="px-4 py-2.5 border-b border-white/[0.06] flex items-center justify-between">
            <span className="text-xs text-gray-400 font-mono truncate flex-1">{selectedFile}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="text-gray-500 hover:text-white p-1 rounded transition-colors"
                title="Copy contents"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-green-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setFileContent("");
                }}
                className="text-gray-500 hover:text-white p-1 rounded transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Code */}
          <div className="flex-1 overflow-auto text-xs">
            {fileContent ? (
              <SyntaxHighlighter
                language={detectLang(selectedFile)}
                style={atomOneDark}
                customStyle={{
                  background: "transparent",
                  padding: "1rem",
                  margin: 0,
                  minHeight: "100%",
                }}
                showLineNumbers
                lineNumberStyle={{ color: "#3f3f46", fontSize: "11px" }}
              >
                {fileContent}
              </SyntaxHighlighter>
            ) : (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
