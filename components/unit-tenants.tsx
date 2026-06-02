"use client"

import Link from "next/link"
import { useLiveQuery } from "@electric-sql/pglite-react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon, PlusSignIcon, UserIcon } from "@hugeicons/core-free-icons"

import { AddTenantDialog } from "@/components/add-tenant-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatDate, formatMoney } from "@/lib/format"

interface TenantRow {
  id: string
  name: string
  status: "active" | "pending" | "past"
  leaseStart: string | null
  leaseEnd: string | null
  rentAmount: string | null
}

const STATUS_VARIANT = {
  active: "secondary",
  pending: "outline",
  past: "ghost",
} as const

/**
 * The current occupant (if any) plus everyone who has leased a unit, each row
 * linking to the tenant detail. The "Add tenant" action pre-fills this unit, so
 * tenants stay reachable from the unit/property drill-down.
 */
export function UnitTenants({
  unitId,
  propertyId,
  entityId,
}: {
  unitId: string
  propertyId: string
  entityId: string
}) {
  const tenants =
    useLiveQuery<TenantRow>(
      `SELECT te.id, te.name, te.status,
              te.lease_start AS "leaseStart", te.lease_end AS "leaseEnd",
              te.rent_amount AS "rentAmount"
       FROM tenants te
       WHERE te.unit_id = $1 AND te.deleted_at IS NULL
       ORDER BY (te.status = 'active') DESC, te.lease_start DESC NULLS LAST`,
      [unitId],
    )?.rows ?? []

  const current = tenants.find((t) => t.status === "active") ?? null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tenants</CardTitle>
        <CardAction>
          <AddTenantDialog
            propertyId={propertyId}
            entityId={entityId}
            defaultUnitId={unitId}
          >
            <Button variant="outline" size="sm">
              <HugeiconsIcon icon={PlusSignIcon} data-icon="inline-start" />
              Add tenant
            </Button>
          </AddTenantDialog>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {tenants.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No tenants have leased this unit yet.
          </p>
        ) : (
          tenants.map((t) => (
            <Link
              key={t.id}
              href={`/tenants/${t.id}`}
              className="group flex items-center gap-3 rounded-2xl border p-3 transition-colors hover:bg-muted"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <HugeiconsIcon icon={UserIcon} className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-medium">
                  {t.name}
                  <Badge
                    variant={STATUS_VARIANT[t.status]}
                    className="font-normal capitalize"
                  >
                    {t.id === current?.id ? "current" : t.status}
                  </Badge>
                </p>
                <p className="text-xs text-muted-foreground">
                  {t.leaseStart || t.leaseEnd
                    ? `${formatDate(t.leaseStart)} – ${formatDate(t.leaseEnd)}`
                    : "No lease dates"}
                  {t.rentAmount ? ` · ${formatMoney(t.rentAmount)}` : ""}
                </p>
              </div>
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
              />
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  )
}
