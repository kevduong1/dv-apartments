"use client"

import { useState, type ReactNode } from "react"
import { useLiveQuery } from "@electric-sql/pglite-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSelectedEntity } from "@/components/entity-context"
import { useDb } from "@/db/provider"
import { createTransaction } from "@/db/queries"
import { todayISO } from "@/lib/format"

interface NamedRow {
  id: string
  name: string
}
interface CategoryRow extends NamedRow {
  kind: "income" | "expense"
}

const NO_PROPERTY = "none"

/**
 * Quick transaction entry. Writes straight to local PGlite via the repository
 * layer; every live query on the page updates the moment it commits — fully
 * offline. Pass the trigger as children.
 */
export function AddTransactionDialog({ children }: { children: ReactNode }) {
  const db = useDb()
  const { selectedEntityId } = useSelectedEntity()

  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [entityId, setEntityId] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [propertyId, setPropertyId] = useState<string>(NO_PROPERTY)
  const [occurredOn, setOccurredOn] = useState(todayISO())
  const [amount, setAmount] = useState("")
  const [memo, setMemo] = useState("")

  const entities =
    useLiveQuery<NamedRow>(
      `SELECT id, name FROM entities WHERE deleted_at IS NULL
       ORDER BY (type = 'parent') DESC, name ASC`,
    )?.rows ?? []

  const categories =
    useLiveQuery<CategoryRow>(
      `SELECT id, name, kind FROM categories WHERE deleted_at IS NULL
       ORDER BY (kind = 'income') DESC, name ASC`,
    )?.rows ?? []

  // Default to the active scope (or the first entity) until the user picks one.
  const defaultEntityId =
    selectedEntityId !== "all" ? selectedEntityId : (entities[0]?.id ?? "")
  const effectiveEntityId = entityId || defaultEntityId

  const properties =
    useLiveQuery<NamedRow>(
      `SELECT id, name FROM properties
       WHERE deleted_at IS NULL AND entity_id = $1 ORDER BY name ASC`,
      [effectiveEntityId || null],
    )?.rows ?? []

  function reset() {
    setCategoryId("")
    setPropertyId(NO_PROPERTY)
    setOccurredOn(todayISO())
    setAmount("")
    setMemo("")
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const value = Number(amount)
    if (!effectiveEntityId || !categoryId) {
      toast.error("Pick an entity and a category.")
      return
    }
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Enter an amount greater than zero.")
      return
    }

    setSaving(true)
    try {
      await createTransaction(db, {
        entityId: effectiveEntityId,
        categoryId,
        occurredOn,
        amount: value.toFixed(2),
        propertyId: propertyId === NO_PROPERTY ? null : propertyId,
        memo: memo.trim() || null,
      })
      toast.success("Transaction added.")
      reset()
      setOpen(false)
    } catch (error) {
      toast.error("Couldn't save", {
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
            <DialogTitle>Add transaction</DialogTitle>
            <DialogDescription>
              Saved locally and ready to sync. Income vs. expense follows the
              category.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="tx-entity">Entity</Label>
            <Select value={effectiveEntityId} onValueChange={setEntityId}>
              <SelectTrigger id="tx-entity" className="w-full">
                <SelectValue placeholder="Which LLC's books?" />
              </SelectTrigger>
              <SelectContent>
                {entities.map((entity) => (
                  <SelectItem key={entity.id} value={entity.id}>
                    {entity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tx-category">Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="tx-category" className="w-full">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                    <span className="text-muted-foreground"> · {category.kind}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="tx-date">Date</Label>
              <Input
                id="tx-date"
                type="date"
                value={occurredOn}
                onChange={(e) => setOccurredOn(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tx-amount">Amount</Label>
              <Input
                id="tx-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          {properties.length > 0 && (
            <div className="grid gap-2">
              <Label htmlFor="tx-property">Property (optional)</Label>
              <Select value={propertyId} onValueChange={setPropertyId}>
                <SelectTrigger id="tx-property" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PROPERTY}>No property</SelectItem>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="tx-memo">Memo (optional)</Label>
            <Input
              id="tx-memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="e.g. Rent — Apt 2"
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Add transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
