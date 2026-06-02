import type { AppDb } from "./client"
import {
  categories,
  entities,
  properties,
  rentLedger,
  tenants,
  transactions,
  units,
} from "./schema"

/** ISO date (YYYY-MM-DD) `days` before today (a negative count is in the future). */
function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

/** First of the month (YYYY-MM-01) `months` before the current month. */
function monthsAgo(months: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
}

// --- Address helpers: expand the real-world address labels into unit labels. ---

/** Street numbers from `start` to `end` inclusive, stepping by 2 (keeps parity).
 *  e.g. numberRange(929, 933) → ["929", "931", "933"]. */
function numberRange(start: number, end: number): string[] {
  const out: string[] = []
  for (let n = start; n <= end; n += 2) out.push(String(n))
  return out
}

/** Each building in the range split into an A and a B unit.
 *  e.g. abRange(2958, 2962) → ["2958A","2958B","2960A","2960B","2962A","2962B"]. */
function abRange(start: number, end: number): string[] {
  const out: string[] = []
  for (let n = start; n <= end; n += 2) out.push(`${n}A`, `${n}B`)
  return out
}

const GARDEN_CITY = { city: "Garden City", state: "KS", postalCode: "67846" }
const WICHITA = { city: "Wichita", state: "KS", postalCode: "67207" }
const LARNED = { city: "Larned", state: "KS", postalCode: "67550" }

interface PropSpec {
  /** Street address; doubles as the property's display name. */
  street: string
  loc: { city: string; state: string; postalCode: string }
  /** Unit labels — one means a single-family rental, several means multifamily. */
  units: string[]
  /** Rent for the first unit; later units in the same building step up slightly. */
  baseRent: number
}

interface SeriesSpec {
  name: string
  properties: PropSpec[]
}

/**
 * The real portfolio: one parent LLC over four protected series, each holding a
 * cluster of Kansas rentals. Address ranges (e.g. "929-933", "706A-706B",
 * "TrailBlazer AB", "Up/Down") are expanded into individual units below.
 */
const PORTFOLIO: SeriesSpec[] = [
  {
    name: "Series 1",
    properties: [
      { street: "914 Amy", loc: GARDEN_CITY, units: ["914"], baseRent: 1050 },
      { street: "929-933 Amy", loc: GARDEN_CITY, units: numberRange(929, 933), baseRent: 700 },
      { street: "937-941 Amy", loc: GARDEN_CITY, units: numberRange(937, 941), baseRent: 700 },
      { street: "946-950 Amy", loc: GARDEN_CITY, units: numberRange(946, 950), baseRent: 725 },
      { street: "954-958 Amy", loc: GARDEN_CITY, units: numberRange(954, 958), baseRent: 725 },
      { street: "962-966 Amy", loc: GARDEN_CITY, units: numberRange(962, 966), baseRent: 750 },
      { street: "802-806 Susan", loc: GARDEN_CITY, units: numberRange(802, 806), baseRent: 700 },
    ],
  },
  {
    name: "Series 2",
    properties: [
      { street: "625 Amy", loc: GARDEN_CITY, units: ["625"], baseRent: 950 },
      { street: "631 Amy", loc: GARDEN_CITY, units: ["631"], baseRent: 975 },
      { street: "706A-706B Amy", loc: GARDEN_CITY, units: ["706A", "706B"], baseRent: 800 },
      { street: "714A-714B Amy", loc: GARDEN_CITY, units: ["714A", "714B"], baseRent: 800 },
      { street: "720A-720B Amy", loc: GARDEN_CITY, units: ["720A", "720B"], baseRent: 825 },
      { street: "718 Sara", loc: GARDEN_CITY, units: ["718"], baseRent: 1000 },
      { street: "3319-3325 Amy", loc: GARDEN_CITY, units: numberRange(3319, 3325), baseRent: 700 },
      { street: "3401 Amy", loc: GARDEN_CITY, units: ["3401"], baseRent: 950 },
      { street: "1808 Sequoyah Dr", loc: GARDEN_CITY, units: ["1808"], baseRent: 1250 },
      { street: "1812 Cherokee", loc: GARDEN_CITY, units: ["1812"], baseRent: 1150 },
    ],
  },
  {
    name: "Series 3",
    properties: [
      { street: "2958AB-2968AB TrailBlazer", loc: GARDEN_CITY, units: abRange(2958, 2968), baseRent: 775 },
      { street: "2959AB-2969AB TrailBlazer", loc: GARDEN_CITY, units: abRange(2959, 2969), baseRent: 775 },
      { street: "2917A Eldorado", loc: GARDEN_CITY, units: ["2917A"], baseRent: 1100 },
      { street: "2924 Patty Pl", loc: GARDEN_CITY, units: ["2924"], baseRent: 1200 },
      { street: "2901 Parkwood", loc: GARDEN_CITY, units: ["2901"], baseRent: 1150 },
      { street: "2016 Commanche", loc: GARDEN_CITY, units: ["2016"], baseRent: 1050 },
      { street: "1605 Up/Down 8th", loc: GARDEN_CITY, units: ["Up", "Down"], baseRent: 850 },
    ],
  },
  {
    name: "Series 4",
    properties: [
      { street: "12513 Cherry Creek Dr", loc: WICHITA, units: ["12513"], baseRent: 1450 },
      { street: "1054 S Glenmore", loc: WICHITA, units: ["1054"], baseRent: 1250 },
      { street: "1034 S Glenmore", loc: WICHITA, units: ["1034"], baseRent: 1250 },
      { street: "1730 S Michelle Ct", loc: WICHITA, units: ["1730"], baseRent: 1350 },
      { street: "2114 S Michelle St", loc: WICHITA, units: ["2114"], baseRent: 1300 },
      { street: "412 N 2nd St", loc: GARDEN_CITY, units: ["412"], baseRent: 950 },
      { street: "621 Edward", loc: LARNED, units: ["621"], baseRent: 750 },
      { street: "717 Vernon Dr", loc: LARNED, units: ["717"], baseRent: 800 },
    ],
  },
]

