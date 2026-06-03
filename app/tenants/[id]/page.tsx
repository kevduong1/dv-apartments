"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useLiveQuery } from "@electric-sql/pglite-react"

import { Breadcrumbs, type Crumb } from "@/components/breadcrumbs"
import { useSelectedEntity } from "@/components/entity-context"
import { TenantBalanceSheet } from "@/components/tenant-balance-sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate, formatMoney } from "@/lib/format"

interface TenantRow {
  id: string
  name: string
  status: "active" | "pending" | "past"
  email: string | null
  phone: string | null
  leaseStart: string | null
  leaseEnd: string | null
  rentAmount: string | null
  unitId: string | null
  unitLabel: string | null
  propertyId: string
  propertyName: string | null
  entityId: string
  entityName: string | null
}

interface TotalsRow {
  due: string
  paid: string
}

const STATUS_VARIANT = {
  active: "secondary",
  pending: "outline",
  past: "ghost",
} as const

export default function TenantPage() {
  const { id } = useParams<{ id: string }>()
  const { setSelectedEntityId } = useSelectedEntity()

  const result = useLiveQuery<TenantRow>(
    `SELECT te.id, te.name, te.status, te.email, te.phone,
            te.lease_start AS "leaseStart", te.lease_end AS "leaseEnd",
            te.rent_amount AS "rentAmount",
            te.unit_id AS "unitId", u.label AS "unitLabel",
            te.property_id AS "propertyId", p.name AS "propertyName",
            te.entity_id AS "entityId", e.name AS "entityName"
     FROM tenants te
     LEFT JOIN units u ON u.id = te.unit_id
     LEFT JOIN properties p ON p.id = te.property_id
     LEFT JOIN entities e ON e.id = te.entity_id
     WHERE te.id = $1 AND te.deleted_at IS NULL`,
    [id],
  )
  const tenant = result?.rows[0]

  const totals = useLiveQuery<TotalsRow>(
    `SELECT COALESCE(SUM(amount_due), 0) AS due,
            COALESCE(SUM(amount_paid), 0) AS paid
     FROM rent_ledger
     WHERE tenant_id = $1 AND deleted_at IS NULL`,
    [id],
  )?.rows[0]

  // Scope the header switcher to the owning series.
  useEffect(() => {
    if (tenant) setSelectedEntityId(tenant.entityId)
  }, [tenant, setSelectedEntityId])

  if (!result) return <DetailSkeleton />
  if (!tenant) return <NotFound />

  const due = Number(totals?.due ?? 0)
  const paid = Number(totals?.paid ?? 0)
  const balance = due - paid

  const crumbs: Crumb[] = [
    { label: "Portfolio", href: "/" },
    { label: tenant.entityName ?? "Series", href: `/entities/${tenant.entityId}` },
    {
      label: tenant.propertyName ?? "Property",
      href: `/properties/${tenant.propertyId}`,
    },
    { label: tenant.name },
  ]

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={crumbs} />

      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{tenant.name}</h1>
        <Badge variant={STATUS_VARIANT[tenant.status]} className="capitalize">
          {tenant.status}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tenant details</CardTitle>
          <CardAction>
            <div className="flex flex-col items-end">
              <span className="text-xs text-muted-foreground">Balance</span>
              <span
                className={`text-2xl font-semibold tabular-nums ${
                  balance > 0
                    ? "text-destructive"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {formatMoney(balance)}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {formatMoney(paid)} paid of {formatMoney(due)}
              </span>
            </div>
          </CardAction>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
            <Detail label="Unit">
              {tenant.unitId && tenant.unitLabel ? (
                <Link
                  href={`/units/${tenant.unitId}`}
                  className="text-foreground underline-offset-4 hover:underline"
                >
                  {tenant.unitLabel}
                </Link>
              ) : (
                "—"
              )}
            </Detail>
            <Detail label="Rent">
              {tenant.rentAmount ? formatMoney(tenant.rentAmount) : "—"}
            </Detail>
            <Detail label="Lease">
              {tenant.leaseStart || tenant.leaseEnd
                ? `${formatDate(tenant.leaseStart)} – ${formatDate(tenant.leaseEnd)}`
                : "—"}
            </Detail>
            <Detail label="Email">{tenant.email ?? "—"}</Detail>
            <Detail label="Phone">{tenant.phone ?? "—"}</Detail>
          </dl>
        </CardContent>
      </Card>

      <TenantBalanceSheet
        tenantId={tenant.id}
        leaseStart={tenant.leaseStart}
        rentAmount={tenant.rentAmount}
      />
    </div>
  )
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{children}</dd>
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
        <p className="text-sm text-muted-foreground">This tenant doesn&apos;t exist.</p>
        <Button asChild variant="outline">
          <Link href="/">Back to portfolio</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
