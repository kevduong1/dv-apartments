import { HugeiconsIcon } from "@hugeicons/react"
import type { IconSvgElement } from "@hugeicons/react"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

/** A single summary metric: label, icon, value, and an optional sub-hint. */
export function StatCard({
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
