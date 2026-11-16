export type PeriodKey = "month" | "quarter" | "year" | "custom";
const ok = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

/** Période de rapport : `to` est exclusif (début du jour suivant). */
export function resolvePeriod(sp: { period?: string; from?: string; to?: string }, now = new Date()) {
  const y = now.getFullYear(), m = now.getMonth();
  let key = (["month", "quarter", "year", "custom"] as const).find((k) => k === sp.period) ?? "month";
  let from = new Date(y, m, 1), to = new Date(y, m + 1, 1);
  if (key === "year") { from = new Date(y, 0, 1); to = new Date(y + 1, 0, 1); }
  else if (key === "quarter") { const q = Math.floor(m / 3) * 3; from = new Date(y, q, 1); to = new Date(y, q + 3, 1); }
  else if (key === "custom") {
    if (ok(sp.from) && ok(sp.to) && sp.from! <= sp.to!) { from = new Date(`${sp.from}T00:00:00`); to = new Date(new Date(`${sp.to}T00:00:00`).getTime() + 864e5); }
    else key = "month";
  }
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { key, from, to, fromStr: iso(from), toStr: iso(new Date(to.getTime() - 864e5)) };
}
