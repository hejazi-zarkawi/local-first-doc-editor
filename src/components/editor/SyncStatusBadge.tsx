import type { SyncStatus } from "@/lib/sync/useLocalFirstDoc";

const CONFIG: Record<SyncStatus, { label: string; dot: string; text: string }> = {
  offline: { label: "Offline — saving locally", dot: "bg-neutral-400", text: "text-neutral-600" },
  syncing: { label: "Syncing...", dot: "bg-amber-500 animate-pulse", text: "text-amber-700" },
  synced: { label: "All changes synced", dot: "bg-emerald-500", text: "text-emerald-700" },
  error: { label: "Sync error — will retry", dot: "bg-red-500", text: "text-red-700" },
};

export function SyncStatusBadge({ status }: { status: SyncStatus }) {
  const cfg = CONFIG[status];
  return (
    <div className={`flex items-center gap-2 text-sm ${cfg.text}`} role="status" aria-live="polite">
      <span className={`h-2 w-2 rounded-full ${cfg.dot}`} aria-hidden="true" />
      {cfg.label}
    </div>
  );
}
