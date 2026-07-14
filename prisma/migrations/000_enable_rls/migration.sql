-- Row Level Security policies.
--
-- Prisma's client uses a single pooled DB role, so instead of per-user DB
-- roles we scope every query by setting a session variable
-- (app.current_user_id) at the start of each request in a transaction
-- (see src/lib/db.ts -> withUserContext). RLS policies then check that
-- variable against DocumentMember. This is defense-in-depth: even if a
-- future code path forgets a `where userId:` clause, the database itself
-- refuses to return rows the caller isn't a member of.

ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SyncOp" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Snapshot" ENABLE ROW LEVEL SECURITY;

-- Documents: visible only if the current user has a membership row.
CREATE POLICY document_isolation ON "Document"
  USING (
    EXISTS (
      SELECT 1 FROM "DocumentMember" dm
      WHERE dm."documentId" = "Document".id
        AND dm."userId" = current_setting('app.current_user_id', true)
    )
  );

-- DocumentMember: a user can see membership rows for documents they belong to.
CREATE POLICY member_isolation ON "DocumentMember"
  USING (
    "userId" = current_setting('app.current_user_id', true)
    OR EXISTS (
      SELECT 1 FROM "DocumentMember" dm2
      WHERE dm2."documentId" = "DocumentMember"."documentId"
        AND dm2."userId" = current_setting('app.current_user_id', true)
    )
  );

-- SyncOp: readable by document members; writable only by OWNER/EDITOR
-- (the INSERT check below blocks VIEWER at the database layer, in
-- addition to the application-layer check in the sync API route).
CREATE POLICY syncop_read ON "SyncOp"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "DocumentMember" dm
      WHERE dm."documentId" = "SyncOp"."documentId"
        AND dm."userId" = current_setting('app.current_user_id', true)
    )
  );

CREATE POLICY syncop_write ON "SyncOp"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "DocumentMember" dm
      WHERE dm."documentId" = "SyncOp"."documentId"
        AND dm."userId" = current_setting('app.current_user_id', true)
        AND dm."role" IN ('OWNER', 'EDITOR')
    )
  );

-- Snapshot: same read/write shape as SyncOp.
CREATE POLICY snapshot_read ON "Snapshot"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "DocumentMember" dm
      WHERE dm."documentId" = "Snapshot"."documentId"
        AND dm."userId" = current_setting('app.current_user_id', true)
    )
  );

CREATE POLICY snapshot_write ON "Snapshot"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "DocumentMember" dm
      WHERE dm."documentId" = "Snapshot"."documentId"
        AND dm."userId" = current_setting('app.current_user_id', true)
        AND dm."role" IN ('OWNER', 'EDITOR')
    )
  );
