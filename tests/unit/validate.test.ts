import { describe, it, expect } from "vitest";
import * as Y from "yjs";
import {
  decodeAndValidateUpdate,
  SyncPushSchema,
  MAX_UPDATE_BYTES,
  MalformedUpdateError,
  PayloadTooLargeError,
} from "@/lib/sync/validate";

function makeValidUpdateBase64(): string {
  const doc = new Y.Doc();
  doc.getText("content").insert(0, "hello world");
  const update = Y.encodeStateAsUpdate(doc);
  doc.destroy();
  return Buffer.from(update).toString("base64");
}

describe("decodeAndValidateUpdate", () => {
  it("accepts a well-formed Yjs update", () => {
    const b64 = makeValidUpdateBase64();
    const bytes = decodeAndValidateUpdate(b64);
    expect(bytes.byteLength).toBeGreaterThan(0);
  });

  it("rejects non-base64 garbage", () => {
    expect(() => decodeAndValidateUpdate("not-base64-!!!@@@ %%%")).toThrow();
  });

  it("rejects structurally invalid bytes that happen to be valid base64", () => {
    const garbage = Buffer.from("this is definitely not a yjs update").toString("base64");
    expect(() => decodeAndValidateUpdate(garbage)).toThrow(MalformedUpdateError);
  });

  it("rejects an update larger than MAX_UPDATE_BYTES", () => {
    const huge = Buffer.alloc(MAX_UPDATE_BYTES + 1, 1).toString("base64");
    expect(() => decodeAndValidateUpdate(huge)).toThrow(PayloadTooLargeError);
  });
});

describe("SyncPushSchema", () => {
  it("rejects more than the max updates per request", () => {
    const tooMany = Array.from({ length: 51 }, () => makeValidUpdateBase64());
    const result = SyncPushSchema.safeParse({
      documentId: "clabc123456789012345678",
      clientId: "client-1",
      updates: tooMany,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a well-formed push payload", () => {
    const result = SyncPushSchema.safeParse({
      documentId: "clabc123456789012345678",
      clientId: "client-1",
      updates: [makeValidUpdateBase64()],
    });
    expect(result.success).toBe(true);
  });
});
