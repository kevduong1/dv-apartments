"use client"

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
 * Switches the active LLC for the whole app. "All entities" gives the
 * consolidated parent-level view; picking a series scopes everything to that
 * child LLC's books. Backed by a live query, so new entities appear instantly.
 */
export function EntitySwitcher({ className }: { className?: string }) {
  const { selectedEntityId, setSelectedEntityId } = useSelectedEntity()
  const result = useLiveQuery<EntityRow>(
    `SELECT id, name, type FROM entities
     WHERE deleted_at IS NULL
     ORDER BY (type = 'parent') DESC, name ASC`,
  )
  const entities = result?.rows ?? []

  return (
    <Select value={selectedEntityId} onValueChange={setSelectedEntityId}>
      <SelectTrigger size="sm" className={className}>
        <SelectValue placeholder="Select entity" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All entities (consolidated)</SelectItem>
        {entities.map((entity) => (
          <SelectItem key={entity.id} value={entity.id}>
            {entity.type === "series" ? `↳ ${entity.name}` : entity.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
