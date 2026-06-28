"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { getWsUrl } from "@/lib/api";

export interface StreamMessage {
  type: "start" | "chunk" | "done" | "error" | "file_content" | "pong";
  text?: string;
  files?: string[];
  path?: string;
  content?: string;
  message?: string;
}

export function useClaudeStream(projectId: string | null, token: string | null) {
  const ws = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [output, setOutput] = useState<string>("");
  const [files, setFiles] = useState<string[]>([]);
  const listeners = useRef<((msg: StreamMessage) => void)[]>([]);

  const connect = useCallback(() => {
    if (!projectId || !token) return;
    const url = getWsUrl(projectId, token);
    const socket = new WebSocket(url);
    ws.current = socket;

    socket.onopen = () => {
      setConnected(true);
      // Keepalive ping
      const interval = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN)
          socket.send(JSON.stringify({ type: "ping" }));
      }, 25000);
      socket.onclose = () => {
        clearInterval(interval);
        setConnected(false);
        setStreaming(false);
      };
    };

    socket.onmessage = (event) => {
      const msg: StreamMessage = JSON.parse(event.data);
      if (msg.type === "start") {
        setOutput("");
        setStreaming(true);
      } else if (msg.type === "chunk" && msg.text) {
        setOutput((prev) => prev + msg.text);
      } else if (msg.type === "done") {
        setStreaming(false);
        if (msg.files) setFiles(msg.files);
      } else if (msg.type === "error") {
        setStreaming(false);
      }
      listeners.current.forEach((fn) => fn(msg));
    };

    socket.onerror = () => {
      setConnected(false);
      setStreaming(false);
    };
  }, [projectId, token]);

  useEffect(() => {
    connect();
    return () => ws.current?.close();
  }, [connect]);

  const sendPrompt = useCallback(
    (prompt: string) => {
      if (!ws.current || ws.current.readyState !== WebSocket.OPEN) return;
      ws.current.send(JSON.stringify({ type: "prompt", prompt }));
    },
    []
  );

  const readFile = useCallback((path: string) => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) return;
    ws.current.send(JSON.stringify({ type: "read_file", path }));
  }, []);

  const onMessage = useCallback((fn: (msg: StreamMessage) => void) => {
    listeners.current.push(fn);
    return () => { listeners.current = listeners.current.filter((f) => f !== fn); };
  }, []);

  return { connected, streaming, output, files, sendPrompt, readFile, onMessage };
}
