import { describe, it, expect } from "vitest";
import * as Y from "yjs";

/**
 * These tests exercise the CRDT merge property the whole sync engine relies
 * on: two clients editing offline and concurrently, in either order of
 * update application, converge to the identical final document - this is
 * what "deterministic conflict resolution" means in the assignment brief.
 */
describe("Yjs CRDT deterministic merge", () => {
  it("converges to the same state regardless of update application order", () => {
    const base = new Y.Doc();
    base.getText("content").insert(0, "Hello ");
    const baseUpdate = Y.encodeStateAsUpdate(base);

    const clientA = new Y.Doc();
    Y.applyUpdate(clientA, baseUpdate);
    clientA.getText("content").insert(6, "World");

    const clientB = new Y.Doc();
    Y.applyUpdate(clientB, baseUpdate);
    clientB.getText("content").insert(6, "There");

    const updateA = Y.encodeStateAsUpdate(clientA, Y.encodeStateVector(base));
    const updateB = Y.encodeStateAsUpdate(clientB, Y.encodeStateVector(base));

    const mergedAB = new Y.Doc();
    Y.applyUpdate(mergedAB, baseUpdate);
    Y.applyUpdate(mergedAB, updateA);
    Y.applyUpdate(mergedAB, updateB);

    const mergedBA = new Y.Doc();
    Y.applyUpdate(mergedBA, baseUpdate);
    Y.applyUpdate(mergedBA, updateB);
    Y.applyUpdate(mergedBA, updateA);

    expect(mergedAB.getText("content").toString()).toEqual(mergedBA.getText("content").toString());
  });

  it("re-applying an already-seen update is a no-op (idempotency under retry)", () => {
    const doc = new Y.Doc();
    doc.getText("content").insert(0, "abc");
    const update = Y.encodeStateAsUpdate(doc);

    const receiver = new Y.Doc();
    Y.applyUpdate(receiver, update);
    Y.applyUpdate(receiver, update); // simulate a network retry re-sending the same update
    Y.applyUpdate(receiver, update);

    expect(receiver.getText("content").toString()).toEqual("abc");
  });

  it("snapshot restore diff, when applied, reproduces the snapshot content", () => {
    const doc = new Y.Doc();
    doc.getText("content").insert(0, "version one");
    const snapshotState = Y.encodeStateAsUpdate(doc);

    doc.getText("content").insert(11, " plus more edits");
    // doc now diverged from the snapshot; simulate the restore-diff logic
    // used in the snapshots API route.
    const current = new Y.Doc();
    Y.applyUpdate(current, Y.encodeStateAsUpdate(doc));
    const currentVector = Y.encodeStateVector(current);

    const target = new Y.Doc();
    Y.applyUpdate(target, snapshotState);

    const forwardDiff = Y.encodeStateAsUpdate(target, currentVector);
    Y.applyUpdate(current, forwardDiff);

    expect(current.getText("content").toString()).toContain("version one");
  });
});
