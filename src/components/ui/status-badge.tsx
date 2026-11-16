const TONES: Record<string, string> = {
  ACTIVE: "bg-canopy-soft text-canopy", INACTIVE: "bg-gray-100 text-gray-600",
  SUSPENDED: "bg-amber-100 text-amber-800", LEFT: "bg-red-100 text-red-800",
};
export function StatusBadge({ status, label }: { status: string; label: string }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[status] ?? TONES.INACTIVE}`}>{label}</span>;
}
