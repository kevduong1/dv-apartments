"use client"

import { useRouter } from "next/navigation"
import { useLiveQuery } from "@electric-sql/pglite-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useSelectedEntity } from "@/components/entity-context"

interface EntityRow {
  id: string
  name: string
  type: "parent" | "series"
}

/**
 * Quick-jump between LLCs for the whole app. "All entities" goes to the
 * portfolio home; picking an entity navigates to its detail page (which becomes
 * the source of truth for scope). The selected value also stays in context so
 * the Add-Transaction dialog defaults to the right LLC. Backed by a live query,
 * so new entities appear instantly.
 */
export function EntitySwitcher({ className }: { className?: string }) {
  const router = useRouter()
  const { selectedEntityId, setSelectedEntityId } = useSelectedEntity()
  const result = useLiveQuery<EntityRow>(
    `SELECT id, name, type FROM entities
     WHERE deleted_at IS NULL
     ORDER BY (type = 'parent') DESC, name ASC`
  )
  const entities = result?.rows ?? []

  function handleChange(value: string) {
    setSelectedEntityId(value)
    router.push(value === "all" ? "/" : `/entities/${value}`)
  }

  return (
    <Select value={selectedEntityId} onValueChange={handleChange}>
      <SelectTrigger size="sm" className={className}>
        <SelectValue placeholder="Select entity" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All entities</SelectItem>
        {entities.map((entity) => (
          <SelectItem key={entity.id} value={entity.id}>
            {entity.type === "series" ? `↳ ${entity.name}` : entity.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
