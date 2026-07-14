"use client";

import { useState } from "react";

export function AiPanel({
  documentId,
  getText,
}: {
  documentId: string;
  getText: () => string;
}) {
  const [mode, setMode] = useState<"summarize" | "continue">("summarize");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setResult("");
    try {
      const res = await fetch(`/api/documents/${documentId}/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, text: getText() }),
      });
      const data = await res.json();
      setResult(res.ok ? data.result : `Error: ${data.error}`);
    } catch {
      setResult("AI request failed. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-neutral-900">AI assist</h3>
      <div className="mb-3 flex gap-2">
        <button
          onClick={() => setMode("summarize")}
          className={`text-xs rounded-lg px-3 py-1.5 ${mode === "summarize" ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-700"}`}
        >
          Summarize
        </button>
        <button
          onClick={() => setMode("continue")}
          className={`text-xs rounded-lg px-3 py-1.5 ${mode === "continue" ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-700"}`}
        >
          Continue writing
        </button>
        <button
          onClick={run}
          disabled={loading}
          className="ml-auto text-xs rounded-lg border border-neutral-300 px-3 py-1.5 hover:bg-neutral-50 disabled:opacity-50"
        >
          {loading ? "Thinking..." : "Run"}
        </button>
      </div>
      <div className="min-h-[80px] rounded-lg bg-neutral-50 p-3 text-xs text-neutral-700 whitespace-pre-wrap">
        {result || "AI output will appear here."}
      </div>
    </div>
  );
}
