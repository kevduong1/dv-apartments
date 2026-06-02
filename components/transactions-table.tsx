"use client"

import { useLiveQuery } from "@electric-sql/pglite-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDate, formatMoney } from "@/lib/format"
import { scopeFilter, type Scope } from "@/lib/scope"

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

/** A scoped ledger view. Hides the Entity column when already inside one LLC. */
export function TransactionsTable({
  scope,
  limit = 12,
  title = "Recent transactions",
  description,
}: {
  scope: Scope
  limit?: number
  title?: string
  description?: string
}) {
  const f = scopeFilter(scope, {
    entityId: "t.entity_id",
    propertyId: "t.property_id",
    unitId: "t.unit_id",
  })
  const transactions =
    useLiveQuery<TxRow>(
      `SELECT t.id, t.occurred_on AS "occurredOn", t.amount, t.memo,
              c.name AS category, c.kind,
              e.name AS entity, p.name AS property
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       LEFT JOIN entities e ON e.id = t.entity_id
       LEFT JOIN properties p ON p.id = t.property_id
       WHERE t.deleted_at IS NULL${f.clause}
       ORDER BY t.occurred_on DESC, t.created_at DESC
       LIMIT ${Number(limit)}`,
      f.params,
    )?.rows ?? []

  const showEntity = scope.kind === "all" || scope.kind === "parent"
  const colSpan = showEntity ? 5 : 4

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="px-0 sm:px-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              {showEntity && <TableHead className="hidden sm:table-cell">Entity</TableHead>}
              <TableHead className="hidden md:table-cell">Property / memo</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={colSpan}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  No transactions yet.
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
                      <Badge
                        variant={isIncome ? "secondary" : "outline"}
                        className="font-normal"
                      >
                        {tx.category ?? "Uncategorized"}
                      </Badge>
                    </TableCell>
                    {showEntity && (
                      <TableCell className="hidden text-muted-foreground sm:table-cell">
                        {tx.entity ?? "—"}
                      </TableCell>
                    )}
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
  )
}
