# Local-First Collaborative Document Editor

A collaborative document editor that works fully offline, reconciles state automatically when the network returns, resolves concurrent edits deterministically, and lets users navigate a full version history — built for the House of Edtech Fullstack Developer Assignment 2 (v2.1, April 2026).

**Live app:** _add your Vercel URL here after deploying_
**Repo:** https://github.com/hejazi-zarkawi/local-first-doc-editor

---

## Why this architecture

### Local-first, not "offline-tolerant"

Most "offline support" bolts a service worker cache onto a server-first app. This app inverts that: the **client's IndexedDB copy of the document is the primary source of truth**. Opening, editing, and closing a document never blocks on the network — there is no loading spinner waiting for a server response before you can type.

This is done with **Yjs**, a CRDT (Conflict-free Replicated Data Type) library, plus `y-indexeddb` for local persistence. Every edit becomes a Yjs update, written to IndexedDB synchronously, and queued for the server in the background.

### Why a CRDT instead of Operational Transformation or last-write-wins

The assignment explicitly calls out "deterministic conflict resolution." Three approaches were considered:

| Approach | Problem |
|---|---|
| Last-write-wins | Silently destroys concurrent edits — unacceptable for a document editor |
| Operational Transformation (OT) | Requires a central server to sequence operations; doesn't fit true offline-first (two OT clients can't converge without seeing each other's ops in a guaranteed order) |
| **CRDT (Yjs)** | Updates commute — applying A then B gives the same result as B then A. Any two replicas that have seen the same set of updates converge to an identical state, with no central coordinator required. |

CRDT convergence is verified directly in `tests/unit/crdt-merge.test.ts`.

### Why REST polling instead of WebSockets

Real-time collaboration usually reaches for WebSockets. This app deliberately doesn't, because **Vercel serverless functions don't hold persistent connections** — a WebSocket server needs a long-lived process (a separate deployment target entirely, e.g. a small VM or a service like Pusher/Ably). Given the mandate to deploy on Vercel, the sync engine is instead:

- A `POST /api/documents/:id/sync` endpoint that accepts a **batch** of queued Yjs updates
- A `GET /api/documents/:id/sync?since=<seq>` endpoint that returns anything the client hasn't seen, using an append-only `SyncOp` sequence cursor
- Client-side debounced flushing (800ms after the last local edit) so rapid typing coalesces into one request instead of one per keystroke

The tradeoff: this is near-real-time (sub-second), not instant character-by-character like a WebSocket. For a document editor (vs. a cursor-tracking pair-programming tool) that tradeoff is the right one for a serverless deployment target — see "What I'd change for true real-time" below.

### Race conditions this design handles

- **Connection drops mid-push:** if a batch POST fails partway, the client never removes those updates from its local queue, so the next flush retries them. Yjs updates are idempotent under `Y.applyUpdate` — re-sending an update the server already merged is a no-op, not a duplicate or corruption risk (`tests/unit/crdt-merge.test.ts` covers this explicitly).
- **Reconnect ordering:** on regaining connectivity, the client **pulls before it pushes** (`useLocalFirstDoc.ts`), so its next push merges against the server's latest known state rather than racing it blind.
- **Concurrent offline editors restoring old versions:** restoring a snapshot doesn't overwrite `Document.state` — it computes a forward CRDT diff from current state to the snapshot's state and applies that diff as a normal update (`src/app/api/documents/[id]/snapshots/route.ts`). This means a restore composes correctly with whatever other collaborators are concurrently editing, instead of silently discarding their work — and the restore itself becomes a new entry in the timeline, not a rewrite of history.

### Preventing a malformed/oversized payload from OOMing the server

This was called out explicitly in the assignment's security section, and is handled in three cheap-to-expensive layers in `src/lib/sync/validate.ts`, checked in that order specifically so a malicious payload is rejected before the expensive step:

1. **Raw `Content-Length` cap** (2MB) — rejected before the body is even read.
2. **Per-update decoded byte-length cap** (1.5MB) — protects against base64 expansion tricks and payloads with many small-looking-but-actually-huge entries; batch size is also capped at 50 updates/request.
3. **Structural validation** — every update is applied to a **throwaway** `Y.Doc`, never the real document, inside a `try/catch`. A forged or corrupted buffer throws and is rejected with a 422; it never has a chance to corrupt real document state, and the scratch doc is destroyed either way.

All three are unit-tested in `tests/unit/validate.test.ts`.

### Authentication, authorization, and tenant isolation

- **NextAuth (Auth.js v5)**, credentials provider, JWT sessions.
- Roles are **per-document**, not global: `DocumentMember` maps `(documentId, userId) → Role`. A user can be an Owner on one document and a Viewer on another.
- **Viewers are blocked from pushing updates at two independent layers**: the application layer (`sync/route.ts` checks role before touching Yjs) and the database layer (Postgres Row Level Security policy `syncop_write` in `prisma/migrations/000_enable_rls/migration.sql` requires `role IN ('OWNER','EDITOR')` on `INSERT`). If a future code change ever forgets the app-layer check, the database still refuses the write.
- **Tenant isolation** more broadly is enforced via RLS: every table scoped to a document checks `current_setting('app.current_user_id')` against `DocumentMember`. Since Prisma uses one pooled connection role rather than per-user DB roles, `src/lib/db.ts`'s `withUserContext()` sets that session variable inside a transaction for the duration of each request — so RLS applies per-request, not just per-connection.

