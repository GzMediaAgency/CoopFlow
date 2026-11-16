"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { IMPORT_META, type ImportEntity } from "@/lib/import/meta";
import { norm } from "@/lib/import/normalize";
import type { ValidateResult } from "@/services/import";
import { commitImportAction, validateImportAction } from "./actions";

const cell = (v: unknown) => (v instanceof Date ? `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}` : v == null ? "" : String(v).trim());

async function readFile(file: File): Promise<string[][]> {
  if (/\.xlsx$/i.test(file.name)) { const { default: readXlsx } = await import("read-excel-file"); return (await readXlsx(file)).map((r) => r.map(cell)); }
  const buf = await file.arrayBuffer();
  let text: string;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(buf); } catch { text = new TextDecoder("windows-1252").decode(buf); } // CSV d'Excel français
  const Papa = (await import("papaparse")).default;
  return (Papa.parse<string[]>(text.replace(/^\uFEFF/, ""), { skipEmptyLines: true }).data).map((r) => r.map(cell));
}

export function ImportWizard({ entities }: { entities: ImportEntity[] }) {
  const t = useTranslations(), [pending, start] = useTransition();
  const [entity, setEntity] = useState<ImportEntity>(entities[0]!);
  const [fileName, setFileName] = useState(""), [headers, setHeaders] = useState<string[]>([]), [data, setData] = useState<string[][]>([]);
  const [map, setMap] = useState<Record<string, number>>({});
  const [res, setRes] = useState<ValidateResult | null>(null), [done, setDone] = useState<{ imported: number; skipped: number } | null>(null), [err, setErr] = useState(""), [skip, setSkip] = useState(false);
  const fields = IMPORT_META[entity].fields;
  const label = (e: ImportEntity, k: string) => t(`importFields.${e}.${k}`);

  const autoMap = (e: ImportEntity, hs: string[]) => Object.fromEntries(IMPORT_META[e].fields.map((f) => {
    const wanted = [f.key, ...f.aliases].map(norm); return [f.key, hs.findIndex((h) => wanted.includes(norm(h)))];
  }));
  const reset = () => { setRes(null); setDone(null); setErr(""); setSkip(false); };

  async function onFile(f?: File) {
    reset(); if (!f) return;
    if (f.size > 5 * 1024 * 1024) return setErr("fileTooBig");
    try {
      const rows = await readFile(f);
      if (rows.length < 2) return setErr("emptyImport");
      setFileName(f.name); setHeaders(rows[0]!); setData(rows.slice(1).filter((r) => r.some((c) => c !== ""))); setMap(autoMap(entity, rows[0]!));
    } catch { setErr("unreadableFile"); }
  }
  const rowsToSend = () => data.map((cells, i) => ({ line: i + 2, values: Object.fromEntries(fields.filter((f) => (map[f.key] ?? -1) >= 0).map((f) => [f.key, cells[map[f.key]!] ?? ""])) }));
  const missing = fields.filter((f) => f.required && (map[f.key] ?? -1) < 0);

  const verify = () => start(async () => { reset(); const r = await validateImportAction(entity, rowsToSend()); if ("error" in r) setErr(r.error); else setRes(r); });
  const run = () => start(async () => { setErr(""); const r = await commitImportAction(entity, rowsToSend(), skip); if ("error" in r) setErr(r.error); else { setDone(r); setRes(null); } });
  const template = () => {
    const csv = "\uFEFF" + fields.map((f) => f.aliases[0]).join(";") + "\r\n";
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); a.download = `modele-${entity}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };
  const box = "rounded-lg border border-line bg-white p-2.5 text-sm";

  return (
    <div className="grid max-w-4xl gap-5">
      {err && <p role="alert" className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{t(`errors.${err}`)}</p>}
      {done ? (
        <section className="card p-6"><p className="font-display text-xl font-bold text-canopy">{t("importer.done", { count: done.imported })}</p>{done.skipped > 0 && <p className="mt-1 text-sm text-ink-muted">{t("importer.skipped", { count: done.skipped })}</p>}
          <div className="mt-4 flex gap-3"><Link href={IMPORT_META[entity].listHref} className="rounded-lg bg-canopy px-5 py-3 font-semibold text-white">{t("importer.openList")}</Link><button onClick={() => { reset(); setHeaders([]); setData([]); setFileName(""); }} className="rounded-lg border border-line px-5 py-3">{t("importer.again")}</button></div></section>
      ) : (<>
        <section className="card grid gap-4 p-4 sm:grid-cols-2 lg:p-6">
          <label className="grid gap-1 text-sm font-medium">{t("importer.what")}
            <select value={entity} onChange={(e) => { const v = e.target.value as ImportEntity; setEntity(v); reset(); if (headers.length) setMap(autoMap(v, headers)); }} className={box}>{entities.map((e) => <option key={e} value={e}>{t(`importer.entities.${e}`)}</option>)}</select></label>
          <div className="grid gap-1 text-sm font-medium"><span>{t("importer.file")}</span><input type="file" accept=".csv,.xlsx" onChange={(e) => onFile(e.target.files?.[0])} className={box} /></div>
          <p className="text-sm text-ink-muted sm:col-span-2">{t("importer.hint", { max: 1000 })} <button type="button" onClick={template} className="font-medium text-canopy underline">{t("importer.template")}</button></p>
        </section>

        {headers.length > 0 && (<>
          <section className="card p-4 lg:p-6"><h2 className="mb-1 font-semibold">{t("importer.mapping")}</h2><p className="mb-3 text-sm text-ink-muted">{fileName} · {t("importer.rows", { count: data.length })}</p>
            <div className="grid gap-3 sm:grid-cols-2">{fields.map((f) => (
              <label key={f.key} className="grid gap-1 text-sm font-medium"><span>{label(entity, f.key)}{f.required && <span className="text-danger"> *</span>}</span>
                <select value={map[f.key] ?? -1} onChange={(e) => { setMap({ ...map, [f.key]: Number(e.target.value) }); setRes(null); }} className={box}><option value={-1}>{t("importer.ignore")}</option>{headers.map((h, i) => <option key={i} value={i}>{h || `#${i + 1}`}</option>)}</select></label>))}</div>
            {missing.length > 0 && <p role="alert" className="mt-3 text-sm text-danger">{t("importer.missing", { fields: missing.map((f) => label(entity, f.key)).join(", ") })}</p>}
          </section>
          <section className="card overflow-x-auto p-4 lg:p-6"><h2 className="mb-2 font-semibold">{t("importer.preview")}</h2>
            <table className="w-full text-xs"><thead className="text-ink-muted"><tr>{headers.map((h, i) => <th key={i} className="px-2 py-1 text-start font-medium">{h}</th>)}</tr></thead>
              <tbody>{data.slice(0, 5).map((r, i) => <tr key={i} className="border-t border-line">{headers.map((_, j) => <td key={j} className="px-2 py-1">{r[j]}</td>)}</tr>)}</tbody></table></section>
          <div><button onClick={verify} disabled={pending || missing.length > 0} className="rounded-lg bg-canopy px-5 py-3 font-semibold text-white disabled:opacity-50">{pending ? "…" : t("importer.verify")}</button></div>
        </>)}

        {res && (
          <section className="card p-4 lg:p-6">
            <p className="font-semibold"><span className="text-canopy">{t("importer.valid", { count: res.valid })}</span> · <span className={res.errors.length ? "text-clay" : ""}>{t("importer.invalid", { count: res.total - res.valid })}</span></p>
            {res.errors.length > 0 && (<ul className="mt-3 max-h-72 divide-y divide-line overflow-y-auto text-sm">{res.errors.map((e, i) => (
              <li key={i} className="flex flex-wrap justify-between gap-2 py-1.5"><span>{t("importer.line", { line: e.line })}{e.field && ` · ${fields.some((f) => f.key === e.field) ? label(entity, e.field) : e.field}`}</span><span className="text-clay">{t(`validation.${e.code}`)}</span></li>))}</ul>)}
            {res.truncated && <p className="mt-2 text-xs text-ink-muted">{t("importer.truncated")}</p>}
            {res.errors.length > 0 && res.valid > 0 && <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={skip} onChange={(e) => setSkip(e.target.checked)} className="size-4 accent-[var(--color-canopy)]" />{t("importer.skipErrors")}</label>}
            <button onClick={run} disabled={pending || res.valid === 0 || (res.errors.length > 0 && !skip)} className="mt-4 rounded-lg bg-canopy px-5 py-3 font-semibold text-white disabled:opacity-50">{pending ? "…" : t("importer.run", { count: res.valid })}</button>
          </section>)}
      </>)}
    </div>
  );
}
