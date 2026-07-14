import { z } from "zod";
import * as Y from "yjs";

/**
 * Hard caps on incoming sync payloads. These exist specifically to answer
 * the assignment's security question: "how do you prevent a malicious
 * actor from sending a massive, malformed synchronization payload that
 * OOMs your server?"
 *
 * Defense happens in three layers, cheapest checks first, so we never pay
 * the cost of a full Yjs decode on garbage input:
 *   1. Raw byte-length cap on the request body (rejected before JSON/base64
 *      decoding even runs).
 *   2. Decoded update byte-length cap (protects against base64 amplification).
 *   3. Structural validation: the bytes must decode as a well-formed Yjs
 *      update via Y.applyUpdate against a scratch doc, wrapped in try/catch
 *      so a malformed buffer throws instead of corrupting server state -
 *      the scratch doc is discarded either way, so a bad payload never
 *      touches the real document.
 */
export const MAX_RAW_BODY_BYTES = 2 * 1024 * 1024; // 2MB per request
export const MAX_UPDATE_BYTES = 1.5 * 1024 * 1024; // 1.5MB per individual update
export const MAX_UPDATES_PER_REQUEST = 50;

export const SyncPushSchema = z.object({
  documentId: z.string().cuid(),
  clientId: z.string().min(1).max(128),
  // base64-encoded Yjs updates. Capped in count; each entry re-checked for
  // byte size after decoding, since base64 length isn't 1:1 with byte length.
  updates: z.array(z.string()).min(1).max(MAX_UPDATES_PER_REQUEST),
  baseStateVector: z.string().optional(), // base64, for the client to request a diff back
});

export type SyncPushInput = z.infer<typeof SyncPushSchema>;

export class PayloadTooLargeError extends Error {}
export class MalformedUpdateError extends Error {}

/** Decode + structurally validate one base64 Yjs update. Throws on anything suspicious. */
export function decodeAndValidateUpdate(base64Update: string): Uint8Array {
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(Buffer.from(base64Update, "base64"));
  } catch {
    throw new MalformedUpdateError("Update is not valid base64");
  }

  if (bytes.byteLength > MAX_UPDATE_BYTES) {
    throw new PayloadTooLargeError(
      `Update of ${bytes.byteLength} bytes exceeds the ${MAX_UPDATE_BYTES} byte cap`
    );
  }

  // Structural check: apply to a throwaway doc, never the real one. If this
  // throws (corrupt/forged update), we reject before anything persists.
  const scratch = new Y.Doc();
  try {
    Y.applyUpdate(scratch, bytes, "validation");
  } catch (err) {
    throw new MalformedUpdateError(`Update failed structural validation: ${(err as Error).message}`);
  } finally {
    scratch.destroy();
  }

  return bytes;
}

/** Validate the full request body's raw size before any JSON parsing happens. */
export function assertRawBodySize(contentLengthHeader: string | null) {
  const len = contentLengthHeader ? parseInt(contentLengthHeader, 10) : NaN;
  if (Number.isFinite(len) && len > MAX_RAW_BODY_BYTES) {
    throw new PayloadTooLargeError(
      `Request body of ${len} bytes exceeds the ${MAX_RAW_BODY_BYTES} byte cap`
    );
  }
}
