import { Prisma, PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export type UserScopedClient = Prisma.TransactionClient;

/**
 * Runs `fn` inside a transaction with `app.current_user_id` set for the
 * duration of the transaction, so Postgres RLS policies scope every query
 * inside `fn` to rows this user is actually a member of. This is the
 * database-level backstop behind the application-level role checks in the
 * API routes - see prisma/migrations/000_enable_rls/migration.sql.
 */
export async function withUserContext<T>(
  userId: string,
  fn: (tx: UserScopedClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // set_config's third arg (true) scopes it to the current transaction only.
    await tx.$executeRawUnsafe(`SELECT set_config('app.current_user_id', $1, true)`, userId);
    return fn(tx);
  });
}
