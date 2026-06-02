const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

const DATE_MED = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

/** Formats a decimal money string (or number) as USD. Treats nullish as $0. */
export function formatMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return USD.format(0)
  const n = typeof value === "string" ? Number(value) : value
  return USD.format(Number.isFinite(n) ? n : 0)
}

/** Formats an ISO date string (YYYY-MM-DD) or Date as e.g. "Jun 1, 2026". */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—"
  // Parse YYYY-MM-DD as local (avoid the UTC-midnight off-by-one).
  const date =
    typeof value === "string"
      ? new Date(`${value.slice(0, 10)}T00:00:00`)
      : value
  return Number.isNaN(date.getTime()) ? "—" : DATE_MED.format(date)
}

/** Today as an ISO date string (YYYY-MM-DD), in local time. */
export function todayISO(): string {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}
