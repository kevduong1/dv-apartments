/**
 * A drill-down scope: the portfolio root ("all"), a parent LLC (consolidated
 * across its child series), a single series, or a single property. The shared
 * list/stat components take a `Scope` and translate it to a SQL filter in one
 * place via {@link scopeFilter}, so pages stay declarative.
 */
export type Scope =
  | { kind: "all" }
  | { kind: "parent"; entityId: string }
  | { kind: "series"; entityId: string }
  | { kind: "property"; propertyId: string }
  | { kind: "unit"; unitId: string }

/**
 * Builds a SQL filter fragment (prefixed with ` AND `) plus its params for a
 * scope, filtering on the supplied entity-id and property-id columns. Returns
 * an empty clause for the portfolio-wide ("all") scope.
 *
 * Placeholders start at $1 and each occurrence gets its own number — PGlite's
 * live extension inlines each `$n` once, so a value used twice (the parent
 * subquery) is passed twice. Each query should use this clause exactly once.
 */
export function scopeFilter(
  scope: Scope,
  cols: { entityId: string; propertyId: string; unitId?: string },
): { clause: string; params: string[] } {
  switch (scope.kind) {
    case "all":
      return { clause: "", params: [] }
    case "series":
      return { clause: ` AND ${cols.entityId} = $1`, params: [scope.entityId] }
    case "parent":
      return {
        clause: ` AND ${cols.entityId} IN (SELECT id FROM entities WHERE deleted_at IS NULL AND (id = $1 OR parent_id = $2))`,
        params: [scope.entityId, scope.entityId],
      }
    case "property":
      return { clause: ` AND ${cols.propertyId} = $1`, params: [scope.propertyId] }
    case "unit":
      return { clause: ` AND ${cols.unitId} = $1`, params: [scope.unitId] }
  }
}
