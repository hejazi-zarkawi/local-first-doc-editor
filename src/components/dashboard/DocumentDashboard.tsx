"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Clock3, FilePlus2, FileText, FolderOpen, LoaderCircle, Plus, Search, Sparkles } from "lucide-react";

type DocumentItem = {
  id: string;
  title: string;
  role: "OWNER" | "EDITOR" | "VIEWER";
  updatedAt: string;
};

export function DocumentDashboard({
  user,
  documents,
}: {
  user: { name: string | null; email: string | null };
  documents: DocumentItem[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const visibleDocuments = useMemo(
    () => documents.filter((document) => document.title.toLowerCase().includes(query.trim().toLowerCase())),
    [documents, query]
  );
  const displayName = user.name || user.email?.split("@")[0] || "Workspace";
  const initials = displayName.slice(0, 2).toUpperCase();

  const createDocument = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const response = await fetch("/api/documents", { method: "POST", headers: { Accept: "application/json" } });
      const data = await response.json();
      if (response.ok && data.id) router.push(`/documents/${data.id}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-73px)] bg-[#f7f7f5] text-[#37352f]">
      <div className="mx-auto flex min-h-[calc(100vh-73px)] max-w-[1440px]">
        <aside className="hidden w-64 shrink-0 border-r border-[#e8e8e5] bg-[#f1f1ef] p-4 lg:flex lg:flex-col">
          <Link href="/" className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-[#37352f] hover:bg-[#e8e8e5]">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-[#37352f] text-white"><FileText className="h-4 w-4" /></span>
            LocalFirst Docs
          </Link>

          <button onClick={createDocument} disabled={creating} className="mt-6 flex w-full items-center gap-2 rounded-md bg-[#37352f] px-3 py-2.5 text-sm font-medium text-white transition hover:bg-[#4a4842] disabled:opacity-60">
            {creating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create document
          </button>

          <nav className="mt-6 space-y-1 text-sm">
            <Link href="/" className="flex items-center gap-2 rounded-md bg-[#e4e4e1] px-3 py-2 font-medium"><FolderOpen className="h-4 w-4" /> All documents</Link>
            <a href="#recent-documents" className="flex items-center gap-2 rounded-md px-3 py-2 text-[#6b6964] transition hover:bg-[#e8e8e5] hover:text-[#37352f]"><Clock3 className="h-4 w-4" /> Recent</a>
          </nav>

          <div className="mt-8 border-t border-[#dfdfdc] pt-5">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a8984]">Quick start</p>
            <button onClick={createDocument} disabled={creating} className="mt-2 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-[#6b6964] hover:bg-[#e8e8e5] hover:text-[#37352f]">
              <FilePlus2 className="h-4 w-4" /> New blank page
            </button>
          </div>

          <div className="mt-auto flex items-center gap-2 rounded-lg px-2 py-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#d9eadd] text-xs font-semibold text-[#35623f]">{initials}</span>
            <div className="min-w-0"><p className="truncate text-sm font-medium">{displayName}</p><p className="truncate text-xs text-[#8a8984]">Personal workspace</p></div>
          </div>
        </aside>

        <section className="min-w-0 flex-1 px-5 py-6 sm:px-8 sm:py-9 lg:px-12">
          <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 lg:hidden">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#37352f] text-white"><FileText className="h-5 w-5" /></span>
              <span className="font-semibold">LocalFirst Docs</span>
            </div>
            <div>
              <p className="text-sm text-[#8a8984]">{displayName}&apos;s workspace</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-[#37352f]">Your documents</h1>
            </div>
            <button onClick={createDocument} disabled={creating} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#37352f] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#4a4842] disabled:opacity-60">
              {creating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create document
            </button>
          </header>

          <div className="mt-9 max-w-xl">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9994]" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search documents..." className="w-full rounded-lg border border-[#e1e1de] bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition placeholder:text-[#aaa9a4] focus:border-[#a8a7a1] focus:ring-2 focus:ring-[#37352f]/10" />
            </label>
          </div>

          <div id="recent-documents" className="mt-10 flex items-end justify-between border-b border-[#e4e4e1] pb-3">
            <div><h2 className="text-lg font-semibold">Recent documents</h2><p className="mt-1 text-sm text-[#8a8984]">Pick up where you left off.</p></div>
            <span className="text-xs text-[#8a8984]">{visibleDocuments.length} {visibleDocuments.length === 1 ? "document" : "documents"}</span>
          </div>

          {visibleDocuments.length > 0 ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visibleDocuments.map((document) => (
                <Link key={document.id} href={`/documents/${document.id}`} className="group rounded-xl border border-[#e4e4e1] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#cfcec9] hover:shadow-md hover:shadow-[#37352f]/5">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#f0f5f0] text-[#4a7a53]"><FileText className="h-5 w-5" /></span>
                  <h3 className="mt-5 truncate font-medium text-[#37352f] group-hover:underline group-hover:underline-offset-4">{document.title}</h3>
                  <div className="mt-3 flex items-center justify-between gap-2 text-xs text-[#8a8984]">
                    <span>Edited {formatDistanceToNow(new Date(document.updatedAt), { addSuffix: true })}</span>
                    <span className="rounded-full bg-[#f1f1ef] px-2 py-1 text-[10px] font-semibold tracking-wide text-[#6b6964]">{document.role}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-5 grid min-h-72 place-items-center rounded-xl border border-dashed border-[#d8d8d4] bg-white px-6 text-center">
              <div className="max-w-sm">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-[#f0f5f0] text-[#4a7a53]"><Sparkles className="h-6 w-6" /></span>
                <h3 className="mt-4 text-lg font-semibold">{query ? "No matching documents" : "A clear space for your next idea"}</h3>
                <p className="mt-2 text-sm leading-6 text-[#77756f]">{query ? "Try a different title or clear your search to see all your documents." : "Create your first document and it will appear here for quick access."}</p>
                {!query && <button onClick={createDocument} disabled={creating} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#37352f] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#4a4842] disabled:opacity-60"><Plus className="h-4 w-4" /> Create document</button>}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
