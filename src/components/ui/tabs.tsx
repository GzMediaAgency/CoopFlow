import { Link } from "@/i18n/routing";

export function Tabs({ items, current }: { items: { href: string; label: string; key: string }[]; current: string }) {
  return (
    <nav className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-line bg-white p-1" aria-label="Sections">
      {items.map((i) => (
        <Link key={i.key} href={i.href} aria-current={i.key === current ? "page" : undefined}
          className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium ${i.key === current ? "bg-forest text-white" : "text-ink-muted hover:bg-canopy-soft"}`}>{i.label}</Link>
      ))}
    </nav>
  );
}
