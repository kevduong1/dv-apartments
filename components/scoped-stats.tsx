"use client"

import { useLiveQuery } from "@electric-sql/pglite-react"
import {
  Building03Icon,
  ChartLineData01Icon,
  Coins01Icon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons"

import { StatCard } from "@/components/stat-card"
import { formatMoney } from "@/lib/format"
import { scopeFilter, type Scope } from "@/lib/scope"

interface StatsRow {
  income: string
  expense: string
  count: number
}

/**
 * The four-up summary strip (Income / Expenses / Net / Properties-or-Units),
 * scoped to a portfolio, parent, series, or single property. Each metric is its
 * own live query so the scope clause stays simple (one placeholder set each).
 */
export function ScopedStats({ scope }: { scope: Scope }) {
  const txf = scopeFilter(scope, { entityId: "t.entity_id", propertyId: "t.property_id" })
  const stats = useLiveQuery<StatsRow>(
    `SELECT
       COALESCE(SUM(CASE WHEN c.kind = 'income' THEN t.amount ELSE 0 END), 0) AS income,
       COALESCE(SUM(CASE WHEN c.kind = 'expense' THEN t.amount ELSE 0 END), 0) AS expense,
       COUNT(*) AS count
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.deleted_at IS NULL${txf.clause}`,
    txf.params,
  )?.rows[0]

  const pf = scopeFilter(scope, { entityId: "p.entity_id", propertyId: "p.id" })
  const propsCount = useLiveQuery<{ properties: number }>(
    `SELECT COUNT(*) AS properties FROM properties p
     WHERE p.deleted_at IS NULL${pf.clause}`,
    pf.params,
  )?.rows[0]

  const uf = scopeFilter(scope, { entityId: "p.entity_id", propertyId: "u.property_id" })
  const unitsCount = useLiveQuery<{ units: number }>(
    `SELECT COUNT(*) AS units FROM units u
     JOIN properties p ON p.id = u.property_id
     WHERE u.deleted_at IS NULL AND p.deleted_at IS NULL${uf.clause}`,
    uf.params,
  )?.rows[0]

  const income = Number(stats?.income ?? 0)
  const expense = Number(stats?.expense ?? 0)
  const net = income - expense
  const units = unitsCount?.units

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        label="Income"
        icon={Coins01Icon}
        value={stats ? formatMoney(income) : undefined}
        accent="text-emerald-600 dark:text-emerald-400"
      />
      <StatCard
        label="Expenses"
        icon={Wallet01Icon}
        value={stats ? formatMoney(expense) : undefined}
      />
      <StatCard
        label="Net"
        icon={ChartLineData01Icon}
        value={stats ? formatMoney(net) : undefined}
        accent={net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}
      />
      {scope.kind === "property" ? (
        <StatCard
          label="Units"
          icon={Building03Icon}
          value={units !== undefined ? String(units) : undefined}
        />
      ) : (
        <StatCard
          label="Properties"
          icon={Building03Icon}
          value={propsCount ? String(propsCount.properties) : undefined}
          hint={
            units !== undefined ? `${units} unit${units === 1 ? "" : "s"}` : undefined
          }
        />
      )}
    </div>
  )
}
