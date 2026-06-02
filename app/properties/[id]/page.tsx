"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useLiveQuery } from "@electric-sql/pglite-react"
import { HugeiconsIcon } from "@hugeicons/react"
import { PlusSignIcon } from "@hugeicons/core-free-icons"

import { AddTransactionDialog } from "@/components/add-transaction-dialog"
import { Breadcrumbs, type Crumb } from "@/components/breadcrumbs"
import { useSelectedEntity } from "@/components/entity-context"
import { ScopedStats } from "@/components/scoped-stats"
import { TenantsList } from "@/components/tenants-list"
import { TransactionsTable } from "@/components/transactions-table"
import { Badge } from "@/components/ui/badge"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
    [id],
  )
  const property = result?.rows[0]

  // Scope the header switcher + Add-Transaction default to the owning series.
  useEffect(() => {
    if (property) setSelectedEntityId(property.entityId)
  }, [property, setSelectedEntityId])

  if (!result) return <DetailSkeleton />
  if (!property) return <NotFound />

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
            <h1 className="text-2xl font-semibold tracking-tight">{property.name}</h1>
            <Badge variant="outline" className="capitalize">
              {property.propertyType.replace("_", " ")}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{address || "No address on file"}</p>
        </div>
        <AddTransactionDialog>
          <Button>
            <HugeiconsIcon icon={PlusSignIcon} data-icon="inline-start" />
            Add transaction
          </Button>
        </AddTransactionDialog>
      </div>

      <ScopedStats scope={scope} />

      <Tabs defaultValue="units">
        <TabsList>
          <TabsTrigger value="units">Units</TabsTrigger>
          <TabsTrigger value="tenants">Tenants</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>
        <TabsContent value="units">
          <UnitsTable propertyId={property.id} />
        </TabsContent>
        <TabsContent value="tenants">
          <TenantsList
            scope={scope}
            add={{ propertyId: property.id, entityId: property.entityId }}
          />
        </TabsContent>
        <TabsContent value="transactions">
          <TransactionsTable scope={scope} limit={25} title="Transactions" />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/** The units within one property, with their current active occupant. */
function UnitsTable({ propertyId }: { propertyId: string }) {
  const units =
    useLiveQuery<UnitRow>(
      `SELECT u.id, u.label, u.bedrooms, u.bathrooms,
              u.rent_amount AS "rentAmount",
              (SELECT te.name FROM tenants te
                 WHERE te.unit_id = u.id AND te.status = 'active'
                   AND te.deleted_at IS NULL
                 ORDER BY te.lease_start DESC LIMIT 1) AS tenant
       FROM units u
       WHERE u.property_id = $1 AND u.deleted_at IS NULL
       ORDER BY u.label ASC`,
      [propertyId],
    )?.rows ?? []

  return (
    <Card>
      <CardContent className="px-0 sm:px-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Unit</TableHead>
              <TableHead className="hidden sm:table-cell">Beds / baths</TableHead>
              <TableHead>Occupant</TableHead>
              <TableHead className="text-right">Rent</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {units.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  No units yet.
                </TableCell>
              </TableRow>
            ) : (
              units.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.label}</TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {u.bedrooms ?? "—"} bd / {u.bathrooms ?? "—"} ba
                  </TableCell>
                  <TableCell>
                    {u.tenant ? (
                      u.tenant
                    ) : (
                      <Badge variant="outline" className="font-normal text-muted-foreground">
                        Vacant
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {u.rentAmount ? formatMoney(u.rentAmount) : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-5 w-56" />
      <Skeleton className="h-9 w-64" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-4xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-4xl" />
    </div>
  )
}

function NotFound() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm text-muted-foreground">This property doesn&apos;t exist.</p>
        <Button asChild variant="outline">
          <Link href="/">Back to portfolio</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
