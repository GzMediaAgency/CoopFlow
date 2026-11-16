const TONES = { green: "bg-canopy-soft text-canopy", gold: "bg-argan-soft text-gold-deep", clay: "bg-clay/10 text-clay", gray: "bg-gray-100 text-gray-600" } as const;
export type Tone = keyof typeof TONES;
export function Pill({ tone = "gray", children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone]}`}>{children}</span>;
}
export const orderTone = (s: string): Tone => (s === "CANCELLED" ? "clay" : s === "DRAFT" ? "gray" : s === "NEW" ? "gold" : "green");
export const invoiceTone = (s: string): Tone => (s === "PAID" ? "green" : s === "OVERDUE" ? "clay" : s === "ISSUED" || s === "PARTIALLY_PAID" ? "gold" : "gray");
export const payTone = (s: string): Tone => (s === "PAID" ? "green" : s === "PARTIAL" ? "gold" : "clay");
