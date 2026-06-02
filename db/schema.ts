/**
 * Drizzle schema — the single source of truth for the data model.
 *
 * The same schema generates:
 *   - the SQL that initializes the local PGlite database (now), and
 *   - the migrations that will be applied to Supabase Postgres (later).
 *
 * Every table carries sync-ready columns (`updated_at`, `deleted_at`,
 * `updated_by`) so a sync engine can be layered on without a schema change.
 * See `lib/sync` for the planned strategy.
 */
import { sql } from "drizzle-orm"
import {
  check,
  date,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core"

/** Columns every row carries to support soft-delete + last-write-wins sync. */
const syncColumns = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  /** Soft delete: non-null means the row is tombstoned (kept so deletes sync). */
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  /** The user who last wrote this row (set once auth lands). */
  updatedBy: uuid("updated_by"),
}

/**
 * The LLCs. A Series LLC is modeled as one parent row (`parent_id` is null,
 * `type = 'parent'`) with one child row per protected series
 * (`type = 'series'`, `parent_id` pointing at the parent).
 */
export const entities = pgTable(
  "entities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    parentId: uuid("parent_id").references((): AnyPgColumn => entities.id, {
      onDelete: "restrict",
    }),
    name: text("name").notNull(),
    type: text("type").$type<"parent" | "series">().notNull().default("series"),
    /** Employer Identification Number. */
    ein: text("ein"),
    formationState: text("formation_state"),
    notes: text("notes"),
    ...syncColumns,
  },
  (t) => [check("entities_type_check", sql`${t.type} in ('parent', 'series')`)],
)

/** A property owned by one child LLC (`entity_id`). */
export const properties = pgTable(
  "properties",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    addressLine1: text("address_line1"),
    city: text("city"),
    state: text("state"),
    postalCode: text("postal_code"),
    propertyType: text("property_type")
      .$type<"multifamily" | "single_family" | "commercial" | "other">()
      .notNull()
      .default("multifamily"),
    acquiredOn: date("acquired_on"),
    ...syncColumns,
  },
  (t) => [
    check(
      "properties_type_check",
      sql`${t.propertyType} in ('multifamily', 'single_family', 'commercial', 'other')`,
    ),
  ],
)

/** A rentable unit within a property. A single-family rental has one unit. */
export const units = pgTable("units", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  bedrooms: integer("bedrooms"),
  bathrooms: numeric("bathrooms", { precision: 3, scale: 1 }),
  /** Asking/contract rent. Stored as a decimal string — never a float. */
  rentAmount: numeric("rent_amount", { precision: 14, scale: 2 }),
  ...syncColumns,
})

/** Income/expense buckets for the categorized ledger. */
export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    kind: text("kind").$type<"income" | "expense">().notNull(),
    parentCategoryId: uuid("parent_category_id").references(
      (): AnyPgColumn => categories.id,
      { onDelete: "set null" },
    ),
    ...syncColumns,
  },
  (t) => [check("categories_kind_check", sql`${t.kind} in ('income', 'expense')`)],
)

/**
 * A single ledger entry. Whether it is income or expense is derived from the
 * referenced category's `kind`; `amount` is always stored as a positive
 * decimal string.
 */
export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityId: uuid("entity_id")
    .notNull()
    .references(() => entities.id, { onDelete: "cascade" }),
  propertyId: uuid("property_id").references(() => properties.id, {
    onDelete: "set null",
  }),
  unitId: uuid("unit_id").references(() => units.id, { onDelete: "set null" }),
  categoryId: uuid("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  occurredOn: date("occurred_on").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  memo: text("memo"),
  ...syncColumns,
})

export type Entity = typeof entities.$inferSelect
export type NewEntity = typeof entities.$inferInsert
export type Property = typeof properties.$inferSelect
export type NewProperty = typeof properties.$inferInsert
export type Unit = typeof units.$inferSelect
export type NewUnit = typeof units.$inferInsert
export type Category = typeof categories.$inferSelect
export type NewCategory = typeof categories.$inferInsert
export type Transaction = typeof transactions.$inferSelect
export type NewTransaction = typeof transactions.$inferInsert