/** A pool of tenant names, cycled as units are filled. */
const TENANT_NAMES = [
  "Jordan Reyes", "Priya Anand", "Marcus Lee", "Sofia Martinez", "Emily Carter",
  "Daniel Kim", "Grace Nguyen", "Liam O'Brien", "Nora Patel", "Owen Schmidt",
  "Maya Flores", "Ethan Brooks", "Ava Romero", "Noah Becker", "Mia Hoffman",
  "Lucas Reed", "Zoe Caldwell", "Caleb Frost", "Ruth Delgado", "Iris Vance",
  "Hank Mueller", "Dale Whitman", "Carl Espinoza", "Joan Pierce", "Edith Salas",
  "Frank Lozano", "Greta Hahn", "Hazel Monroe", "Walt Jennings", "Pearl Robins",
  "Roy Castillo", "Sue Mercer", "Vernon Pratt", "Wanda Cole", "Cody Barrett",
  "Trent Wallace", "Bree Holloway", "Gail Sutton", "Lonnie Park", "Dana Hewitt",
]

// Properties whose first unit is intentionally left vacant / in a non-active
// state, so the cards and badges show the full range of statuses.
const VACANT_PROPERTIES = new Set(["3401 Amy", "2016 Commanche"])
const PENDING_PROPERTIES = new Set(["1808 Sequoyah Dr"])
const PAST_PROPERTIES = new Set(["412 N 2nd St"])

/**
 * Seeds the real Series-LLC property portfolio the first time the app runs, so
 * the dashboard is populated and the parent → series → property → unit → tenant
 * drill-down is visible. Idempotent: does nothing once any entity exists.
 */
