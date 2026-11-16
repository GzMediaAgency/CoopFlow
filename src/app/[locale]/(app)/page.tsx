import { AlertTriangle, Banknote, ClipboardList, HandCoins, Package, Users, Wallet, type LucideIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/session";
import { dateFmt, money } from "@/lib/format";
import { refreshOverdue } from "@/services/invoices";
import { SalesChart } from "@/components/dashboard/sales-chart";

const TINT = {
  canopy: "bg-canopy/10 text-canopy", argan: "bg-argan/25 text-gold-deep", sky: "bg-sky/10 text-sky", clay: "bg-clay/10 text-clay",
} as const;

export default async function Dashboard() {
  const t = await getTranslations(), locale = await getLocale();
  const ctx = await requirePermission("dashboard:read"), { db } = ctx;
  await refreshOverdue(ctx); // les factures échues passent « En retard »
  const now = new Date(), monthStart = new Date(now.getFullYear(), now.getMonth(), 1), since = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  // Toutes ces requêtes sont automatiquement filtrées sur la coopérative de l'utilisateur.
  const [revenue, orders, products, members, invoices, sales, stock, recentOrders, recentPayments, overdue, lateContribs] = await Promise.all([
    db.sale.aggregate({ _sum: { total: true }, where: { soldAt: { gte: monthStart }, status: "COMPLETED" } }),
    db.order.count({ where: { orderedAt: { gte: monthStart }, status: { not: "CANCELLED" } } }),
    db.product.count({ where: { isActive: true, deletedAt: null } }),
    db.member.count({ where: { status: "ACTIVE", deletedAt: null } }),
    db.invoice.aggregate({ _sum: { total: true, amountPaid: true }, where: { status: { in: ["ISSUED", "PARTIALLY_PAID", "OVERDUE"] } } }),
    db.sale.findMany({ where: { soldAt: { gte: since }, status: "COMPLETED" }, select: { soldAt: true, total: true } }),
    db.inventory.findMany({ include: { product: { select: { name: true, stockMin: true } } } }),
    db.order.findMany({ orderBy: { orderedAt: "desc" }, take: 5, include: { customer: { select: { name: true } } } }),
    db.payment.findMany({ where: { status: "COMPLETED", direction: "IN" }, orderBy: { paidAt: "desc" }, take: 5, include: { customer: { select: { name: true } }, member: { select: { firstName: true, lastName: true } } } }),
    db.invoice.count({ where: { status: "OVERDUE" } }),
    db.contribution.count({ where: { deletedAt: null, paidAt: null, dueDate: { lt: now } } }),
  ]);

  const receivables = Number(invoices._sum.total ?? 0) - Number(invoices._sum.amountPaid ?? 0);
  const months = Array.from({ length: 6 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - 5 + i, 1));
  const chart = months.map((m) => ({
    label: new Intl.DateTimeFormat(locale === "ar" ? "ar-MA" : "fr-MA", { month: "short" }).format(m),
    total: Math.round(sales.filter((s) => s.soldAt.getFullYear() === m.getFullYear() && s.soldAt.getMonth() === m.getMonth()).reduce((a, s) => a + Number(s.total), 0)),
  }));
  const out = stock.filter((s) => Number(s.quantity) <= 0), low = stock.filter((s) => Number(s.quantity) > 0 && Number(s.quantity) <= Number(s.product.stockMin));

  const kpis: [string, string, LucideIcon, keyof typeof TINT][] = [
    [t("dashboard.revenue"), money(revenue._sum.total, locale), Banknote, "canopy"],
    [t("dashboard.orders"), String(orders), ClipboardList, "sky"],
    [t("dashboard.products"), String(products), Package, "argan"],
    [t("dashboard.members"), String(members), Users, "canopy"],
    [t("dashboard.receivables"), money(receivables, locale), Wallet, "clay"],
  ];
  const alerts: [string, string][] = [
    ...out.map((s): [string, string] => ["🔴", t("dashboard.outOfStock", { name: s.product.name })]),
    ...low.map((s): [string, string] => ["⚠️", t("dashboard.lowStock", { name: s.product.name, qty: Number(s.quantity) })]),
    ...(overdue ? [["💰", t("dashboard.overdueInvoices", { count: overdue })] as [string, string]] : []),
    ...(lateContribs ? [["⏰", t("dashboard.lateContributions", { count: lateContribs })] as [string, string]] : []),
  ];

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold lg:text-3xl">{t("dashboard.welcome")}</h1><p className="mt-1 text-ink-muted">{t("brand.tagline")}</p></div>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {kpis.map(([label, value, Icon, tint]) => (
          <div key={label} className="card p-4 lg:p-5">
            <span className={`grid size-10 place-items-center rounded-xl ${TINT[tint]}`}><Icon size={20} aria-hidden /></span>
            <dt className="mt-3 text-sm text-ink-muted">{label}</dt>
            <dd className="font-display mt-0.5 text-2xl font-bold">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2"><h2 className="mb-3 font-semibold">{t("dashboard.salesTrend")}</h2><SalesChart data={chart} currency={t("currency")} /></section>
        <section className="card p-5"><h2 className="mb-3 flex items-center gap-2 font-semibold"><AlertTriangle size={18} className="text-gold-deep" aria-hidden />{t("dashboard.alerts")}</h2>
          {alerts.length === 0 ? <p className="text-sm text-ink-muted">{t("dashboard.noAlerts")}</p> :
            <ul className="space-y-2.5 text-sm">{alerts.map(([icon, text], i) => <li key={i} className="flex gap-2 rounded-lg bg-field p-2.5"><span aria-hidden>{icon}</span>{text}</li>)}</ul>}</section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5"><h2 className="mb-3 font-semibold">{t("dashboard.recentOrders")}</h2>
          {recentOrders.length === 0 ? <p className="text-sm text-ink-muted">{t("dashboard.noData")}</p> :
            <ul className="divide-y divide-line text-sm">{recentOrders.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 py-2.5"><div className="min-w-0"><p className="truncate font-medium">{o.number} · {o.customer.name}</p><p className="text-xs text-ink-muted">{dateFmt(o.orderedAt, locale)} · {t(`orderStatus.${o.status}`)}</p></div><span className="font-semibold">{money(o.total, locale)}</span></li>))}</ul>}</section>
        <section className="card p-5"><h2 className="mb-3 flex items-center gap-2 font-semibold"><HandCoins size={18} className="text-canopy" aria-hidden />{t("dashboard.recentPayments")}</h2>
          {recentPayments.length === 0 ? <p className="text-sm text-ink-muted">{t("dashboard.noData")}</p> :
            <ul className="divide-y divide-line text-sm">{recentPayments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2.5"><div className="min-w-0"><p className="truncate font-medium">{p.customer?.name ?? (p.member ? `${p.member.firstName} ${p.member.lastName}` : "—")}</p><p className="text-xs text-ink-muted">{dateFmt(p.paidAt, locale)}</p></div><span className="font-semibold text-canopy">+ {money(p.amount, locale)}</span></li>))}</ul>}</section>
      </div>
    </div>
  );
}
