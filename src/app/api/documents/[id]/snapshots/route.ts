import { NextRequest, NextResponse } from "next/server";
import * as Y from "yjs";
import { z } from "zod";
import { auth, getDocumentRole } from "@/lib/auth";
import { withUserContext } from "@/lib/db";

const CreateSnapshotSchema = z.object({ label: z.string().max(200).optional() });
const RestoreSnapshotSchema = z.object({ snapshotId: z.string().cuid() });

/** GET: list snapshots (the "timeline" the UI renders). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: documentId } = await params;
  const session = await auth();
  const userId = session?.user?.id;

if (!userId) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getDocumentRole(userId, documentId);
  if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const snapshots = await withUserContext(userId, (tx) =>
    tx.snapshot.findMany({
      where: { documentId },
      orderBy: { createdAt: "desc" },
      select: { id: true, label: true, createdAt: true, author: { select: { name: true, email: true } } },
    })
  );

  return NextResponse.json({ snapshots });
}

/** POST: capture a new snapshot of the document's current merged state. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: documentId } = await params;
  const session = await auth();
  const userId = session?.user?.id;

if (!userId) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getDocumentRole(userId, documentId);
  if (!role || role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = CreateSnapshotSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const snapshot = await withUserContext(userId, async (tx) => {
    const doc = await tx.document.findUniqueOrThrow({ where: { id: documentId } });
    if (!doc.state) throw new Error("Document has no state yet");
    return tx.snapshot.create({
      data: {
        documentId,
        authorId: userId,
        label: parsed.data.label,
        state: doc.state,
      },
    });
  });

  return NextResponse.json({ id: snapshot.id, createdAt: snapshot.createdAt });
}

/**
 * PUT: restore a snapshot.
 *
 * Critically, this does NOT overwrite Document.state with the snapshot's
 * bytes directly - that would silently discard any edits made by other
 * active collaborators since the snapshot was taken. Instead we:
 *   1. Diff the snapshot state against the CURRENT state to produce a Yjs
 *      update that moves the document FORWARD to look like the snapshot.
 *   2. Apply that update the same way a normal client push is applied,
 *      through the CRDT merge - so it composes correctly with whatever
 *      other collaborators are concurrently doing, instead of racing them.
 *   3. Record the restore itself as a new snapshot, so "restore" is
 *      itself an entry in the timeline, not a destructive rewrite of it.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: documentId } = await params;
  const session = await auth();
  const userId = session?.user?.id;

if (!userId) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getDocumentRole(userId, documentId);
  if (!role || role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = RestoreSnapshotSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const result = await withUserContext(userId, async (tx) => {
    const [doc, targetSnapshot] = await Promise.all([
      tx.document.findUniqueOrThrow({ where: { id: documentId } }),
      tx.snapshot.findUniqueOrThrow({ where: { id: parsed.data.snapshotId } }),
    ]);
    if (targetSnapshot.documentId !== documentId) {
      throw new Error("Snapshot does not belong to this document");
    }

    const current = new Y.Doc();
    if (doc.state) Y.applyUpdate(current, doc.state, "server-current");
    const currentVector = Y.encodeStateVector(current);

    const target = new Y.Doc();
    Y.applyUpdate(target, targetSnapshot.state, "snapshot-target");

    // The update that transforms `current` into `target`.
    const forwardDiff = Y.encodeStateAsUpdate(target, currentVector);
    Y.applyUpdate(current, forwardDiff, "restore");

    const newState = Y.encodeStateAsUpdate(current);
    const newStateVector = Y.encodeStateVector(current);
    current.destroy();
    target.destroy();

    await tx.syncOp.create({
      data: {
        documentId,
        authorId: userId,
        update: Buffer.from(forwardDiff),
        byteSize: forwardDiff.byteLength,
      },
    });

    const updated = await tx.document.update({
      where: { id: documentId },
      data: { state: Buffer.from(newState), stateVector: Buffer.from(newStateVector) },
    });

    const restoreSnapshot = await tx.snapshot.create({
      data: {
        documentId,
        authorId: userId,
        label: `Restored from "${targetSnapshot.label ?? targetSnapshot.id}"`,
        state: Buffer.from(newState),
      },
    });

    return { updated, restoreSnapshot };
  });

  return NextResponse.json({
    ok: true,
    newSnapshotId: result.restoreSnapshot.id,
    stateVector: result.updated.stateVector
      ? Buffer.from(result.updated.stateVector).toString("base64")
      : null,
  });
}