---

## Tech stack

- **Next.js 16** (App Router, TypeScript, Server Components + Route Handlers)
- **React 19**
- **Tailwind CSS** for styling, minimal Radix primitives for accessible interactive elements
- **PostgreSQL** + **Prisma** (schema in `prisma/schema.prisma`) + Row Level Security
- **NextAuth (Auth.js v5)** — credentials auth, JWT sessions, role-based authorization
- **Yjs** + `y-indexeddb` — CRDT engine and local persistence
- **Zod** — runtime validation on every API boundary
- **AI SDK** + **Groq** (`llama-3.3-70b-versatile`) — optional AI add-on (summarize / continue writing)
- **Vitest** — unit tests (CRDT convergence, payload validation)
- **Playwright** — e2e tests (offline editing flow, role enforcement)
- **GitHub Actions** — CI (lint, test, build) → Vercel deploy on merge to `main`

---

## Getting started locally

### Prerequisites
- Node.js 22+
- A PostgreSQL database (local via Docker, or a free hosted instance from [Neon](https://neon.tech) or [Supabase](https://supabase.com) — both work well with Vercel)

### Setup

```bash
git clone https://github.com/hejazi-zarkawi/local-first-doc-editor.git
cd local-first-doc-editor
npm install
cp .env.example .env
# edit .env: set DATABASE_URL, generate NEXTAUTH_SECRET with `openssl rand -base64 32`

npm run prisma:migrate   # creates tables + applies RLS policies
npm run seed              # creates 3 demo users (owner/editor/viewer) + 1 shared doc

npm run dev                # http://localhost:3000
```

Demo accounts (from `npm run seed`), all with password `password123`:
- `owner@example.com` — Owner on the seeded document
- `editor@example.com` — Editor
- `viewer@example.com` — Viewer (read-only, cannot push edits)

### Testing offline behavior locally
Open the app, sign in, open a document, then in DevTools → Network tab, switch to "Offline." Keep typing — the textarea keeps working and the status badge switches to "Offline — saving locally." Switch back to "Online" and watch it flush the queued edits and switch to "All changes synced."

### Running tests

```bash
npm run test          # unit tests: CRDT convergence + payload validation
npm run test:e2e       # e2e: requires `npm run dev` running + a seeded DB
```

---

## Deployment (Vercel)

1. Push this repo to GitHub (done — see below).
2. In Vercel: **New Project → Import** this repo.
3. Add environment variables in the Vercel project settings: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (your production URL), and optionally `GROQ_API_KEY`.
4. Vercel auto-detects Next.js; the build command (`npm run build`) already runs `prisma generate` first.
5. Run `npx prisma migrate deploy` once against your production database (from your machine, pointed at the prod `DATABASE_URL`) to create tables and apply RLS policies before first use.
6. For the CI → auto-deploy workflow in `.github/workflows/ci.yml` to work, add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` as GitHub repo secrets (found via `vercel link` + Vercel account settings). This step is optional — you can also just let Vercel's own GitHub integration auto-deploy on push, without the Actions job.

---

## Addressing the evaluation criteria directly

- **Functionality:** offline editing, queued sync with retry, CRDT merge, snapshot-based version history with non-destructive restore, Zod validation on every write endpoint, role-based auth — see route handlers under `src/app/api/`.
- **UI:** connection-status indicator (`SyncStatusBadge`), responsive layout, `aria-live` status region, visible focus rings, `prefers-reduced-motion` respected (`globals.css`).
- **Code quality:** sync engine and merge logic isolated in `src/lib/sync/`; every non-obvious decision has an inline comment explaining *why*, not just *what*.
- **Testing:** `tests/unit/crdt-merge.test.ts` proves order-independent convergence and update idempotency; `tests/unit/validate.test.ts` proves the OOM/malformed-payload defenses; `tests/e2e/offline-sync.spec.ts` proves the offline-edit-then-reconnect flow and viewer read-only enforcement end-to-end.
- **Deployment:** GitHub Actions CI (lint → test → build) gates every merge to `main`; optional auto-deploy to Vercel on top of that.
- **Real-world considerations:** see "Scaling considerations" below for how this handles document growth over time.

---

## Scaling considerations (document state size over time)

`Document.state` stores the full merged Yjs binary state, which grows with edit history if left unmanaged (Yjs updates accumulate deletion tombstones). Two mitigations, noted here rather than fully implemented given assignment scope:

1. **Periodic GC via `Y.transact` + Yjs's built-in garbage collection** of tombstoned content, run on a schedule (e.g. a Vercel Cron function) rather than per-request, so it never adds latency to the sync path.
2. **`SyncOp` retention policy** — the append-only op log is valuable for audit/replay but unbounded growth is a real cost; a production version would archive ops older than N days to cold storage once they're reflected in a `Snapshot`, since snapshots already capture full state at a point in time and don't need the intervening ops to reconstruct anything.

## What I'd change for true real-time character-level sync

If the deployment target weren't constrained to Vercel serverless, I'd swap the REST polling relay for a WebSocket-based Yjs provider (`y-websocket`) backed by a small always-on Node process (e.g. Fly.io or a Railway worker), which would drop latency from ~800ms-debounced to effectively instant, and enable live cursor/selection presence — which REST polling can't do well.

---

## Author

**Heyzii** — Full Stack MERN Developer
GitHub: https://github.com/hejazi-zarkawi
LinkedIn: _add your LinkedIn URL_
