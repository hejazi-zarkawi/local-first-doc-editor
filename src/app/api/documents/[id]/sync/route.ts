import { NextRequest, NextResponse } from "next/server";
import * as Y from "yjs";
import { auth, getDocumentRole } from "@/lib/auth";
import { withUserContext } from "@/lib/db";
import {
  SyncPushSchema,
  decodeAndValidateUpdate,
  assertRawBodySize,
  MAX_UPDATE_BYTES,
  PayloadTooLargeError,
  MalformedUpdateError,
} from "@/lib/sync/validate";

/**
 * GET /api/documents/:id/sync?since=<seq>
 *
 * Pull endpoint. Returns the merged document state plus any SyncOps the
 * caller doesn't have yet (seq > since), so a reconnecting client can
 * reconstruct the current document by applying: local IndexedDB state,
 * then any missed ops, in order. Yjs updates are commutative/idempotent
 * under Y.applyUpdate, so re-applying an op the client already had is
 * harmless - this is what makes the "reconcile on reconnect" step safe
 * even if a push partially succeeded before a connection drop.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: documentId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getDocumentRole(session.user.id, documentId);
  if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const since = BigInt(req.nextUrl.searchParams.get("since") ?? "0");

  const result = await withUserContext(session.user.id, async (tx) => {
    const doc = await tx.document.findUniqueOrThrow({ where: { id: documentId } });
    const missedOps = await tx.syncOp.findMany({
      where: { documentId, seq: { gt: since } },
      orderBy: { seq: "asc" },
      take: 500, // bounded fetch, client paginates via `since` if more remain
    });
    return { doc, missedOps };
  });

  return NextResponse.json({
    state: result.doc.state ? Buffer.from(result.doc.state).toString("base64") : null,
    updates: result.missedOps.map((op: { seq: bigint; update: Buffer }) => ({
      seq: op.seq.toString(),
      update: Buffer.from(op.update).toString("base64"),
    })),
    latestSeq: result.missedOps.at(-1)?.seq.toString() ?? since.toString(),
    role,
  });
}

/**
 * POST /api/documents/:id/sync
 *
 * Push endpoint. Accepts a batch of local Yjs updates queued while
 * offline. Every update is validated (see lib/sync/validate.ts) before it
 * touches the database or the in-memory merge step, so a malformed or
 * oversized payload is rejected cheaply and never risks OOMing the
 * process. Valid updates are:
 *   1. Persisted as individual SyncOp rows (append-only audit trail)
 *   2. Merged into Document.state via Y.applyUpdate (CRDT merge - order
 *      of application doesn't affect the final result, which is what
 *      gives us deterministic conflict resolution across concurrent
 *      offline editors without a central lock)
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: documentId } = await params;

  try {
    assertRawBodySize(req.headers.get("content-length"));
  } catch (err) {
    if (err instanceof PayloadTooLargeError) {
      return NextResponse.json({ error: err.message }, { status: 413 });
    }
    throw err;
  }

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getDocumentRole(session.user.id, documentId);
  if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  // Viewers are read-only at the application layer AND at the database
  // layer (see syncop_write RLS policy) - belt and suspenders.
  if (role === "VIEWER") {
    return NextResponse.json({ error: "Viewers cannot push updates" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = SyncPushSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload shape", issues: parsed.error.issues }, { status: 400 });
  }
  if (parsed.data.documentId !== documentId) {
    return NextResponse.json({ error: "documentId mismatch" }, { status: 400 });
  }

  let validatedUpdates: Uint8Array[];
  try {
    validatedUpdates = parsed.data.updates.map(decodeAndValidateUpdate);
  } catch (err) {
    if (err instanceof PayloadTooLargeError) {
      return NextResponse.json({ error: err.message }, { status: 413 });
    }
    if (err instanceof MalformedUpdateError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }

  const result = await withUserContext(session.user.id, async (tx) => {
    const doc = await tx.document.findUniqueOrThrow({ where: { id: documentId } });

    // Merge into a scratch Y.Doc seeded with current state, so a bad
    // merge never partially mutates the row we're about to write.
    const merged = new Y.Doc();
    if (doc.state) Y.applyUpdate(merged, doc.state, "server-current");
    for (const update of validatedUpdates) {
      Y.applyUpdate(merged, update, "client-push");
    }
    const newState = Y.encodeStateAsUpdate(merged);
    const newStateVector = Y.encodeStateVector(merged);
    merged.destroy();

    await tx.syncOp.createMany({
      data: validatedUpdates.map((update) => ({
        documentId,
        authorId: session.user!.id,
        update: Buffer.from(update),
        byteSize: update.byteLength,
      })),
    });

    const updatedDoc = await tx.document.update({
      where: { id: documentId },
      data: {
        state: Buffer.from(newState),
        stateVector: Buffer.from(newStateVector),
      },
    });

    return updatedDoc;
  });

  return NextResponse.json({
    ok: true,
    stateVector: result.stateVector ? Buffer.from(result.stateVector).toString("base64") : null,
    maxUpdateBytes: MAX_UPDATE_BYTES,
  });
}
