"use client";

import { useEffect, useState, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";

type Snapshot = { id: string; label: string | null; createdAt: string; author: { name: string | null; email: string } };

export function VersionHistoryPanel({
  documentId,
  canWrite,
  onRestored,
}: {
  documentId: string;
  canWrite: boolean;
  onRestored: () => void;
}) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/documents/${documentId}/snapshots`);
    if (res.ok) setSnapshots((await res.json()).snapshots);
  }, [documentId]);

  useEffect(() => {
    load();
  }, [load]);

  const capture = async () => {
    setBusy(true);
    try {
      await fetch(`/api/documents/${documentId}/snapshots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: `Snapshot ${new Date().toLocaleString()}` }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const restore = async (snapshotId: string) => {
    setBusy(true);
    try {
      await fetch(`/api/documents/${documentId}/snapshots`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshotId }),
      });
      await load();
      onRestored();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-900">Version history</h3>
        {canWrite && (
          <button
            onClick={capture}
            disabled={busy}
            className="text-xs rounded-lg bg-neutral-900 px-3 py-1.5 text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            Capture snapshot
          </button>
        )}
      </div>
      <ul className="flex max-h-56 flex-col gap-2 overflow-y-auto">
        {snapshots.length === 0 && <li className="text-xs text-neutral-500">No snapshots yet.</li>}
        {snapshots.map((s) => (
          <li key={s.id} className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 text-xs">
            <div>
              <div className="font-medium text-neutral-800">{s.label ?? "Untitled snapshot"}</div>
              <div className="text-neutral-500">
                {s.author.name ?? s.author.email} · {formatDistanceToNow(new Date(s.createdAt), { addSuffix: true })}
              </div>
            </div>
            {canWrite && (
              <button
                onClick={() => restore(s.id)}
                disabled={busy}
                className="rounded-md border border-neutral-300 px-2 py-1 text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
              >
                Restore
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
