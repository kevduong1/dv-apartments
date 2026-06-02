import { eq } from "drizzle-orm"

import type { AppDb } from "./client"
import { transactions, type Transaction } from "./schema"

/**
 * The repository layer: every write goes through here rather than touching the
 * database directly. This is the seam where sync will hook in — when a sync
 * engine lands, these functions will also enqueue the changed row to an outbox
 * (see `lib/sync`). Keeping writes centralized now keeps that change small.
 */

export interface NewTransactionInput {
  entityId: string
  categoryId: string
  /** ISO date, YYYY-MM-DD. */
  occurredOn: string
  /** Positive decimal string, e.g. "1450.00". Never a float. */
  amount: string
  propertyId?: string | null
  unitId?: string | null
  memo?: string | null
}

export async function createTransaction(
  db: AppDb,
  input: NewTransactionInput,
): Promise<Transaction> {
  const [row] = await db
    .insert(transactions)
    .values({
      entityId: input.entityId,
      categoryId: input.categoryId,
      occurredOn: input.occurredOn,
      amount: input.amount,
      propertyId: input.propertyId ?? null,
      unitId: input.unitId ?? null,
      memo: input.memo ?? null,
    })
    .returning()
  // TODO(sync): enqueue row.id to the outbox here once sync is wired.
  return row
}

/**
 * Soft-deletes a transaction by tombstoning it (sets `deleted_at`) rather than
 * removing the row, so the deletion can be propagated when sync is added.
 */
export async function softDeleteTransaction(db: AppDb, id: string): Promise<void> {
  const now = new Date()
  await db
    .update(transactions)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(transactions.id, id))
  // TODO(sync): enqueue row id to the outbox here once sync is wired.
}
