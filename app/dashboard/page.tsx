"use client"

import Link from "next/link"
import { useEffect } from "react"
import { useLiveQuery } from "@electric-sql/pglite-react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowRight01Icon,
  Building03Icon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons"

import { AddTransactionDialog } from "@/components/add-transaction-dialog"
import { useSelectedEntity } from "@/components/entity-context"
import { SeriesGrid } from "@/components/series-grid"
import { TransactionsTable } from "@/components/transactions-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface ParentRow {
  id: string
  name: string
  formationState: string | null
}

export default function DashboardPage() {
  const { setSelectedEntityId } = useSelectedEntity()

  // The dashboard is the portfolio root: clear any series scope.
  useEffect(() => setSelectedEntityId("all"), [setSelectedEntityId])

  const parent = useLiveQuery<ParentRow>(
    `SELECT id, name, formation_state AS "formationState"
     FROM entities
     WHERE deleted_at IS NULL AND type = 'parent'
     ORDER BY created_at ASC
     LIMIT 1`,
  )?.rows[0]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Portfolio</h1>
          <p className="text-sm text-muted-foreground">
            Your LLCs at a glance · cash-basis, all time
          </p>
        </div>
        <AddTransactionDialog>
          <Button>
            <HugeiconsIcon icon={PlusSignIcon} data-icon="inline-start" />
            Add transaction
          </Button>
        </AddTransactionDialog>
      </div>

      {parent ? (
        <Link href={`/entities/${parent.id}`} className="group block">
          <Card className="bg-primary text-primary-foreground transition-shadow hover:shadow-lg">
            <CardContent className="flex items-center gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary-foreground/15">
                <HugeiconsIcon icon={Building03Icon} className="size-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs tracking-wide text-primary-foreground/70 uppercase">
                  Parent LLC
                </p>
                <p className="truncate text-lg font-semibold">{parent.name}</p>
                <p className="truncate text-xs text-primary-foreground/70">
                  {parent.formationState
                    ? `Formed in ${parent.formationState}`
                    : "Holding company"}{" "}
                  · consolidated books
                </p>
              </div>
              <span className="flex items-center gap-1 text-sm font-medium opacity-90 transition-transform group-hover:translate-x-0.5">
                <span className="hidden sm:inline">Manage</span>
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
              </span>
            </CardContent>
          </Card>
        </Link>
      ) : (
        <Skeleton className="h-24 w-full rounded-4xl" />
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Series</h2>
        <SeriesGrid />
      </section>

      <TransactionsTable scope={{ kind: "all" }} limit={8} />
    </div>
  )
}
