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
import { PropertiesList } from "@/components/properties-list"
import { ScopedStats } from "@/components/scoped-stats"
import { SeriesGrid } from "@/components/series-grid"
import { TenantsList } from "@/components/tenants-list"
import { TransactionsTable } from "@/components/transactions-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Scope } from "@/lib/scope"

interface EntityRow {
  id: string
  name: string
  type: "parent" | "series"
  parentId: string | null
  ein: string | null
  formationState: string | null
  parentName: string | null
}

export default function EntityPage() {
  const { id } = useParams<{ id: string }>()
  const { setSelectedEntityId } = useSelectedEntity()

  const result = useLiveQuery<EntityRow>(
    `SELECT e.id, e.name, e.type, e.parent_id AS "parentId", e.ein,
            e.formation_state AS "formationState", pe.name AS "parentName"
     FROM entities e
     LEFT JOIN entities pe ON pe.id = e.parent_id
     WHERE e.id = $1 AND e.deleted_at IS NULL`,
    [id],
  )
  const entity = result?.rows[0]

  // Keep the header switcher + Add-Transaction default in sync with the URL.
  useEffect(() => setSelectedEntityId(id), [id, setSelectedEntityId])

  if (!result) return <DetailSkeleton />
  if (!entity) return <NotFound />

  const isParent = entity.type === "parent"
  const scope: Scope = isParent
    ? { kind: "parent", entityId: entity.id }
    : { kind: "series", entityId: entity.id }

  const crumbs: Crumb[] = isParent
    ? [{ label: "Portfolio", href: "/" }, { label: entity.name }]
    : [
        { label: "Portfolio", href: "/" },
        {
          label: entity.parentName ?? "Parent",
          href: entity.parentId ? `/entities/${entity.parentId}` : "/",
        },
        { label: entity.name },
      ]

  const subtitle = [
    isParent ? "Parent LLC" : "Series LLC",
    entity.formationState ? `Formed in ${entity.formationState}` : null,
    entity.ein ? `EIN ${entity.ein}` : null,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={crumbs} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{entity.name}</h1>
            <Badge variant={isParent ? "default" : "secondary"} className="capitalize">
              {entity.type}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <AddTransactionDialog>
          <Button>
            <HugeiconsIcon icon={PlusSignIcon} data-icon="inline-start" />
            Add transaction
          </Button>
        </AddTransactionDialog>
      </div>

      <ScopedStats scope={scope} />

      {isParent ? (
        <Tabs defaultValue="series">
          <TabsList>
            <TabsTrigger value="series">Series</TabsTrigger>
            <TabsTrigger value="properties">Properties</TabsTrigger>
            <TabsTrigger value="tenants">Tenants</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
          </TabsList>
          <TabsContent value="series">
            <SeriesGrid parentId={entity.id} />
          </TabsContent>
          <TabsContent value="properties">
            <PropertiesList scope={scope} />
          </TabsContent>
          <TabsContent value="tenants">
            <TenantsList scope={scope} />
          </TabsContent>
          <TabsContent value="transactions">
            <TransactionsTable scope={scope} limit={25} title="All transactions" />
          </TabsContent>
        </Tabs>
      ) : (
        <Tabs defaultValue="properties">
          <TabsList>
            <TabsTrigger value="properties">Properties</TabsTrigger>
            <TabsTrigger value="tenants">Tenants</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
          </TabsList>
          <TabsContent value="properties">
            <PropertiesList scope={scope} />
          </TabsContent>
          <TabsContent value="tenants">
            <TenantsList scope={scope} />
          </TabsContent>
          <TabsContent value="transactions">
            <TransactionsTable scope={scope} limit={25} title="Transactions" />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-5 w-48" />
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
        <p className="text-sm text-muted-foreground">This entity doesn&apos;t exist.</p>
        <Button asChild variant="outline">
          <Link href="/">Back to portfolio</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
