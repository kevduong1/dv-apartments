"use client"

import { useDeferredValue, useMemo, useState } from "react"
import Link from "next/link"
import { useLiveQuery } from "@electric-sql/pglite-react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowRight01Icon,
  Building03Icon,
  Cancel01Icon,
  Coins01Icon,
  Door01Icon,
  Location01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons"

import { Highlight } from "@/components/highlight"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { fuzzyMatch } from "@/lib/fuzzy"
import { formatMoney } from "@/lib/format"

interface PropertyRow {
  id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  propertyType: string
  entityName: string | null
  units: number
  occupied: number
  net: string
}

interface Ranked {
  row: PropertyRow
  address: string
  typeLabel: string
  score: number
  nameMatch?: number[]
  addressMatch?: number[]
  entityMatch?: number[]
  typeMatch?: number[]
}

function typeLabel(type: string): string {
  return type.replace(/_/g, " ")
}

function addressOf(row: PropertyRow): string {
  return [row.address, row.city, row.state].filter(Boolean).join(", ")
}

/** Searchable card directory of every property across the portfolio. */
export function PropertiesDirectory() {
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query)

  const result = useLiveQuery<PropertyRow>(
    `SELECT p.id, p.name,
            p.address_line1 AS address, p.city, p.state,
            p.property_type AS "propertyType",
            e.name AS "entityName",
            (SELECT COUNT(*) FROM units u
               WHERE u.property_id = p.id AND u.deleted_at IS NULL) AS units,
            (SELECT COUNT(*) FROM tenants te
               WHERE te.property_id = p.id AND te.status = 'active'
                 AND te.deleted_at IS NULL) AS occupied,
            COALESCE((
              SELECT SUM(CASE WHEN c.kind = 'income' THEN t.amount
                              WHEN c.kind = 'expense' THEN -t.amount ELSE 0 END)
              FROM transactions t
              LEFT JOIN categories c ON c.id = t.category_id
              WHERE t.property_id = p.id AND t.deleted_at IS NULL
            ), 0) AS net
     FROM properties p
     LEFT JOIN entities e ON e.id = p.entity_id
     WHERE p.deleted_at IS NULL
     ORDER BY p.name ASC`
  )
  const rows = result?.rows

  const ranked = useMemo<Ranked[]>(() => {
    if (!rows) return []
    const q = deferredQuery.trim()

    const decorate = (row: PropertyRow): Omit<Ranked, "score"> => ({
      row,
      address: addressOf(row),
      typeLabel: typeLabel(row.propertyType),
    })

    if (!q) {
      return [...rows]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((row) => ({ ...decorate(row), score: 0 }))
    }

    const out: Ranked[] = []
    for (const row of rows) {
      const base = decorate(row)
      const name = fuzzyMatch(row.name, q)
      const address = base.address ? fuzzyMatch(base.address, q) : null
      const entity = row.entityName ? fuzzyMatch(row.entityName, q) : null
      const type = fuzzyMatch(base.typeLabel, q)
      if (!name && !address && !entity && !type) continue

      // Bias toward name matches so a property whose name matches outranks one
      // that only matched on its address or series.
      const score = Math.max(
        name ? name.score + 4 : 0,
        address?.score ?? 0,
        entity?.score ?? 0,
        type?.score ?? 0
      )
      out.push({
        ...base,
        score,
        nameMatch: name?.indices,
        addressMatch: address?.indices,
        entityMatch: entity?.indices,
        typeMatch: type?.indices,
      })
    }

    return out.sort(
      (a, b) => b.score - a.score || a.row.name.localeCompare(b.row.name)
    )
  }, [rows, deferredQuery])

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <HugeiconsIcon
          icon={Search01Icon}
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search properties, address, series…"
          aria-label="Search properties"
          className="h-11 pl-9 [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
          </button>
        )}
      </div>

      {!rows ? (
        <DirectorySkeleton />
      ) : ranked.length === 0 ? (
        <EmptyState query={deferredQuery} />
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {ranked.length} {ranked.length === 1 ? "property" : "properties"}
            {deferredQuery.trim() ? ` matching “${deferredQuery.trim()}”` : ""}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {ranked.map((r) => (
              <PropertyCard key={r.row.id} ranked={r} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function PropertyCard({ ranked }: { ranked: Ranked }) {
  const { row } = ranked
  const net = Number(row.net)

  return (
    <Link href={`/properties/${row.id}`} className="group block">
      <Card size="sm" className="h-full transition-shadow hover:shadow-lg">
        <CardContent className="flex h-full flex-col gap-3">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <HugeiconsIcon icon={Building03Icon} className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 truncate text-lg font-semibold">
                <span className="truncate">
                  <Highlight text={row.name} indices={ranked.nameMatch} />
                </span>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                />
              </p>
              <p className="flex items-center gap-1 truncate text-sm text-muted-foreground">
                <HugeiconsIcon
                  icon={Location01Icon}
                  className="size-4 shrink-0"
                />
                <span className="truncate">
                  {ranked.address ? (
                    <Highlight
                      text={ranked.address}
                      indices={ranked.addressMatch}
                    />
                  ) : (
                    "No address"
                  )}
                </span>
              </p>
            </div>
            <Badge
              variant="outline"
              className="shrink-0 font-normal capitalize"
            >
              {ranked.typeLabel}
            </Badge>
          </div>

          {row.entityName && (
            <div>
              <Badge variant="outline" className="max-w-full gap-1">
                <HugeiconsIcon icon={Coins01Icon} className="shrink-0" />
                <span className="truncate">
                  <Highlight
                    text={row.entityName}
                    indices={ranked.entityMatch}
                  />
                </span>
              </Badge>
            </div>
          )}

          <div className="mt-auto flex items-end justify-between gap-2 border-t pt-3 text-base">
            <div className="flex min-w-0 flex-col">
              <span className="text-sm text-muted-foreground">Units</span>
              <span className="flex items-center gap-1 font-semibold tabular-nums">
                <HugeiconsIcon
                  icon={Door01Icon}
                  className="size-4 shrink-0 text-muted-foreground"
                />
                {row.units}
                {row.units > 0 && (
                  <span className="truncate text-sm font-normal text-muted-foreground">
                    · {row.occupied} occupied
                  </span>
                )}
              </span>
            </div>
            <div className="flex shrink-0 flex-col text-right">
              <span className="text-sm text-muted-foreground">Net</span>
              <span
                className={`font-semibold tabular-nums ${
                  net >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-destructive"
                }`}
              >
                {formatMoney(net)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function DirectorySkeleton() {
  return (
    <>
      <Skeleton className="h-4 w-28 rounded-md" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} size="sm" className="h-full">
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <Skeleton className="size-11 shrink-0 rounded-2xl" />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <Skeleton className="h-5 w-3/4 rounded-md" />
                  <Skeleton className="h-4 w-1/2 rounded-md" />
                </div>
                <Skeleton className="h-5 w-16 rounded-3xl" />
              </div>
              <div className="mt-1 flex items-end justify-between border-t pt-3">
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-4 w-10 rounded-md" />
                  <Skeleton className="h-5 w-16 rounded-md" />
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Skeleton className="h-4 w-10 rounded-md" />
                  <Skeleton className="h-5 w-20 rounded-md" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}

function EmptyState({ query }: { query: string }) {
  const searching = query.trim().length > 0
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <HugeiconsIcon
            icon={searching ? Search01Icon : Building03Icon}
            className="size-6"
          />
        </span>
        <p className="text-sm font-medium">
          {searching ? "No matching properties" : "No properties yet"}
        </p>
        <p className="max-w-xs text-sm text-muted-foreground">
          {searching
            ? `Nothing matched “${query.trim()}”. Try a different name, address, or series.`
            : "Properties you add to a series will show up here."}
        </p>
      </CardContent>
    </Card>
  )
}
