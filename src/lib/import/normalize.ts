/** minuscules, sans accents ni ponctuation : sert à reconnaître « Prénom », « PRENOM », « prenom » comme la même colonne. */
export const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, " ").trim();

/** 25/12/2024, 25-12-24 ou 2024-12-25 → 2024-12-25 (autre texte renvoyé tel quel, la validation le refusera). */
export function isoDate(v: string) {
  const s = v.trim();
  let m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) { const y = m[3]!.length === 2 ? (Number(m[3]) > 50 ? "19" : "20") + m[3] : m[3]!; return `${y}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`; }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : s;
}
/** « 1 250,50 » ou « 20 % » → « 1250.50 » / « 20 » */
export const numStr = (v: string) => v.replace(/[\s\u00a0]/g, "").replace("%", "").replace(",", ".");
export const mapEnum = (map: Record<string, string>, v: string) => map[norm(v)] ?? v.trim().toUpperCase();
