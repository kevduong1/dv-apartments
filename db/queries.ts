import { and, eq, isNull } from "drizzle-orm"

import type { AppDb } from "./client"
import {
  rentLedger,
  tenants,
  transactions,
  type RentLedger,
  type Tenant,
  type Transaction,
} from "./schema"

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

export interface NewTenantInput {
  entityId: string
  propertyId: string
  unitId?: string | null
  name: string
  email?: string | null
  phone?: string | null
  /** ISO dates, YYYY-MM-DD. */
  leaseStart?: string | null
  leaseEnd?: string | null
  /** Positive decimal string, e.g. "1450.00". Never a float. */
  rentAmount?: string | null
  status?: "active" | "pending" | "past"
}

export async function createTenant(db: AppDb, input: NewTenantInput): Promise<Tenant> {
  const [row] = await db
    .insert(tenants)
    .values({
      entityId: input.entityId,
      propertyId: input.propertyId,
      unitId: input.unitId ?? null,
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      leaseStart: input.leaseStart ?? null,
      leaseEnd: input.leaseEnd ?? null,
      rentAmount: input.rentAmount ?? null,
      status: input.status ?? "active",
    })
    .returning()
  // TODO(sync): enqueue row.id to the outbox here once sync is wired.
  return row
}

/**
 * Soft-deletes a tenant by tombstoning it (sets `deleted_at`) rather than
 * removing the row, so the deletion can be propagated when sync is added.
 */
export async function softDeleteTenant(db: AppDb, id: string): Promise<void> {
  const now = new Date()
  await db
    .update(tenants)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(tenants.id, id))
  // TODO(sync): enqueue row id to the outbox here once sync is wired.
}

export interface RentLedgerEntryInput {
  /** Pass to update an existing month; omit to create a new one. */
  id?: string
  tenantId: string
  /** First of the month, YYYY-MM-01. */
  periodMonth: string
  /** Positive decimal string, e.g. "1450.00". Never a float. */
  amountDue: string
  /** Positive decimal string, e.g. "1450.00". Never a float. */
  amountPaid: string
  note?: string | null
}

/** Creates a new monthly ledger row, or updates one when `id` is supplied. */
export async function upsertRentLedgerEntry(
  db: AppDb,
  input: RentLedgerEntryInput,
): Promise<RentLedger> {
  if (input.id) {
    const [row] = await db
      .update(rentLedger)
      .set({
        periodMonth: input.periodMonth,
        amountDue: input.amountDue,
        amountPaid: input.amountPaid,
        note: input.note ?? null,
        updatedAt: new Date(),
      })
      .where(eq(rentLedger.id, input.id))
      .returning()
    // TODO(sync): enqueue row.id to the outbox here once sync is wired.
    return row
  }
  const [row] = await db
    .insert(rentLedger)
    .values({
      tenantId: input.tenantId,
      periodMonth: input.periodMonth,
      amountDue: input.amountDue,
      amountPaid: input.amountPaid,
      note: input.note ?? null,
    })
    .returning()
  // TODO(sync): enqueue row.id to the outbox here once sync is wired.
  return row
}

/** Soft-deletes a monthly ledger row by tombstoning it (sets `deleted_at`). */
export async function softDeleteRentLedgerEntry(db: AppDb, id: string): Promise<void> {
  const now = new Date()
  await db
    .update(rentLedger)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(rentLedger.id, id))
  // TODO(sync): enqueue row id to the outbox here once sync is wired.
}

/**
 * Bulk-creates a ledger row for every month from `leaseStart` through the
 * current month at the contract `rentAmount`, skipping months that already have
 * a row. Powers the one-tap "Set up months from lease" button so a tenant's
 * balance sheet starts populated. Returns the number of months created.
 */
export async function seedRentLedgerFromLease(
  db: AppDb,
  input: { tenantId: string; leaseStart: string; rentAmount: string },
): Promise<number> {
  const existing = await db
    .select({ periodMonth: rentLedger.periodMonth })
    .from(rentLedger)
    .where(and(eq(rentLedger.tenantId, input.tenantId), isNull(rentLedger.deletedAt)))
  const have = new Set(existing.map((r) => r.periodMonth))

  const start = new Date(`${input.leaseStart.slice(0, 7)}-01T00:00:00`)
  const now = new Date()
  const end = new Date(now.getFullYear(), now.getMonth(), 1)

  const rows: { tenantId: string; periodMonth: string; amountDue: string; amountPaid: string }[] = []
  for (let d = start; d <= end; d.setMonth(d.getMonth() + 1)) {
    const periodMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
    if (have.has(periodMonth)) continue
    rows.push({
      tenantId: input.tenantId,
      periodMonth,
      amountDue: input.rentAmount,
      amountPaid: "0.00",
    })
  }

  if (rows.length > 0) await db.insert(rentLedger).values(rows)
  // TODO(sync): enqueue the created rows to the outbox here once sync is wired.
  return rows.length
}
