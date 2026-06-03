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
  Search01Icon,
  UserMultipleIcon,
} from "@hugeicons/core-free-icons"

import { Highlight } from "@/components/highlight"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { fuzzyMatch } from "@/lib/fuzzy"
import { formatMoney } from "@/lib/format"

interface TenantRow {
  id: string
  name: string
  status: "active" | "pending" | "past"
  rentAmount: string | null
  unitLabel: string | null
  propertyName: string | null
  entityName: string | null
  balance: string | null
}

interface Ranked {
  row: TenantRow
  score: number
  nameMatch?: number[]
  propertyMatch?: number[]
  entityMatch?: number[]
  unitMatch?: number[]
}

const STATUS_VARIANT = {
  active: "secondary",
  pending: "outline",
  past: "ghost",
} as const

// Keep active leases first, then pending, then alphabetical — the same order
// the per-property tenant table uses.
const STATUS_RANK = { active: 0, pending: 1, past: 2 } as const

/** Searchable card directory of every tenant across the whole portfolio. */
export function TenantsDirectory() {
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query)

  const result = useLiveQuery<TenantRow>(
    `SELECT te.id, te.name, te.status,
            te.rent_amount AS "rentAmount",
            u.label AS "unitLabel",
            p.name AS "propertyName",
            e.name AS "entityName",
            COALESCE((
              SELECT SUM(rl.amount_due) - SUM(rl.amount_paid)
              FROM rent_ledger rl
              WHERE rl.tenant_id = te.id AND rl.deleted_at IS NULL
            ), 0) AS balance
     FROM tenants te
     LEFT JOIN units u ON u.id = te.unit_id
     LEFT JOIN properties p ON p.id = te.property_id
     LEFT JOIN entities e ON e.id = te.entity_id
     WHERE te.deleted_at IS NULL
     ORDER BY te.name ASC`
  )
  const rows = result?.rows

  const ranked = useMemo<Ranked[]>(() => {
    if (!rows) return []
    const q = deferredQuery.trim()

    if (!q) {
      return [...rows]
        .sort(
          (a, b) =>
            STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
            a.name.localeCompare(b.name)
        )
        .map((row) => ({ row, score: 0 }))
    }

    const out: Ranked[] = []
    for (const row of rows) {
      const name = fuzzyMatch(row.name, q)
      const property = row.propertyName ? fuzzyMatch(row.propertyName, q) : null
      const entity = row.entityName ? fuzzyMatch(row.entityName, q) : null
      const unit = row.unitLabel ? fuzzyMatch(row.unitLabel, q) : null
      if (!name && !property && !entity && !unit) continue

      // Rank on the best field, but bias toward name matches so a tenant whose
      // name matches outranks one that only matched via their property.
      const score = Math.max(
        name ? name.score + 4 : 0,
        property?.score ?? 0,
        entity?.score ?? 0,
        unit?.score ?? 0
      )
      out.push({
        row,
        score,
        nameMatch: name?.indices,
        propertyMatch: property?.indices,
        entityMatch: entity?.indices,
        unitMatch: unit?.indices,
      })
    }

    return out.sort(
      (a, b) =>
        b.score - a.score ||
        STATUS_RANK[a.row.status] - STATUS_RANK[b.row.status] ||
        a.row.name.localeCompare(b.row.name)
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
          placeholder="Search tenants, properties, series…"
          aria-label="Search tenants"
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
            {ranked.length} {ranked.length === 1 ? "tenant" : "tenants"}
            {deferredQuery.trim() ? ` matching “${deferredQuery.trim()}”` : ""}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {ranked.map((r) => (
              <TenantCard key={r.row.id} ranked={r} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function TenantCard({ ranked }: { ranked: Ranked }) {
  const { row } = ranked
  const balance = Number(row.balance ?? 0)
  const initials = row.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")

  return (
    <Link href={`/tenants/${row.id}`} className="group block">
      <Card size="sm" className="h-full transition-shadow hover:shadow-lg">
        <CardContent className="flex h-full flex-col gap-3">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-base font-semibold text-primary">
              {initials || "?"}
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
                  icon={Building03Icon}
                  className="size-4 shrink-0"
                />
                <span className="truncate">
                  {row.propertyName ? (
                    <Highlight
                      text={row.propertyName}
                      indices={ranked.propertyMatch}
                    />
                  ) : (
                    "No property"
                  )}
                  {row.unitLabel ? (
                    <>
                      {" · "}
                      <Highlight
                        text={row.unitLabel}
                        indices={ranked.unitMatch}
                      />
                    </>
                  ) : null}
                </span>
              </p>
            </div>
            <Badge
              variant={STATUS_VARIANT[row.status]}
              className="shrink-0 font-normal capitalize"
            >
              {row.status}
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
              <span className="text-sm text-muted-foreground">Rent</span>
              <span className="font-semibold tabular-nums">
                {row.rentAmount ? formatMoney(row.rentAmount) : "—"}
              </span>
            </div>
            <div className="flex shrink-0 flex-col text-right">
              <span className="text-sm text-muted-foreground">Balance</span>
              <span
                className={`font-semibold tabular-nums ${
                  balance > 0
                    ? "text-destructive"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {formatMoney(balance)}
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
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
                  <Skeleton className="h-4 w-14 rounded-md" />
                  <Skeleton className="h-5 w-16 rounded-md" />
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
            icon={searching ? Search01Icon : UserMultipleIcon}
            className="size-6"
          />
        </span>
        <p className="text-sm font-medium">
          {searching ? "No matching tenants" : "No tenants yet"}
        </p>
        <p className="max-w-xs text-sm text-muted-foreground">
          {searching
            ? `Nothing matched “${query.trim()}”. Try a different name, property, or series.`
            : "Tenants you add to a unit will show up here."}
        </p>
      </CardContent>
    </Card>
  )
}
