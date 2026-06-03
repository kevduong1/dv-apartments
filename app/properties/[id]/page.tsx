"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useLiveQuery } from "@electric-sql/pglite-react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowRight01Icon,
  Door01Icon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons"

import { AddTransactionDialog } from "@/components/add-transaction-dialog"
import { Breadcrumbs, type Crumb } from "@/components/breadcrumbs"
import { useSelectedEntity } from "@/components/entity-context"
import { TransactionsTable } from "@/components/transactions-table"
import { UnitTenants } from "@/components/unit-tenants"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatMoney } from "@/lib/format"
import type { Scope } from "@/lib/scope"

interface PropertyRow {
  id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  propertyType: string
  entityId: string
  entityName: string | null
  parentId: string | null
}

interface UnitRow {
  id: string
  label: string
  bedrooms: number | null
  bathrooms: string | null
  rentAmount: string | null
  tenant: string | null
}

export default function PropertyPage() {
  const { id } = useParams<{ id: string }>()
  const { setSelectedEntityId } = useSelectedEntity()

  const result = useLiveQuery<PropertyRow>(
    `SELECT p.id, p.name, p.address_line1 AS address, p.city, p.state,
            p.property_type AS "propertyType",
            p.entity_id AS "entityId", e.name AS "entityName",
            e.parent_id AS "parentId"
     FROM properties p
     LEFT JOIN entities e ON e.id = p.entity_id
     WHERE p.id = $1 AND p.deleted_at IS NULL`,
    [id]
  )
  const property = result?.rows[0]

  // The property's units drive the layout: a single-unit (single-family) home
  // shows that unit's tenants + transactions directly, while a multi-unit
  // property lists its units to drill into.
  const unitsResult = useLiveQuery<{ id: string }>(
    `SELECT id FROM units
     WHERE property_id = $1 AND deleted_at IS NULL
     ORDER BY label ASC`,
    [id]
  )

  // Scope the header switcher + Add-Transaction default to the owning series.
  useEffect(() => {
    if (property) setSelectedEntityId(property.entityId)
  }, [property, setSelectedEntityId])

  if (!result || !unitsResult) return <DetailSkeleton />
  if (!property) return <NotFound />

  const units = unitsResult.rows
  const onlyUnitId = units.length === 1 ? units[0].id : null

  const scope: Scope = { kind: "property", propertyId: property.id }
  const address = [property.address, property.city, property.state]
    .filter(Boolean)
    .join(", ")

  const crumbs: Crumb[] = [
    { label: "Portfolio", href: "/" },
    {
      label: property.entityName ?? "Series",
      href: `/entities/${property.entityId}`,
    },
    { label: property.name },
  ]

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={crumbs} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {property.name}
            </h1>
            <Badge variant="outline" className="capitalize">
              {property.propertyType.replace("_", " ")}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {address || "No address on file"}
          </p>
        </div>
        <AddTransactionDialog>
          <Button>
            <HugeiconsIcon icon={PlusSignIcon} data-icon="inline-start" />
            Add transaction
          </Button>
        </AddTransactionDialog>
      </div>

      {onlyUnitId ? (
        // Single-family: go straight to the unit — its tenants and the
        // property's transactions, no units list to click through.
        <>
          <UnitTenants
            unitId={onlyUnitId}
            propertyId={property.id}
            entityId={property.entityId}
          />
          <TransactionsTable scope={scope} limit={25} title="Transactions" />
        </>
      ) : (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Units</h2>
          <UnitsGrid propertyId={property.id} />
        </div>
      )}
    </div>
  )
}

/** Clickable cards for the units in one property, with their current occupant. */
function UnitsGrid({ propertyId }: { propertyId: string }) {
  const result = useLiveQuery<UnitRow>(
    `SELECT u.id, u.label, u.bedrooms, u.bathrooms,
            u.rent_amount AS "rentAmount",
            (SELECT te.name FROM tenants te
               WHERE te.unit_id = u.id AND te.status = 'active'
                 AND te.deleted_at IS NULL
               ORDER BY te.lease_start DESC LIMIT 1) AS tenant
     FROM units u
     WHERE u.property_id = $1 AND u.deleted_at IS NULL
     ORDER BY u.label ASC`,
    [propertyId]
  )
  const units = result?.rows

  if (!units) return <UnitsGridSkeleton />

  if (units.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          No units yet.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {units.map((u) => (
        <Link key={u.id} href={`/units/${u.id}`} className="group block">
          <Card className="h-full transition-shadow hover:shadow-lg">
            <CardContent className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <HugeiconsIcon icon={Door01Icon} className="size-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 truncate text-lg font-semibold">
                  {u.label}
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {u.bedrooms ?? "—"} bd / {u.bathrooms ?? "—"} ba
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  {u.tenant ? (
                    <span className="truncate text-sm text-muted-foreground">
                      {u.tenant}
                    </span>
                  ) : (
                    <Badge
                      variant="outline"
                      className="font-normal text-muted-foreground"
                    >
                      Vacant
                    </Badge>
                  )}
                  <span className="shrink-0 text-base font-semibold tabular-nums">
                    {u.rentAmount ? formatMoney(u.rentAmount) : "—"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}

function UnitsGridSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="h-full">
          <CardContent className="flex items-start gap-3">
            <Skeleton className="size-11 shrink-0 rounded-2xl" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-1/2 rounded-md" />
              <Skeleton className="h-4 w-1/3 rounded-md" />
              <div className="mt-1 flex items-center justify-between gap-2">
                <Skeleton className="h-4 w-2/5 rounded-md" />
                <Skeleton className="h-5 w-14 rounded-md" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-5 w-56 rounded-md" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-64 rounded-md" />
        <Skeleton className="h-4 w-48 rounded-md" />
      </div>
      <Skeleton className="h-7 w-24 rounded-md" />
      <UnitsGridSkeleton />
    </div>
  )
}

function NotFound() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          This property doesn&apos;t exist.
        </p>
        <Button asChild variant="outline">
          <Link href="/">Back to portfolio</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
