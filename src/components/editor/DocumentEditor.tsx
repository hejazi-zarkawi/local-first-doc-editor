"use client";

import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { useLocalFirstDoc } from "@/lib/sync/useLocalFirstDoc";
import { SyncStatusBadge } from "./SyncStatusBadge";
import { VersionHistoryPanel } from "./VersionHistoryPanel";
import { AiPanel } from "./AiPanel";

export function DocumentEditor({
  documentId,
  role,
}: {
  documentId: string;
  role: "OWNER" | "EDITOR" | "VIEWER";
}) {
  const { doc, status, ready } = useLocalFirstDoc(documentId);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [content, setContent] = useState("");
  const readOnly = role === "VIEWER";

  // Bind a plain textarea to a Y.Text. A production build would swap this
  // for a rich-text binding (y-prosemirror/y-quill); a textarea keeps the
  // CRDT wiring legible for review without pulling in a rich editor dep.
  useEffect(() => {
    if (!ready) return;
    const ytext = doc.getText("content");

    const render = () => setContent(ytext.toString());
    render();
    ytext.observe(render);
    return () => ytext.unobserve(render);
  }, [doc, ready]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (readOnly) return;
    const ytext = doc.getText("content");
    const next = e.target.value;
    doc.transact(() => {
      ytext.delete(0, ytext.length);
      ytext.insert(0, next);
    }, "local-edit");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <SyncStatusBadge status={status} />
        {readOnly && (
          <span className="text-xs rounded-full bg-amber-100 text-amber-800 px-3 py-1">
            View only
          </span>
        )}
      </div>

      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        readOnly={readOnly}
        aria-label="Document content"
        aria-readonly={readOnly}
        className="min-h-[420px] w-full resize-y rounded-xl border border-neutral-200 bg-white p-4 font-mono text-sm leading-relaxed shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 disabled:bg-neutral-50"
        placeholder={ready ? "Start writing..." : "Loading your document..."}
        disabled={!ready}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <VersionHistoryPanel documentId={documentId} canWrite={!readOnly} onRestored={() => {
          // Y.Doc updates arrive over the normal sync pull cycle; no manual
          // reload needed since the textarea is bound to the Y.Text observer.
        }} />
        {!readOnly && <AiPanel documentId={documentId} getText={() => doc.getText("content").toString()} />}
      </div>
    </div>
  );
}
