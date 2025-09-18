// app/chat/ChatPage.tsx
"use client";

/**
 * ChatPage
 * - Renders a simple chat UI.
 * - Sends messages to /api/chat.
 * - Supports two server response modes:
 *   (A) streaming text (Content-Type starts with "text/")
 *   (B) JSON envelope containing a JSON-RPC result with `answer`.
 */

import { useEffect, useRef, useState } from "react";
import type { Message } from "@/lib/types";
import { usePrompt } from "../components/PromptProvider";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

/** Markdown renderers; keep `node` param in signature but mark unused for type compat */
const markdownComponents: Components = {
  p({ node: _node, ...props }) {
    return <p {...props} className="mb-3 last:mb-0" />;
  },
  code(props) {
    const { children, className, ...rest } = props as {
      children?: React.ReactNode;
      className?: string;
    };
    const isBlock = typeof className === "string" && /(^|\s)language-/.test(className);
    if (!isBlock) {
      // Inline code uses a subtle bg; fenced blocks rely on rehype-highlight.
      return (
        <code
          {...rest}
          className={["rounded bg-white/10 px-1 py-0.5 text-[0.95em]", className]
            .filter(Boolean)
            .join(" ")}
        >
          {children}
        </code>
      );
    }
    return (
      <code {...rest} className={["block", className].filter(Boolean).join(" ")}>
        {children}
      </code>
    );
  },
  a({ node: _node, ...props }) {
    return (
      <a
        {...props}
        target="_blank"
        rel="noreferrer noopener"
        className="underline decoration-emerald-500 hover:opacity-80"
      />
    );
  },
  ul({ node: _node, ...props }) {
    return <ul {...props} className="list-disc pl-5 my-3 space-y-1" />;
  },
  ol({ node: _node, ...props }) {
    return <ol {...props} className="list-decimal pl-5 my-3 space-y-1" />;
  },
  table({ node: _node, ...props }) {
    return (
      <div className="overflow-x-auto">
        <table {...props} className="w-full border-separate border-spacing-0" />
      </div>
    );
  },
  th({ node: _node, ...props }) {
    return <th {...props} className="border-b border-white/10 px-3 py-2 text-left font-semibold" />;
  },
  td({ node: _node, ...props }) {
    return <td {...props} className="border-b border-white/5 px-3 py-2 align-top" />;
  },
};

/** Lightweight Markdown wrapper.
 *  Why the `as any`: plugin typings often lag; this avoids friction.
 */
