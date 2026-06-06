"use client"

import { useEffect } from "react"

import { useSelectedEntity } from "@/components/entity-context"
import { PropertiesDirectory } from "@/components/properties-directory"

/**
 * The portfolio's main page: every property across the portfolio as a
 * searchable grid of cards. Drilling into a card opens that property's detail
 * page.
 */
export default function HomePage() {
  const { setSelectedEntityId } = useSelectedEntity()

  // This is a portfolio-wide list, so clear any series scope in the header.
  useEffect(() => setSelectedEntityId("all"), [setSelectedEntityId])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Properties</h1>
        <p className="text-sm text-muted-foreground">
          Everything you own · search by name, address, or series
        </p>
      </div>

      <PropertiesDirectory />
    </div>
  )
}
