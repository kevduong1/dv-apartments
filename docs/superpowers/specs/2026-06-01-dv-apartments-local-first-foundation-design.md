# DV Apartments — Local-First Foundation (Design)

_Date: 2026-06-01_

## Goal

Stand up the foundation for an offline-first bookkeeping web app for a Series
LLC property portfolio. Must run with **no hosted database**, work offline, and
be shaped to sync to Supabase later. First commit delivers the foundation plus a
working starter dashboard.

## Decisions (from brainstorming)

| Question         | Decision                                                            |
| ---------------- | ------------------------------------------------------------------- |
| Users            | A few collaborators sharing one dataset → auth + light conflict later |
| Local DB         | **PGlite** (Postgres in WASM, persisted to IndexedDB)               |
| First commit     | Local-first foundation only; Supabase + sync stubbed behind interfaces |
| Accounting       | **Simple categorized ledger** (not double-entry)                    |

## Stack

Next.js 16 (App Router) + React 19 + shadcn/ui (`radix-luma` preset, Hugeicons,
Tailwind v4). PGlite + `@electric-sql/pglite-react` live queries for reactive
offline reads. **Drizzle ORM** as the single schema source of truth: it
generates the SQL that initializes PGlite now and migrates Supabase later — no
dialect drift, one place to evolve the model.

## Data layer

- `db/schema.ts` — Drizzle schema (source of truth).
- `drizzle-kit generate` → SQL in `db/migrations`; `scripts/build-migrations.mjs`
  bundles it into `db/migrations.generated.ts` for the browser (no filesystem
  there). Both run via `pnpm db:generate`.
- `db/migrate.ts` — applies migrations to PGlite on first load, tracked in
  `__migrations`, each in a transaction.
- `db/client.ts` — singleton boot: create PGlite (IndexedDB), migrate, wrap with
  Drizzle, seed. Everything dynamically imported so it never enters the server
  bundle.
- `db/provider.tsx` — client provider exposing live queries + `useDb()` writes;
  shows a boot screen while Postgres-in-WASM warms up.
- `db/queries.ts` — repository layer; **all writes** go through here (the sync
  seam). Money is a decimal string end-to-end, never a float.

## Schema (lean but real)

`entities` (self-referencing `parent_id` = the Series LLC), `properties`,
`units`, `categories` (income/expense), `transactions`. Every table has
`created_at`, `updated_at`, `deleted_at` (soft delete), `updated_by` — the
columns a last-write-wins sync needs. Seeded with a parent LLC, two series, two
properties with units, a category set, and a month of transactions.

Deferred (YAGNI): leases, tenants, owners/members, double-entry, reports.

## Sync seam (stubbed, not built)

`lib/sync` defines a `SyncEngine` interface with a local-only no-op
implementation; the UI shows a connectivity/sync badge against it.
`lib/supabase/client.ts` is an env-gated stub. Planned engine: ElectricSQL
(Postgres↔PGlite) or an `updated_at`-cursor pull + offline outbox push, LWW with
soft-delete tombstones.

## UI

Responsive shell (sidebar on tablet/desktop, sheet drawer on phones), entity
switcher (consolidated vs. per-series), and a dashboard: income/expense/net +
property stats, an offline explainer, a recent-transactions table, and an
add-transaction dialog that writes to PGlite and updates live. PWA manifest +
iPad/mobile meta now; service worker deferred.

## Out of scope for this commit

Real Supabase connection, auth, the sync engine implementation, service worker,
and the deferred domain tables — all have a documented home in the structure.
