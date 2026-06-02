"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useLiveQuery } from "@electric-sql/pglite-react"

import { Breadcrumbs, type Crumb } from "@/components/breadcrumbs"
import { useSelectedEntity } from "@/components/entity-context"
import { TransactionsTable } from "@/components/transactions-table"
import { UnitTenants } from "@/components/unit-tenants"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatMoney } from "@/lib/format"
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

      <UnitTenants
        unitId={unit.id}
        propertyId={unit.propertyId}
        entityId={unit.entityId}
      />

      <TransactionsTable scope={scope} limit={25} title="This unit's transactions" />
    </div>
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
