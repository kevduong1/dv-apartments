"use client"

import { useLiveQuery } from "@electric-sql/pglite-react"

import { useSelectedEntity } from "@/components/entity-context"
import { ScopedStats } from "@/components/scoped-stats"
import { TransactionsTable } from "@/components/transactions-table"
import type { Scope } from "@/lib/scope"

interface EntityRow {
  id: string
  name: string
  type: "parent" | "series"
}

/**
 * The money view: the four summary cards (Income / Expenses / Net / Properties)
 * plus the full ledger, scoped to whatever the header entity switcher has
 * selected. Lives on its own page so the per-entity/property pages stay focused
 * on their lists.
 */
export default function FinancesPage() {
  const { selectedEntityId } = useSelectedEntity()
  const isAll = selectedEntityId === "all"

  // Resolve the selected entity to a scope. "all" is portfolio-wide; otherwise
  // we need the entity's type to know whether to consolidate child series.
  const entity = useLiveQuery<EntityRow>(
    isAll
      ? `SELECT id, name, type FROM entities WHERE 1 = 0`
      : `SELECT id, name, type FROM entities
         WHERE id = $1 AND deleted_at IS NULL`,
    isAll ? [] : [selectedEntityId],
  )?.rows[0]

  let scope: Scope = { kind: "all" }
  let label = "Whole portfolio"
  if (!isAll && entity) {
    scope =
      entity.type === "parent"
        ? { kind: "parent", entityId: entity.id }
        : { kind: "series", entityId: entity.id }
    label = entity.name
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Finances</h1>
        <p className="text-sm text-muted-foreground">
          {label} · cash-basis, all time
        </p>
      </div>

      <ScopedStats scope={scope} />

      <TransactionsTable scope={scope} limit={50} title="All transactions" />
    </div>
  )
}
