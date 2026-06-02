"use client"

import { useLiveQuery } from "@electric-sql/pglite-react"
import { HugeiconsIcon } from "@hugeicons/react"
import type { IconSvgElement } from "@hugeicons/react"
import {
  Building03Icon,
  ChartLineData01Icon,
  Coins01Icon,
  PlusSignIcon,
  WifiDisconnected03Icon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons"

import { AddTransactionDialog } from "@/components/add-transaction-dialog"
import { useSelectedEntity } from "@/components/entity-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDate, formatMoney } from "@/lib/format"

interface StatsRow {
  income: string
  expense: string
  count: number
}
interface CountsRow {
  properties: number
  units: number
}
interface TxRow {
  id: string
  occurredOn: string
  amount: string
  memo: string | null
  category: string | null
  kind: "income" | "expense" | null
  entity: string | null
  property: string | null
}

export default function DashboardPage() {
  const { selectedEntityId } = useSelectedEntity()
  const entityParam = selectedEntityId === "all" ? null : selectedEntityId
  // PGlite's live extension inlines each `$n` occurrence sequentially, so a
  // placeholder may appear only once per query. Add the scope clause + param
  // only when a specific entity is selected.
  const scoped = entityParam !== null

  const label = useLiveQuery<{ name: string }>(
    "SELECT name FROM entities WHERE id = $1",
    [entityParam],
  )?.rows[0]?.name
  const scopeLabel = selectedEntityId === "all" ? "All entities" : (label ?? "—")

  const stats = useLiveQuery<StatsRow>(
    `SELECT
       COALESCE(SUM(CASE WHEN c.kind = 'income' THEN t.amount ELSE 0 END), 0) AS income,
       COALESCE(SUM(CASE WHEN c.kind = 'expense' THEN t.amount ELSE 0 END), 0) AS expense,
       COUNT(*) AS count
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.deleted_at IS NULL ${scoped ? "AND t.entity_id = $1" : ""}`,
    scoped ? [entityParam] : [],
  )?.rows[0]

  const counts = useLiveQuery<CountsRow>(
    `SELECT
       (SELECT COUNT(*) FROM properties p
          WHERE p.deleted_at IS NULL ${scoped ? "AND p.entity_id = $1" : ""}) AS properties,
       (SELECT COUNT(*) FROM units u JOIN properties p ON p.id = u.property_id
          WHERE u.deleted_at IS NULL AND p.deleted_at IS NULL
            ${scoped ? "AND p.entity_id = $2" : ""}) AS units`,
    scoped ? [entityParam, entityParam] : [],
  )?.rows[0]

  const transactions =
    useLiveQuery<TxRow>(
      `SELECT t.id, t.occurred_on AS "occurredOn", t.amount, t.memo,
              c.name AS category, c.kind,
              e.name AS entity, p.name AS property
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       LEFT JOIN entities e ON e.id = t.entity_id
       LEFT JOIN properties p ON p.id = t.property_id
       WHERE t.deleted_at IS NULL ${scoped ? "AND t.entity_id = $1" : ""}
       ORDER BY t.occurred_on DESC, t.created_at DESC
       LIMIT 12`,
      scoped ? [entityParam] : [],
    )?.rows ?? []

  const income = Number(stats?.income ?? 0)
  const expense = Number(stats?.expense ?? 0)
  const net = income - expense

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {scopeLabel} · cash-basis, all time
          </p>
        </div>
        <AddTransactionDialog>
          <Button>
            <HugeiconsIcon icon={PlusSignIcon} data-icon="inline-start" />
            Add transaction
          </Button>
        </AddTransactionDialog>
      </div>

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
        <StatCard
          label="Properties"
          icon={Building03Icon}
          value={counts ? String(counts.properties) : undefined}
          hint={counts ? `${counts.units} unit${counts.units === 1 ? "" : "s"}` : undefined}
        />
      </div>

      <Card className="border-dashed bg-muted/30">
        <CardContent className="flex items-start gap-3 py-4 text-sm">
          <HugeiconsIcon
            icon={WifiDisconnected03Icon}
            className="mt-0.5 size-5 shrink-0 text-muted-foreground"
          />
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Works offline.</span>{" "}
            This runs on a real Postgres database (PGlite) stored in your browser.
            Add a transaction, turn off Wi-Fi, keep working — it&apos;ll sync once
            the backend is connected.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent transactions</CardTitle>
          <CardDescription>
            {stats ? `${stats.count} total` : "Loading…"} for {scopeLabel.toLowerCase()}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="hidden sm:table-cell">Entity</TableHead>
                <TableHead className="hidden md:table-cell">Property / memo</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    No transactions yet. Add your first one above.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx) => {
                  const isIncome = tx.kind === "income"
                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDate(tx.occurredOn)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={isIncome ? "secondary" : "outline"} className="font-normal">
                          {tx.category ?? "Uncategorized"}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">
                        {tx.entity ?? "—"}
                      </TableCell>
                      <TableCell className="hidden max-w-[24ch] truncate text-muted-foreground md:table-cell">
                        {tx.property ? `${tx.property} · ` : ""}
                        {tx.memo ?? ""}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium tabular-nums ${
                          isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                        }`}
                      >
                        {isIncome ? "+" : "−"}
                        {formatMoney(tx.amount)}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  label,
  icon,
  value,
  hint,
  accent,
}: {
  label: string
  icon: IconSvgElement
  value: string | undefined
  hint?: string
  accent?: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className={`text-2xl tabular-nums ${accent ?? ""}`}>
          {value === undefined ? <Skeleton className="h-7 w-24" /> : value}
        </CardTitle>
        <CardAction>
          <HugeiconsIcon icon={icon} className="size-5 text-muted-foreground" />
        </CardAction>
      </CardHeader>
      {hint && (
        <CardContent className="pt-0 text-xs text-muted-foreground">{hint}</CardContent>
      )}
    </Card>
  )
}
