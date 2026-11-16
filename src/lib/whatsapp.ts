/** 06 12 34 56 78 / +212612345678 / 00212… → 212612345678 (format international sans « + »), ou null si invalide. */
export function toWaNumber(phone?: string | null) {
  if (!phone) return null;
  let d = phone.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1); else if (d.startsWith("00")) d = d.slice(2); else if (d.startsWith("0")) d = `212${d.slice(1)}`;
  return /^\d{8,15}$/.test(d) ? d : null;
}
