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
import { useDb } from "@/db/provider"
import { createTenant } from "@/db/queries"

interface PropertyRow {
  id: string
  name: string
  entityId: string
}
interface UnitRow {
  id: string
  label: string
}

const NO_UNIT = "none"

/**
 * Creates a tenant tied to a property (and optionally a unit). Pass
 * `propertyId` to fix the property (e.g. on a property page) or `entityId` to
 * limit the property picker to one series; with neither, every property is
 * selectable. Writes through the repository layer, so live queries update the
 * moment it commits. Pass the trigger as children.
 */
export function AddTenantDialog({
  children,
  propertyId,
  entityId,
}: {
  children: ReactNode
  propertyId?: string
  entityId?: string
}) {
  const db = useDb()

  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [selectedProperty, setSelectedProperty] = useState(propertyId ?? "")
  const [unitId, setUnitId] = useState<string>(NO_UNIT)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [leaseStart, setLeaseStart] = useState("")
  const [leaseEnd, setLeaseEnd] = useState("")
  const [rent, setRent] = useState("")
  const [status, setStatus] = useState<"active" | "pending" | "past">("active")

  const scoped = entityId != null
  const properties =
    useLiveQuery<PropertyRow>(
      `SELECT id, name, entity_id AS "entityId" FROM properties
       WHERE deleted_at IS NULL${scoped ? " AND entity_id = $1" : ""}
       ORDER BY name ASC`,
      scoped ? [entityId] : [],
    )?.rows ?? []

  const effectivePropertyId = propertyId || selectedProperty
  const units =
    useLiveQuery<UnitRow>(
      `SELECT id, label FROM units
       WHERE deleted_at IS NULL AND property_id = $1 ORDER BY label ASC`,
      [effectivePropertyId || null],
    )?.rows ?? []

  function reset() {
    setSelectedProperty(propertyId ?? "")
    setUnitId(NO_UNIT)
    setName("")
    setEmail("")
    setPhone("")
    setLeaseStart("")
    setLeaseEnd("")
    setRent("")
    setStatus("active")
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const resolvedEntityId =
      entityId ?? properties.find((p) => p.id === effectivePropertyId)?.entityId
    if (!effectivePropertyId || !resolvedEntityId) {
      toast.error("Pick a property.")
      return
    }
    if (!name.trim()) {
      toast.error("Enter the tenant's name.")
      return
    }
    const rentValue = rent.trim() === "" ? null : Number(rent)
    if (rentValue !== null && (!Number.isFinite(rentValue) || rentValue < 0)) {
      toast.error("Enter a valid rent amount.")
      return
    }

    setSaving(true)
    try {
      await createTenant(db, {
        entityId: resolvedEntityId,
        propertyId: effectivePropertyId,
        unitId: unitId === NO_UNIT ? null : unitId,
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        leaseStart: leaseStart || null,
        leaseEnd: leaseEnd || null,
        rentAmount: rentValue === null ? null : rentValue.toFixed(2),
        status,
      })
      toast.success("Tenant added.")
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
            <DialogTitle>Add tenant</DialogTitle>
            <DialogDescription>
              Saved locally and ready to sync. Attach the tenant to a unit and set
              their lease.
            </DialogDescription>
          </DialogHeader>

          {!propertyId && (
            <div className="grid gap-2">
              <Label htmlFor="tenant-property">Property</Label>
              <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                <SelectTrigger id="tenant-property" className="w-full">
                  <SelectValue placeholder="Which property?" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="tenant-name">Name</Label>
            <Input
              id="tenant-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jordan Reyes"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tenant-unit">Unit (optional)</Label>
            <Select value={unitId} onValueChange={setUnitId}>
              <SelectTrigger id="tenant-unit" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_UNIT}>No unit</SelectItem>
                {units.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="tenant-email">Email (optional)</Label>
              <Input
                id="tenant-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tenant-phone">Phone (optional)</Label>
              <Input
                id="tenant-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 555-0100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="tenant-start">Lease start</Label>
              <Input
                id="tenant-start"
                type="date"
                value={leaseStart}
                onChange={(e) => setLeaseStart(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tenant-end">Lease end</Label>
              <Input
                id="tenant-end"
                type="date"
                value={leaseEnd}
                onChange={(e) => setLeaseEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="tenant-rent">Rent (optional)</Label>
              <Input
                id="tenant-rent"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={rent}
                onChange={(e) => setRent(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tenant-status">Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as "active" | "pending" | "past")}
              >
                <SelectTrigger id="tenant-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="past">Past</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Add tenant"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
