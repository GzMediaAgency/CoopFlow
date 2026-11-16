import type { ReactNode } from "react";
import { Link } from "@/i18n/routing";

export type DataRow = { id: string; href?: string; title: ReactNode; subtitle?: ReactNode; right?: ReactNode; cells: ReactNode[] };

/** Tableau sur ordinateur, cartes sur mobile : un seul composant pour tous les modules. */
export function DataList({ columns, rows }: { columns: string[]; rows: DataRow[] }) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-line bg-white md:block">
        <table className="w-full text-sm">
          <thead className="bg-field text-ink-muted"><tr>{columns.map((c) => <th key={c} scope="col" className="px-4 py-3 text-start font-medium">{c}</th>)}</tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id} className="border-t border-line hover:bg-field">
              {r.cells.map((cell, i) => <td key={i} className="px-4 py-3">{i === 0 && r.href ? <Link href={r.href} className="font-medium hover:text-canopy">{cell}</Link> : cell}</td>)}
            </tr>))}</tbody>
        </table>
      </div>
      <ul className="grid gap-3 md:hidden">{rows.map((r) => {
        const body = (<><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate font-semibold">{r.title}</p>{r.subtitle && <p className="text-xs text-ink-muted">{r.subtitle}</p>}</div><div className="shrink-0 text-end text-sm font-semibold">{r.right}</div></div></>);
        return <li key={r.id}>{r.href ? <Link href={r.href} className="block rounded-xl border border-line bg-white p-4">{body}</Link> : <div className="rounded-xl border border-line bg-white p-4">{body}</div>}</li>;
      })}</ul>
    </>
  );
}
