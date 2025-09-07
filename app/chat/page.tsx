"use client";

import { useEffect, useRef, useState } from "react";
import type { Message } from "@/lib/types";

type LLMReply = {
  answer: string;
  confidence: number;
  citations: string[];
  actions: { tool: string; input: Record<string, unknown> }[];
  debug: { reasoning: string };
};
type UiMessage = Message & { raw?: LLMReply };

export default function ChatPage() {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
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
      if (ct.includes("text/") || ct.includes("event-stream")) {
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            return [...prev.slice(0, -1), { ...last, content: last.content + chunk }];
          });
        }
      } else {
        const data = (await res.json()) as LLMReply | { reply?: string };
        const answer = "answer" in data ? data.answer : (data.reply ?? "");
        const raw: LLMReply | undefined = "answer" in data ? (data as LLMReply) : undefined;
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: answer, raw },
        ]);
      }
    } catch (e: any) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: `Error: ${e.message}` },
      ]);
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
            const displayContent = isUser && m.content.length > 50
              ? `${m.content.substring(0, 50)}...`
              : m.content;

            return (
              <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div
                  className={[
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-[15px] leading-relaxed",
                    isUser
                      ? "bg-[#212121] border border-white/10 text-zinc-100"
                      : "bg-[#171717] text-zinc-100",
                  ].join(" ")}
                >
                  {displayContent}

                  {/* Expand/collapse JSON details under assistant replies */}
                  {m.role === "assistant" && m.raw && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm text-zinc-300 hover:opacity-80">
                        Show JSON details
                      </summary>
                      <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-[#0b1020] p-3 text-xs text-zinc-100">
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
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
              disabled={busy}
            />
            <button
              aria-label="Send"
              onClick={send}
              disabled={busy || !input.trim()}
              className="absolute right-2 bottom-6 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:opacity-40"
            >
              ➤
            </button>
          </div>
          {/* helper text row (optional) */}
          {/* <div className="mt-2 text-xs text-zinc-400">SkyPilot can make mistakes. Check important info.</div> */}
        </div>
      </div>
    </div>
  );
}