export async function seedIfEmpty(db: AppDb): Promise<void> {
  const existing = await db.select({ id: entities.id }).from(entities).limit(1)
  if (existing.length > 0) return

  // --- Entities: one parent LLC over four protected series ---
  const [parent] = await db
    .insert(entities)
    .values({
      name: "DV Holdings LLC",
      type: "parent",
      formationState: "KS",
      notes: "Parent of the series. Consolidates the child LLCs' books.",
    })
    .returning()

  const seriesRows = await db
    .insert(entities)
    .values(
      PORTFOLIO.map((s) => ({
        name: s.name,
        type: "series" as const,
        parentId: parent.id,
        formationState: "KS",
      })),
    )
    .returning()

  // --- Properties + units, expanded from the address specs ---
  const allProps: {
    prop: typeof properties.$inferSelect
    series: typeof entities.$inferSelect
    unitRows: (typeof units.$inferSelect)[]
  }[] = []

  for (let si = 0; si < PORTFOLIO.length; si++) {
    const series = seriesRows[si]
    for (const spec of PORTFOLIO[si].properties) {
      const multi = spec.units.length > 1
      const [prop] = await db
        .insert(properties)
        .values({
          entityId: series.id,
          name: spec.street,
          addressLine1: spec.street,
          city: spec.loc.city,
          state: spec.loc.state,
          postalCode: spec.loc.postalCode,
          propertyType: multi ? "multifamily" : "single_family",
          acquiredOn: `${2019 + si}-06-15`,
        })
        .returning()

      const unitRows = await db
        .insert(units)
        .values(
          spec.units.map((label, ui) => ({
            propertyId: prop.id,
            label,
            bedrooms: multi ? 2 : 3,
            bathrooms: multi ? "1.0" : "2.0",
            rentAmount: (spec.baseRent + 25 * ui).toFixed(2),
          })),
        )
        .returning()

      allProps.push({ prop, series, unitRows })
    }
  }

  // --- Tenants: fill the first unit of most properties so the portfolio looks
  // occupied, leaving a couple vacant and varying status so every badge shows. ---
  const tenantValues: (typeof tenants.$inferInsert)[] = []
  let occupied = 0
  for (const { prop, unitRows } of allProps) {
    if (VACANT_PROPERTIES.has(prop.name)) continue
    const unit = unitRows[0]
    const status = PENDING_PROPERTIES.has(prop.name)
      ? "pending"
      : PAST_PROPERTIES.has(prop.name)
        ? "past"
        : "active"

    const name = TENANT_NAMES[occupied % TENANT_NAMES.length]
    const slug = name.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "")
    const seq = String(100 + occupied).slice(-3)

    tenantValues.push({
      entityId: prop.entityId,
      propertyId: prop.id,
      unitId: unit.id,
      name,
      email: `${slug}@example.com`,
      phone: `(620) 555-0${seq}`,
      leaseStart:
        status === "pending"
          ? isoDaysAgo(-10)
          : status === "past"
            ? isoDaysAgo(430)
            : isoDaysAgo(120 + occupied * 5),
      leaseEnd: status === "past" ? isoDaysAgo(65) : isoDaysAgo(-220),
      rentAmount: unit.rentAmount,
      status,
    })
    occupied++
  }
  const tenantRows = await db.insert(tenants).values(tenantValues).returning()

  // --- Rent ledger: a few months of balance-sheet history for the first three
  // active tenants, so the per-tenant balance sheet is populated on a fresh DB.
  // One month is paid late (a note) and the latest is left partially paid. ---
  const ledgerRows = tenantRows.slice(0, 3).flatMap((t) => {
    const rent = t.rentAmount ?? "0.00"
    const partial = Math.max(0, Number(rent) - 200).toFixed(2)
    return [
      { tenantId: t.id, periodMonth: monthsAgo(2), amountDue: rent, amountPaid: rent, note: null },
      {
        tenantId: t.id, periodMonth: monthsAgo(1), amountDue: rent, amountPaid: rent,
        note: "Paid a few days late",
      },
      {
        tenantId: t.id, periodMonth: monthsAgo(0), amountDue: rent, amountPaid: partial,
        note: "Partial — balance carried",
      },
    ]
  })
  await db.insert(rentLedger).values(ledgerRows)

  // --- Categories (the categorized ledger) ---
  const categoryRows = await db
    .insert(categories)
    .values([
      { name: "Rent", kind: "income" },
      { name: "Late Fees", kind: "income" },
      { name: "Other Income", kind: "income" },
      { name: "Repairs & Maintenance", kind: "expense" },
      { name: "Utilities", kind: "expense" },
      { name: "Mortgage Interest", kind: "expense" },
      { name: "Property Taxes", kind: "expense" },
      { name: "Insurance", kind: "expense" },
      { name: "Management Fees", kind: "expense" },
      { name: "Supplies", kind: "expense" },
    ])
    .returning()
  const cat = Object.fromEntries(categoryRows.map((c) => [c.name, c.id]))

  // --- Transactions: this month's + last month's rent for every active tenant,
  // plus a handful of expenses against the first property of each series. ---
  const txns: (typeof transactions.$inferInsert)[] = []

  const activeTenants = tenantRows.filter((t) => t.status === "active")
  activeTenants.forEach((t, i) => {
    const rent = t.rentAmount ?? "0.00"
    txns.push({
      entityId: t.entityId, propertyId: t.propertyId, unitId: t.unitId,
      categoryId: cat["Rent"], occurredOn: isoDaysAgo(3 + (i % 20)), amount: rent, memo: "Monthly rent",
    })
    txns.push({
      entityId: t.entityId, propertyId: t.propertyId, unitId: t.unitId,
      categoryId: cat["Rent"], occurredOn: isoDaysAgo(33 + (i % 20)), amount: rent, memo: "Monthly rent",
    })
  })

  const expensePlan = [
    { cat: "Mortgage Interest", amount: "1675.00", memo: "Monthly mortgage interest", day: 4 },
    { cat: "Management Fees", amount: "320.00", memo: "Management fee", day: 6 },
    { cat: "Repairs & Maintenance", amount: "385.00", memo: "Plumbing repair", day: 9 },
    { cat: "Utilities", amount: "240.00", memo: "Water & sewer", day: 13 },
    { cat: "Insurance", amount: "510.00", memo: "Quarterly premium", day: 17 },
    { cat: "Property Taxes", amount: "1320.00", memo: "Property tax installment", day: 21 },
  ]
  for (const series of seriesRows) {
    const anchor = allProps.find((p) => p.series.id === series.id)
    if (!anchor) continue
    for (const e of expensePlan) {
      txns.push({
        entityId: series.id,
        propertyId: anchor.prop.id,
        categoryId: cat[e.cat],
        occurredOn: isoDaysAgo(e.day),
        amount: e.amount,
        memo: `${e.memo} — ${anchor.prop.name}`,
      })
    }
  }

  await db.insert(transactions).values(txns)
}
