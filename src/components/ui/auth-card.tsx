import type { ReactNode } from "react";
import { Sprout } from "lucide-react";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <main className="mx-auto grid min-h-dvh max-w-md content-center gap-5 p-6">
      <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-forest text-argan"><Sprout size={22} aria-hidden /></span><span className="font-display text-2xl font-bold text-forest">CoopFlow</span></div>
      <div><h1 className="text-2xl font-bold">{title}</h1>{subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}</div>
      {children}
    </main>
  );
}
