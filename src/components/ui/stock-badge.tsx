const TONES = { ok: "bg-canopy-soft text-canopy", low: "bg-argan-soft text-gold-deep", out: "bg-clay/10 text-clay" } as const;
export function StockBadge({ state, label }: { state: keyof typeof TONES; label: string }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[state]}`}>{label}</span>;
}