function MarkdownMessage({ text }: { text: string }) {
  return (
    <div className="prose prose-invert max-w-none prose-pre:overflow-auto prose-pre:rounded-xl prose-code:before:content-[''] prose-code:after:content-['']">
      <ReactMarkdown
        remarkPlugins={[remarkGfm as any]}
        rehypePlugins={[rehypeHighlight as any]}
        components={markdownComponents}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

/** Parses stringified JSON defensively. */
function parseMaybeJSON<T = unknown>(v: unknown): T | null {
  if (v && typeof v === "string") {
    try {
      return JSON.parse(v) as T;
    } catch {
      return null; // why: server-controlled payload
    }
  }
  return typeof v === "object" && v !== null ? (v as T) : null;
}

type UiMessage = Message & { raw?: unknown };
type ServerConversationEntry = { role?: string; content?: unknown };
type ServerEnvelope = { conversation?: ServerConversationEntry[] };

function isStreamingContentType(ct: string): boolean {
  return ct.includes("text/");
}

/** Finds last system entry to reduce coupling to upstream server ordering choices. */
function findLastSystemEntry(conversation: ServerConversationEntry[] | undefined) {
  if (!Array.isArray(conversation) || conversation.length === 0) return null;
  for (let i = conversation.length - 1; i >= 0; i--) {
    const e = conversation[i];
    if (e && e.role === "system") return e;
  }
  return null;
}

/** Appends a streamed chunk to the last assistant message. */
function appendStreamChunk(prev: UiMessage[], chunk: string): UiMessage[] {
  const last = prev[prev.length - 1];
  return [...prev.slice(0, -1), { ...last, content: (last.content || "") + chunk }];
}

export default function ChatPage() {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const { input, setInput, addRecent } = usePrompt();
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement | null>(null);

  // Auto-scroll on new messages for typical chat behavior.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || busy) return;

    try {
      addRecent({ title: undefined, body: text });
    } catch {}

    // Optimistic assistant placeholder enables smooth streaming updates.
    setInput("");
    setBusy(true);
    const next: UiMessage[] = [
      ...messages,
      { role: "user" as const, content: text },
      { role: "assistant" as const, content: "" },
    ];
    setMessages(next);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(0, -1) }),
      });

      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);

      const ct = res.headers.get("Content-Type") || "";

      // (A) Streamed text (e.g., SSE) → incrementally append chunks.
      if (isStreamingContentType(ct)) {
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          setMessages((prev) => appendStreamChunk(prev, chunk));
        }
        return;
      }

      // (B) JSON envelope → extract answer from last system message (JSON-RPC result).
      const data = (await res.json()) as ServerEnvelope;
      if (!data?.conversation || !Array.isArray(data.conversation) || data.conversation.length === 0) {
        throw new Error("Invalid response: conversation is missing or empty");
      }

      const systemEntry = findLastSystemEntry(data.conversation);
      if (!systemEntry) throw new Error("No system message found in conversation");

      const contentObj = parseMaybeJSON<any>(systemEntry.content);
      if (!contentObj || typeof contentObj !== "object") {
        throw new Error("System content is missing or not valid JSON/object");
      }
      if (contentObj.jsonrpc !== "2.0" || !contentObj.result || typeof contentObj.result !== "object") {
        throw new Error("System content is not a valid JSON-RPC 2.0 envelope with `result`");
      }

      const answer = contentObj.result?.answer;
      if (typeof answer !== "string") throw new Error("Result.answer missing or not a string");

      const rawFullMessage = data as unknown;
      setMessages((prev) => [...prev.slice(0, -1), { role: "assistant", content: answer, raw: rawFullMessage }]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setMessages((prev) => [...prev.slice(0, -1), { role: "assistant", content: `Error parsing response: ${msg}` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#212121] text-white flex flex-col">
      {/* Scrollable chat area */}
      <main className="flex-1">
        <div
          ref={scroller}
          className="mx-auto w-full max-w-3xl px-4 py-6 space-y-4 overflow-y-auto pb-28"
        >
          {messages.length === 0 && (
            <div className="rounded-lg border border-white/10 bg-[#212121] p-4 text-sm text-zinc-200">
              Message SkyPilot to get started.
            </div>
          )}

          {messages.map((m, i) => {
            const isUser = m.role === "user";
            const showDebug = m.role === "assistant" && m.raw != null; // why: keep raw unknown but render-safe

            return (
              <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div
                  className={[
                    "max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed",
                    isUser
                      ? "bg-[#212121] border border-white/10 text-zinc-100"
                      : "bg-[#171717] text-zinc-100",
                  ].join(" ")}
                >
                  {isUser ? (
                    <div className="whitespace-pre-wrap break-words">{m.content}</div>
                  ) : (
                    <MarkdownMessage text={m.content} />
                  )}

                  {/* Exposes raw server payload for debugging only. */}
                  {showDebug && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm text-zinc-300 hover:opacity-80">
                        Show JSON details
                      </summary>
                      <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-[#111318] p-3 text-xs text-zinc-100">
                        <code>{JSON.stringify(m.raw, null, 2)}</code>
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Bottom composer (fixed) */}
      <div className="sticky bottom-0 inset-x-0 border-t border-white/10 bg-gradient-to-t from-[#212121] to-[#212121]">
        <div className="mx-auto w-full max-w-3xl px-4 py-4">
          <div className="relative">
            <textarea
              className="min-h-[44px] max-h-40 w-full resize-none rounded-2xl border border-white/10 bg-[#303030] px-4 py-3 pr-12 text-[15px] text-white placeholder-zinc-400 outline-none focus:border-white/20"
              placeholder="Message SkyPilot…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
              disabled={busy}
            />
            <button
              aria-label="Send"
              onClick={sendMessage}
              disabled={busy || !input.trim()}
              className="absolute right-2 bottom-6 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:opacity-40"
            >
              ➤
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
