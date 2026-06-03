"use client"

import Link from "next/link"
import { useLiveQuery } from "@electric-sql/pglite-react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon, Building03Icon } from "@hugeicons/core-free-icons"

import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatMoney } from "@/lib/format"
import { scopeFilter, type Scope } from "@/lib/scope"

interface PropertyRow {
  id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  units: number
  net: string
}

/** Cards for each property in scope, linking down to the property detail. */
export function PropertiesList({ scope }: { scope: Scope }) {
  const f = scopeFilter(scope, { entityId: "p.entity_id", propertyId: "p.id" })
  const result = useLiveQuery<PropertyRow>(
    `SELECT p.id, p.name, p.address_line1 AS address, p.city, p.state,
       (SELECT COUNT(*) FROM units u
          WHERE u.property_id = p.id AND u.deleted_at IS NULL) AS units,
       COALESCE((
         SELECT SUM(CASE WHEN c.kind = 'income' THEN t.amount
                         WHEN c.kind = 'expense' THEN -t.amount ELSE 0 END)
         FROM transactions t
         LEFT JOIN categories c ON c.id = t.category_id
         WHERE t.property_id = p.id AND t.deleted_at IS NULL
       ), 0) AS net
     FROM properties p
     WHERE p.deleted_at IS NULL${f.clause}
     ORDER BY p.name ASC`,
    f.params
  )
  const properties = result?.rows

  if (!properties) return <PropertiesListSkeleton />

  if (properties.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          No properties yet.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {properties.map((p) => {
        const net = Number(p.net)
        return (
          <Link key={p.id} href={`/properties/${p.id}`} className="group block">
            <Card className="h-full transition-shadow hover:shadow-lg">
              <CardContent className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  <HugeiconsIcon icon={Building03Icon} className="size-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 truncate text-lg font-semibold">
                    {p.name}
                    <HugeiconsIcon
                      icon={ArrowRight01Icon}
                      className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {[p.address, p.city, p.state].filter(Boolean).join(", ") ||
                      "No address"}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {p.units} unit{p.units === 1 ? "" : "s"} ·{" "}
                    <span
                      className={
                        net >= 0
                          ? "font-medium text-emerald-600 dark:text-emerald-400"
                          : "font-medium text-destructive"
                      }
                    >
                      {formatMoney(net)} net
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}

function PropertiesListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="h-full">
          <CardContent className="flex items-start gap-3">
            <Skeleton className="size-11 shrink-0 rounded-2xl" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-2/3 rounded-md" />
              <Skeleton className="h-4 w-3/4 rounded-md" />
              <Skeleton className="mt-1 h-4 w-1/2 rounded-md" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
