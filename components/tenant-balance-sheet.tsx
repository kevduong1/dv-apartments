"use client"

import { useState } from "react"
import { useLiveQuery } from "@electric-sql/pglite-react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { PlusSignIcon } from "@hugeicons/core-free-icons"

import {
  AddRentEntryDialog,
  type RentEntryDraft,
} from "@/components/add-rent-entry-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useDb } from "@/db/provider"
import { seedRentLedgerFromLease } from "@/db/queries"
import { formatMoney } from "@/lib/format"

interface LedgerRow {
  id: string
  periodMonth: string
  amountDue: string
  amountPaid: string
  note: string | null
}

const MONTH_FMT = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
})

/** Formats a YYYY-MM-01 period as e.g. "June 2026". */
function formatMonth(period: string): string {
  const d = new Date(`${period.slice(0, 10)}T00:00:00`)
  return Number.isNaN(d.getTime()) ? period : MONTH_FMT.format(d)
}

/**
 * A tenant's monthly balance sheet: one row per month showing rent charged, paid,
 * and a running balance (Σ due − Σ paid), plus a free-text note. Months are added
 * or edited through {@link AddRentEntryDialog}; "Set up months from lease" fills
 * in every month since the lease started at the contract rent.
 */
export function TenantBalanceSheet({
  tenantId,
  leaseStart,
  rentAmount,
}: {
  tenantId: string
  leaseStart: string | null
  rentAmount: string | null
}) {
  const db = useDb()
  const [seeding, setSeeding] = useState(false)

  const rows = useLiveQuery<LedgerRow>(
    // Cast the date to text: PGlite returns `date` columns as Date objects
    // through raw queries, but the balance sheet (and the edit dialog it feeds)
    // treat `periodMonth` as a "YYYY-MM-DD" string and call .slice() on it.
    `SELECT id, period_month::text AS "periodMonth",
              amount_due AS "amountDue", amount_paid AS "amountPaid", note
       FROM rent_ledger
       WHERE tenant_id = $1 AND deleted_at IS NULL
       ORDER BY period_month ASC`,
    [tenantId]
  )?.rows

  // Running balance, computed top-down (oldest first).
  const withBalance = (rows ?? []).reduce<(LedgerRow & { balance: number })[]>(
    (acc, r) => {
      const prev = acc.length > 0 ? acc[acc.length - 1].balance : 0
      acc.push({
        ...r,
        balance: prev + Number(r.amountDue) - Number(r.amountPaid),
      })
      return acc
    },
    []
  )

  async function handleSeed() {
    if (!leaseStart) {
      toast.error("Add a lease start date to this tenant first.")
      return
    }
    setSeeding(true)
    try {
      const created = await seedRentLedgerFromLease(db, {
        tenantId,
        leaseStart,
        rentAmount: rentAmount ? Number(rentAmount).toFixed(2) : "0.00",
      })
      toast.success(
        created > 0
          ? `Added ${created} month${created === 1 ? "" : "s"}.`
          : "Already up to date."
      )
    } catch (error) {
      toast.error("Couldn't set up months", {
        description: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">Balance sheet</h2>
        <div className="flex flex-wrap gap-2">
          {leaseStart && (
            <Button variant="outline" onClick={handleSeed} disabled={seeding}>
              {seeding ? "Setting up…" : "Set up months from lease"}
            </Button>
          )}
          <AddRentEntryDialog tenantId={tenantId} defaultRent={rentAmount}>
            <Button>
              <HugeiconsIcon icon={PlusSignIcon} data-icon="inline-start" />
              Record a month
            </Button>
          </AddRentEntryDialog>
        </div>
      </div>

      <Card>
        <CardContent className="px-0 sm:px-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Rent</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="hidden sm:table-cell">Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!rows ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-24 rounded-md" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="ml-auto h-4 w-16 rounded-md" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="ml-auto h-4 w-16 rounded-md" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="ml-auto h-4 w-16 rounded-md" />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Skeleton className="h-4 w-32 rounded-md" />
                    </TableCell>
                  </TableRow>
                ))
              ) : withBalance.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No months recorded yet. Use “Set up months from lease” or
                    “Record a month” to start.
                  </TableCell>
                </TableRow>
              ) : (
                withBalance.map((r) => {
                  const draft: RentEntryDraft = {
                    id: r.id,
                    periodMonth: r.periodMonth,
                    amountDue: r.amountDue,
                    amountPaid: r.amountPaid,
                    note: r.note,
                  }
                  return (
                    <AddRentEntryDialog
                      key={r.id}
                      tenantId={tenantId}
                      defaultRent={rentAmount}
                      entry={draft}
                    >
                      <TableRow className="cursor-pointer">
                        <TableCell className="font-medium">
                          {formatMonth(r.periodMonth)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoney(r.amountDue)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoney(r.amountPaid)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium tabular-nums ${
                            r.balance > 0
                              ? "text-destructive"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {formatMoney(r.balance)}
                        </TableCell>
                        <TableCell className="hidden max-w-[28ch] truncate text-muted-foreground sm:table-cell">
                          {r.note ?? "—"}
                        </TableCell>
                      </TableRow>
                    </AddRentEntryDialog>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
