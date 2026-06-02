import type { AppDb } from "./client"
import { categories, entities, properties, tenants, transactions, units } from "./schema"

/** ISO date (YYYY-MM-DD) `days` before today. */
function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

/**
 * Seeds a small but realistic Series-LLC property portfolio the first time the
 * app runs, so the dashboard is populated and the parent/child structure is
 * visible. Idempotent: does nothing once any entity exists.
 */
export async function seedIfEmpty(db: AppDb): Promise<void> {
  const existing = await db.select({ id: entities.id }).from(entities).limit(1)
  if (existing.length > 0) return

  // --- Entities: one parent LLC with two protected series ---
  const [parent] = await db
    .insert(entities)
    .values({
      name: "DV Holdings LLC",
      type: "parent",
      formationState: "DE",
      notes: "Parent of the series. Consolidates the child LLCs' books.",
    })
    .returning()

  const [mapleLlc, oakLlc] = await db
    .insert(entities)
    .values([
      { name: "DV Maple Street Series LLC", type: "series", parentId: parent.id, formationState: "DE" },
      { name: "DV Oak Avenue Series LLC", type: "series", parentId: parent.id, formationState: "DE" },
    ])
    .returning()

  // --- Properties ---
  const [mapleProp, oakProp] = await db
    .insert(properties)
    .values([
      {
        entityId: mapleLlc.id,
        name: "Maple Street Apartments",
        addressLine1: "128 Maple St",
        city: "Austin",
        state: "TX",
        postalCode: "78704",
        propertyType: "multifamily",
        acquiredOn: "2022-06-15",
      },
      {
        entityId: oakLlc.id,
        name: "Oak Avenue Fourplex",
        addressLine1: "4421 Oak Ave",
        city: "Austin",
        state: "TX",
        postalCode: "78745",
        propertyType: "multifamily",
        acquiredOn: "2023-03-01",
      },
    ])
    .returning()

  // --- Units ---
  const mapleUnits = await db
    .insert(units)
    .values([
      { propertyId: mapleProp.id, label: "Apt 1", bedrooms: 1, bathrooms: "1.0", rentAmount: "1450.00" },
      { propertyId: mapleProp.id, label: "Apt 2", bedrooms: 2, bathrooms: "1.0", rentAmount: "1700.00" },
      { propertyId: mapleProp.id, label: "Apt 3", bedrooms: 2, bathrooms: "2.0", rentAmount: "1850.00" },
      { propertyId: mapleProp.id, label: "Apt 4", bedrooms: 1, bathrooms: "1.0", rentAmount: "1500.00" },
    ])
    .returning()

  const oakUnits = await db
    .insert(units)
    .values([
      { propertyId: oakProp.id, label: "Unit A", bedrooms: 2, bathrooms: "1.0", rentAmount: "1350.00" },
      { propertyId: oakProp.id, label: "Unit B", bedrooms: 2, bathrooms: "1.0", rentAmount: "1350.00" },
      { propertyId: oakProp.id, label: "Unit C", bedrooms: 3, bathrooms: "2.0", rentAmount: "1825.00" },
      { propertyId: oakProp.id, label: "Unit D", bedrooms: 1, bathrooms: "1.0", rentAmount: "1150.00" },
    ])
    .returning()

  // --- Tenants: leases tied to units. One unit (Apt 4) is left vacant, and
  // there's a pending move-in and a past tenant so every status renders. ---
  await db.insert(tenants).values([
    {
      entityId: mapleLlc.id, propertyId: mapleProp.id, unitId: mapleUnits[0].id,
      name: "Jordan Reyes", email: "jordan.reyes@example.com", phone: "(512) 555-0148",
      leaseStart: "2024-08-01", leaseEnd: "2025-07-31",
      rentAmount: mapleUnits[0].rentAmount, status: "active",
    },
    {
      entityId: mapleLlc.id, propertyId: mapleProp.id, unitId: mapleUnits[1].id,
      name: "Priya Anand", email: "priya.anand@example.com", phone: "(512) 555-0192",
      leaseStart: "2024-05-15", leaseEnd: "2025-05-14",
      rentAmount: mapleUnits[1].rentAmount, status: "active",
    },
    {
      entityId: mapleLlc.id, propertyId: mapleProp.id, unitId: mapleUnits[2].id,
      name: "Marcus Lee", email: "marcus.lee@example.com", phone: "(512) 555-0177",
      leaseStart: "2023-11-01", leaseEnd: "2025-10-31",
      rentAmount: mapleUnits[2].rentAmount, status: "active",
    },
    // mapleUnits[3] (Apt 4) intentionally left vacant.
    {
      entityId: oakLlc.id, propertyId: oakProp.id, unitId: oakUnits[0].id,
      name: "Sofia Martinez", email: "sofia.martinez@example.com", phone: "(512) 555-0203",
      leaseStart: "2024-09-01", leaseEnd: "2025-08-31",
      rentAmount: oakUnits[0].rentAmount, status: "active",
    },
    {
      entityId: oakLlc.id, propertyId: oakProp.id, unitId: oakUnits[1].id,
      name: "Daniel Kim", email: "daniel.kim@example.com", phone: "(512) 555-0119",
      leaseStart: isoDaysAgo(-14), leaseEnd: isoDaysAgo(-379),
      rentAmount: oakUnits[1].rentAmount, status: "pending",
    },
    {
      entityId: oakLlc.id, propertyId: oakProp.id, unitId: oakUnits[2].id,
      name: "Emily Carter", email: "emily.carter@example.com", phone: "(512) 555-0166",
      leaseStart: "2024-01-15", leaseEnd: "2025-01-14",
      rentAmount: oakUnits[2].rentAmount, status: "active",
    },
    {
      entityId: oakLlc.id, propertyId: oakProp.id, unitId: oakUnits[3].id,
      name: "Tom Becker", email: "tom.becker@example.com", phone: "(512) 555-0140",
      leaseStart: "2022-06-01", leaseEnd: "2024-05-31",
      rentAmount: oakUnits[3].rentAmount, status: "past",
    },
  ])

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

  // --- Transactions: current + prior month, income and expenses ---
  const ledger = [
    // This month's rent — Maple
    ...mapleUnits.map((u, i) => ({
      entityId: mapleLlc.id,
      propertyId: mapleProp.id,
      unitId: u.id,
      categoryId: cat["Rent"],
      occurredOn: isoDaysAgo(4 + i),
      amount: u.rentAmount ?? "0.00",
      memo: `Rent — ${u.label}`,
    })),
    // This month's rent — Oak
    ...oakUnits.map((u, i) => ({
      entityId: oakLlc.id,
      propertyId: oakProp.id,
      unitId: u.id,
      categoryId: cat["Rent"],
      occurredOn: isoDaysAgo(5 + i),
      amount: u.rentAmount ?? "0.00",
      memo: `Rent — ${u.label}`,
    })),
    // A late fee
    { entityId: mapleLlc.id, propertyId: mapleProp.id, unitId: mapleUnits[1].id, categoryId: cat["Late Fees"], occurredOn: isoDaysAgo(2), amount: "75.00", memo: "Late fee — Apt 2" },
    // Expenses — Maple
    { entityId: mapleLlc.id, propertyId: mapleProp.id, categoryId: cat["Repairs & Maintenance"], occurredOn: isoDaysAgo(8), amount: "325.50", memo: "Plumbing repair, Apt 2" },
    { entityId: mapleLlc.id, propertyId: mapleProp.id, categoryId: cat["Utilities"], occurredOn: isoDaysAgo(12), amount: "210.00", memo: "Water & sewer" },
    { entityId: mapleLlc.id, propertyId: mapleProp.id, categoryId: cat["Mortgage Interest"], occurredOn: isoDaysAgo(3), amount: "1840.00", memo: "Monthly mortgage interest" },
    // Expenses — Oak
    { entityId: oakLlc.id, propertyId: oakProp.id, categoryId: cat["Insurance"], occurredOn: isoDaysAgo(10), amount: "420.00", memo: "Quarterly premium" },
    { entityId: oakLlc.id, propertyId: oakProp.id, categoryId: cat["Management Fees"], occurredOn: isoDaysAgo(6), amount: "437.60", memo: "8% of collected rent" },
    // Prior month rent (a couple)
    { entityId: mapleLlc.id, propertyId: mapleProp.id, unitId: mapleUnits[0].id, categoryId: cat["Rent"], occurredOn: isoDaysAgo(34), amount: "1450.00", memo: "Rent — Apt 1" },
    { entityId: oakLlc.id, propertyId: oakProp.id, unitId: oakUnits[2].id, categoryId: cat["Rent"], occurredOn: isoDaysAgo(35), amount: "1825.00", memo: "Rent — Unit C" },
  ]

  await db.insert(transactions).values(ledger)
}
