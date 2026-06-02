"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

/** "all" = consolidated view across every LLC; otherwise a specific entity id. */
export type EntitySelection = string | "all"

interface EntityContextValue {
  selectedEntityId: EntitySelection
  setSelectedEntityId: (id: EntitySelection) => void
}

const EntityContext = createContext<EntityContextValue | null>(null)

export function EntityProvider({ children }: { children: ReactNode }) {
  const [selectedEntityId, setSelectedEntityId] = useState<EntitySelection>("all")
  return (
    <EntityContext.Provider value={{ selectedEntityId, setSelectedEntityId }}>
      {children}
    </EntityContext.Provider>
  )
}

export function useSelectedEntity(): EntityContextValue {
  const ctx = useContext(EntityContext)
  if (!ctx) throw new Error("useSelectedEntity must be used within <EntityProvider>")
  return ctx
}
