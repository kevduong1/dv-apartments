"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import type { IconSvgElement } from "@hugeicons/react"
import {
  Building03Icon,
  Coins01Icon,
  Home09Icon,
  Invoice01Icon,
  Menu01Icon,
  Settings01Icon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { EntitySwitcher } from "@/components/entity-switcher"
import { SyncStatusBadge } from "@/components/sync-status-badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"

interface NavItem {
  label: string
  icon: IconSvgElement
  href?: string
}

const NAV: NavItem[] = [
  { label: "Dashboard", icon: Home09Icon, href: "/" },
  { label: "Transactions", icon: Invoice01Icon },
  { label: "Properties", icon: Building03Icon },
  { label: "Entities", icon: Coins01Icon },
  { label: "Settings", icon: Settings01Icon },
]

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <HugeiconsIcon icon={Building03Icon} size={18} />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-sm font-semibold">DV Books</span>
        <span className="text-[10px] text-muted-foreground">Series LLC ledger</span>
      </span>
    </Link>
  )
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const base =
    "flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium transition-colors"

  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) =>
        item.href ? (
          <Link
            key={item.label}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              base,
              pathname === item.href
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <HugeiconsIcon icon={item.icon} size={18} />
            {item.label}
          </Link>
        ) : (
          <div
            key={item.label}
            className={cn(base, "cursor-default text-muted-foreground/60")}
            title="Coming soon"
          >
            <HugeiconsIcon icon={item.icon} size={18} />
            {item.label}
            <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
              Soon
            </span>
          </div>
        ),
      )}
    </nav>
  )
}

/** Responsive app frame: sidebar on tablet/desktop, sheet drawer on phones. */
export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-4">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="md:hidden"
              aria-label="Open navigation"
            >
              <HugeiconsIcon icon={Menu01Icon} size={20} />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex w-72 flex-col p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="flex h-14 items-center border-b px-4">
              <Brand />
            </div>
            <div className="flex-1 p-3">
              <NavLinks onNavigate={() => setMobileOpen(false)} />
            </div>
            <div className="border-t p-4">
              <SyncStatusBadge />
            </div>
          </SheetContent>
        </Sheet>

        <Brand />

        <div className="ml-auto flex items-center gap-2">
          <SyncStatusBadge className="hidden sm:inline-flex" />
          <EntitySwitcher className="max-w-[42vw] sm:max-w-none" />
          <ThemeToggle />
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="hidden w-60 shrink-0 border-r md:block">
          <div className="sticky top-14 p-3">
            <NavLinks />
          </div>
        </aside>
        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-6xl p-4 sm:p-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
