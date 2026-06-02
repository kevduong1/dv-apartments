import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"

export interface Crumb {
  label: string
  href?: string
}

/** A compact breadcrumb trail. The last crumb renders as the current page. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
      {items.map((item, i) => {
        const last = i === items.length - 1
        return (
          <span key={`${item.label}-${i}`} className="flex items-center gap-1">
            {item.href && !last ? (
              <Link
                href={item.href}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ) : (
              <span className={cn(last ? "font-medium text-foreground" : "text-muted-foreground")}>
                {item.label}
              </span>
            )}
            {!last && (
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                className="size-3.5 shrink-0 text-muted-foreground/60"
              />
            )}
          </span>
        )
      })}
    </nav>
  )
}
