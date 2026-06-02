"use client"

import Link from "next/link"
import { useLiveQuery } from "@electric-sql/pglite-react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon, Coins01Icon } from "@hugeicons/core-free-icons"

import { Card, CardContent } from "@/components/ui/card"
import { formatMoney } from "@/lib/format"

interface SeriesRow {
  id: string
  name: string
  formationState: string | null
  properties: number
  net: string
}

/**
 * Cards for each child series, linking to the series detail. Pass `parentId`
 * to scope to one parent's children; omit it to list every series.
 */
export function SeriesGrid({ parentId }: { parentId?: string }) {
  const result = useLiveQuery<SeriesRow>(
    `SELECT e.id, e.name, e.formation_state AS "formationState",
       (SELECT COUNT(*) FROM properties p
          WHERE p.entity_id = e.id AND p.deleted_at IS NULL) AS properties,
       COALESCE((
         SELECT SUM(CASE WHEN c.kind = 'income' THEN t.amount
                         WHEN c.kind = 'expense' THEN -t.amount ELSE 0 END)
         FROM transactions t
         LEFT JOIN categories c ON c.id = t.category_id
         WHERE t.entity_id = e.id AND t.deleted_at IS NULL
       ), 0) AS net
     FROM entities e
     WHERE e.deleted_at IS NULL AND e.type = 'series'${
       parentId ? " AND e.parent_id = $1" : ""
     }
     ORDER BY e.name ASC`,
    parentId ? [parentId] : [],
  )
  const series = result?.rows ?? []

  if (result && series.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No series LLCs yet.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {series.map((s) => {
        const net = Number(s.net)
        return (
          <Link key={s.id} href={`/entities/${s.id}`} className="group block">
            <Card className="h-full transition-shadow hover:shadow-lg">
              <CardContent className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <HugeiconsIcon icon={Coins01Icon} className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 truncate font-medium">
                    {s.name}
                    <HugeiconsIcon
                      icon={ArrowRight01Icon}
                      className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {s.formationState ? `Formed in ${s.formationState}` : "Series LLC"}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {s.properties} propert{s.properties === 1 ? "y" : "ies"} ·{" "}
                    <span
                      className={
                        net >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-destructive"
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
