import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function EmptyState({ icon: Icon, title, text, children }: { icon: LucideIcon; title: string; text: string; children?: ReactNode }) {
  return (
    <div className="grid place-items-center gap-3 rounded-xl border border-dashed border-line bg-white px-6 py-14 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-canopy-soft text-canopy"><Icon size={26} aria-hidden /></span>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-md text-sm text-ink-muted">{text}</p>
      {children}
    </div>
  );
}
