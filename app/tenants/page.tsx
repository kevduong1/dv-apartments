"use client"

import { useEffect } from "react"

import { useSelectedEntity } from "@/components/entity-context"
import { TenantsDirectory } from "@/components/tenants-directory"

/**
 * The tenant directory: every tenant across the portfolio as a searchable grid
 * of cards. Drilling into a card opens that tenant's detail page.
 */
export default function TenantsPage() {
  const { setSelectedEntityId } = useSelectedEntity()

  // This is a portfolio-wide list, so clear any series scope in the header.
  useEffect(() => setSelectedEntityId("all"), [setSelectedEntityId])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tenants</h1>
        <p className="text-sm text-muted-foreground">
          Everyone across your portfolio · search by name, property, or series
        </p>
      </div>

      <TenantsDirectory />
    </div>
  )
}
