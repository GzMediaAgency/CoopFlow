const tag = (locale: string) => (locale === "ar" ? "ar-MA" : "fr-MA");
export const money = (n: unknown, locale: string) =>
  new Intl.NumberFormat(tag(locale), { style: "currency", currency: "MAD", maximumFractionDigits: 0 }).format(Number(n ?? 0));
export const dateFmt = (d: Date | null | undefined, locale: string) =>
  d ? new Intl.DateTimeFormat(tag(locale), { dateStyle: "medium" }).format(d) : "—";
