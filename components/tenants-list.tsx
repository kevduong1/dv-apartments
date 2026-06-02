"use client"

import { useRouter } from "next/navigation"
import { useLiveQuery } from "@electric-sql/pglite-react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon, PlusSignIcon } from "@hugeicons/core-free-icons"

import { AddTenantDialog } from "@/components/add-tenant-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDate, formatMoney } from "@/lib/format"
import { scopeFilter, type Scope } from "@/lib/scope"

interface TenantRow {
  id: string
  name: string
  status: "active" | "pending" | "past"
  unitLabel: string | null
  property: string | null
  rentAmount: string | null
  leaseStart: string | null
  leaseEnd: string | null
}

const STATUS_VARIANT = {
  active: "secondary",
  pending: "outline",
  past: "ghost",
} as const

/**
 * Tenants for a series or property, sorted with active leases first. Pass
 * `add` to surface an "Add tenant" button (its props pre-scope the dialog).
 */
export function TenantsList({
  scope,
  add,
}: {
  scope: Scope
  add?: { propertyId?: string; entityId?: string }
}) {
  const router = useRouter()
  const f = scopeFilter(scope, { entityId: "te.entity_id", propertyId: "te.property_id" })
  const result = useLiveQuery<TenantRow>(
    `SELECT te.id, te.name, te.status,
            te.rent_amount AS "rentAmount",
            te.lease_start AS "leaseStart", te.lease_end AS "leaseEnd",
            u.label AS "unitLabel", p.name AS property
     FROM tenants te
     LEFT JOIN units u ON u.id = te.unit_id
     LEFT JOIN properties p ON p.id = te.property_id
     WHERE te.deleted_at IS NULL${f.clause}
     ORDER BY (te.status = 'active') DESC, (te.status = 'pending') DESC, te.name ASC`,
    f.params,
  )
  const tenants = result?.rows ?? []
  const showProperty = scope.kind !== "property"

  return (
    <div className="flex flex-col gap-3">
      {add && (
        <div className="flex justify-end">
          <AddTenantDialog propertyId={add.propertyId} entityId={add.entityId}>
            <Button variant="outline" size="sm">
              <HugeiconsIcon icon={PlusSignIcon} data-icon="inline-start" />
              Add tenant
            </Button>
          </AddTenantDialog>
        </div>
      )}
      <Card>
        <CardContent className="px-0 sm:px-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Unit</TableHead>
              {showProperty && (
                <TableHead className="hidden md:table-cell">Property</TableHead>
              )}
              <TableHead className="hidden sm:table-cell">Lease</TableHead>
              <TableHead className="text-right">Rent</TableHead>
              <TableHead className="w-8" aria-label="Open" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={showProperty ? 6 : 5}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  No tenants yet.
                </TableCell>
              </TableRow>
            ) : (
              tenants.map((t) => (
                <TableRow
                  key={t.id}
                  onClick={() => router.push(`/tenants/${t.id}`)}
                  className="group cursor-pointer"
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{t.name}</span>
                      <Badge
                        variant={STATUS_VARIANT[t.status]}
                        className="font-normal capitalize"
                      >
                        {t.status}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {t.unitLabel ?? "—"}
                  </TableCell>
                  {showProperty && (
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {t.property ?? "—"}
                    </TableCell>
                  )}
                  <TableCell className="hidden whitespace-nowrap text-muted-foreground sm:table-cell">
                    {t.leaseStart || t.leaseEnd
                      ? `${formatDate(t.leaseStart)} – ${formatDate(t.leaseEnd)}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {t.rentAmount ? formatMoney(t.rentAmount) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <HugeiconsIcon
                      icon={ArrowRight01Icon}
                      className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </CardContent>
      </Card>
    </div>
  )
}
