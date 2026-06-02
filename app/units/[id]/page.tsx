"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useLiveQuery } from "@electric-sql/pglite-react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon, UserIcon } from "@hugeicons/core-free-icons"

import { Breadcrumbs, type Crumb } from "@/components/breadcrumbs"
import { useSelectedEntity } from "@/components/entity-context"
import { TransactionsTable } from "@/components/transactions-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate, formatMoney } from "@/lib/format"
import type { Scope } from "@/lib/scope"

interface UnitRow {
  id: string
  label: string
  bedrooms: number | null
  bathrooms: string | null
  rentAmount: string | null
  propertyId: string
  propertyName: string | null
  entityId: string
  entityName: string | null
}

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

export default function UnitPage() {
  const { id } = useParams<{ id: string }>()
  const { setSelectedEntityId } = useSelectedEntity()

  const result = useLiveQuery<UnitRow>(
    `SELECT u.id, u.label, u.bedrooms, u.bathrooms,
            u.rent_amount AS "rentAmount",
            u.property_id AS "propertyId", p.name AS "propertyName",
            p.entity_id AS "entityId", e.name AS "entityName"
     FROM units u
     LEFT JOIN properties p ON p.id = u.property_id
     LEFT JOIN entities e ON e.id = p.entity_id
     WHERE u.id = $1 AND u.deleted_at IS NULL`,
    [id],
  )
  const unit = result?.rows[0]

  // Scope the header switcher to the owning series.
  useEffect(() => {
    if (unit) setSelectedEntityId(unit.entityId)
  }, [unit, setSelectedEntityId])

  if (!result) return <DetailSkeleton />
  if (!unit) return <NotFound />

  const scope: Scope = { kind: "unit", unitId: unit.id }
  const crumbs: Crumb[] = [
    { label: "Portfolio", href: "/" },
    { label: unit.entityName ?? "Series", href: `/entities/${unit.entityId}` },
    { label: unit.propertyName ?? "Property", href: `/properties/${unit.propertyId}` },
    { label: unit.label },
  ]

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={crumbs} />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{unit.label}</h1>
        <p className="text-sm text-muted-foreground">
          {unit.bedrooms ?? "—"} bd / {unit.bathrooms ?? "—"} ba ·{" "}
          {unit.rentAmount ? `${formatMoney(unit.rentAmount)} rent` : "No rent set"}
        </p>
      </div>

      <UnitTenants unitId={unit.id} />

      <TransactionsTable scope={scope} limit={25} title="This unit's transactions" />
    </div>
  )
}

/** The current occupant (if any) plus everyone who has leased this unit. */
function UnitTenants({ unitId }: { unitId: string }) {
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

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-5 w-64" />
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-40 w-full rounded-4xl" />
      <Skeleton className="h-64 w-full rounded-4xl" />
    </div>
  )
}

function NotFound() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm text-muted-foreground">This unit doesn&apos;t exist.</p>
        <Button asChild variant="outline">
          <Link href="/">Back to portfolio</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
