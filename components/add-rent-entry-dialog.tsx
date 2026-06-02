"use client"

import { useState, type ReactNode } from "react"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useDb } from "@/db/provider"
import {
  softDeleteRentLedgerEntry,
  upsertRentLedgerEntry,
} from "@/db/queries"

/** An existing ledger row, when the dialog is used to edit rather than add. */
export interface RentEntryDraft {
  id: string
  /** First of the month, YYYY-MM-01. */
  periodMonth: string
  amountDue: string
  amountPaid: string
  note: string | null
}

/**
 * Records a single month on a tenant's balance sheet, or edits an existing one
 * when `entry` is passed. The month is stored as the first of the month
 * (YYYY-MM-01). Writes through the repository layer, so the balance sheet's live
 * query refreshes the moment it commits. Pass the trigger as children.
 */
export function AddRentEntryDialog({
  children,
  tenantId,
  defaultRent,
  entry,
}: {
  children: ReactNode
  tenantId: string
  /** Contract rent, used to prefill "amount due" on a brand-new month. */
  defaultRent?: string | null
  entry?: RentEntryDraft
}) {
  const db = useDb()
  const editing = entry != null

  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [month, setMonth] = useState(
    entry ? entry.periodMonth.slice(0, 7) : new Date().toISOString().slice(0, 7),
  )
  const [amountDue, setAmountDue] = useState(entry?.amountDue ?? defaultRent ?? "")
  const [amountPaid, setAmountPaid] = useState(entry?.amountPaid ?? "")
  const [note, setNote] = useState(entry?.note ?? "")

  function reset() {
    setMonth(entry ? entry.periodMonth.slice(0, 7) : new Date().toISOString().slice(0, 7))
    setAmountDue(entry?.amountDue ?? defaultRent ?? "")
    setAmountPaid(entry?.amountPaid ?? "")
    setNote(entry?.note ?? "")
  }

  function parseMoney(value: string, fallback: number): number | null {
    const trimmed = value.trim()
    if (trimmed === "") return fallback
    const n = Number(trimmed)
    return Number.isFinite(n) && n >= 0 ? n : null
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!/^\d{4}-\d{2}$/.test(month)) {
      toast.error("Pick a month.")
      return
    }
    const due = parseMoney(amountDue, 0)
    const paid = parseMoney(amountPaid, 0)
    if (due === null || paid === null) {
      toast.error("Enter valid amounts.")
      return
    }

    setSaving(true)
    try {
      await upsertRentLedgerEntry(db, {
        id: entry?.id,
        tenantId,
        periodMonth: `${month}-01`,
        amountDue: due.toFixed(2),
        amountPaid: paid.toFixed(2),
        note: note.trim() || null,
      })
      toast.success(editing ? "Month updated." : "Month recorded.")
      if (!editing) reset()
      setOpen(false)
    } catch (error) {
      toast.error("Couldn't save", {
        description: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!entry) return
    setSaving(true)
    try {
      await softDeleteRentLedgerEntry(db, entry.id)
      toast.success("Month removed.")
      setOpen(false)
    } catch (error) {
      toast.error("Couldn't remove", {
        description: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit month" : "Record a month"}</DialogTitle>
            <DialogDescription>
              Track what was charged, what was paid, and any notes for this month.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="rent-month">Month</Label>
            <Input
              id="rent-month"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="rent-due">Rent charged</Label>
              <Input
                id="rent-due"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amountDue}
                onChange={(e) => setAmountDue(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rent-paid">Paid</Label>
              <Input
                id="rent-paid"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="rent-note">Note (optional)</Label>
            <Input
              id="rent-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Paid late, partial payment…"
            />
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            {editing ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive"
                disabled={saving}
                onClick={handleDelete}
              >
                Remove
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : editing ? "Save" : "Record month"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
