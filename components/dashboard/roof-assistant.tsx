"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Explain this quote in plain language",
  "Why is a waste factor needed here?",
  "Why do the ridge and valley quantities matter?",
  "Summarize this roof for the homeowner",
];

export function RoofAssistant({ projectId }: { projectId: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    const history = [...messages, { role: "user" as const, content: q }];
    // Show the user's turn immediately, plus an empty assistant bubble to stream into.
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok) {
        // Surface the server's reason verbatim — notably the rate-limit message,
        // which tells the roofer what the cap is and when it resets.
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || `The assistant is unavailable (${res.status}).`);
      }
      if (!res.body) throw new Error("The assistant returned an empty response.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }
    } catch (err) {
      console.error("[roof-assistant]", err);
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          role: "assistant",
          content:
            err instanceof Error && err.message
              ? err.message
              : "Sorry — I couldn't reach the assistant. Please try again.",
        };
        return copy;
      });
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <div className="flex h-[520px] flex-col rounded-2xl border border-hairline bg-surface-raised">
      <div className="flex items-center justify-between border-b border-hairline px-5 py-3">
        <div>
          <h3 className="text-sm font-semibold text-ink-primary">Roof assistant</h3>
          <p className="text-xs text-ink-primary/50">Grounded in this project&apos;s measurements & estimate</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="rounded-lg px-2 py-1 text-xs text-ink-primary/50 hover:bg-surface-lifted hover:text-ink-primary"
          >
            Clear
          </button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-ink-primary/60">
              Ask about the quote, the measurements, or how to explain this roof. Try:
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-hairline bg-surface-raised px-3 py-1.5 text-xs text-ink-primary/80 hover:border-white/20 hover:bg-surface-lifted"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={
                  m.role === "user"
                    ? "max-w-[85%] rounded-2xl rounded-br-sm bg-blue-600 px-3.5 py-2 text-sm text-ink-primary"
                    : "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm border border-hairline bg-surface-raised px-3.5 py-2 text-sm text-ink-primary/90"
                }
              >
                {m.content || (busy && i === messages.length - 1 ? "…" : "")}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-hairline p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Ask about this roof or its quote…"
            className="max-h-32 flex-1 resize-none rounded-xl border border-hairline bg-ground/50 px-3 py-2 text-sm text-ink-primary placeholder:text-ink-primary/40 focus:border-white/25 focus:outline-none"
          />
          <button
            onClick={() => send(input)}
            disabled={busy || !input.trim()}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-ink-primary hover:bg-signal-blue disabled:opacity-40"
          >
            {busy ? "…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
