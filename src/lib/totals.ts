export type Line = { quantity: number; unitPrice: number; discount: number; vatRate: number };
const c2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export { c2 };

/** Total HT d'une ligne, remise (en MAD) déduite. */
export const lineTotal = (l: Pick<Line, "quantity" | "unitPrice" | "discount">) => c2(l.quantity * l.unitPrice - l.discount);

/** Totaux d'un document : sous-total HT (remises déduites), TVA ligne par ligne, TTC. */
export function totals(lines: Line[]) {
  let subtotal = 0, tax = 0, discount = 0;
  for (const l of lines) { const ht = lineTotal(l); subtotal += ht; tax += (ht * l.vatRate) / 100; discount += l.discount; }
  return { subtotal: c2(subtotal), discountTotal: c2(discount), taxTotal: c2(tax), total: c2(subtotal + tax) };
}
