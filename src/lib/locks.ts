import type { Prisma } from "@prisma/client";

/**
 * Take a transaction-scoped Postgres advisory lock. Concurrent transactions asking for the same key
 * queue up and the lock is released automatically on commit/rollback — safe on serverless.
 */
export async function advisoryLock(tx: Prisma.TransactionClient, key: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
}
