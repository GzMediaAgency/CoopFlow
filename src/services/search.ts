import type { requireUser } from "@/lib/auth/session";

type Ctx = Awaited<ReturnType<typeof requireUser>>;

export type SearchItemType =
  | "member"
  | "product"
  | "customer"
  | "order"
  | "invoice"
  | "payment"
  | "production"
  | "document";

export type SearchResultItem = {
  id: string;
  type: SearchItemType;
  title: string;
  subtitle: string;
  href: string;
  badge?: string;
  meta?: string;
};

export type SearchGroupedResults = {
  total: number;
  members: SearchResultItem[];
  products: SearchResultItem[];
  customers: SearchResultItem[];
  orders: SearchResultItem[];
  invoices: SearchResultItem[];
  payments: SearchResultItem[];
  productions: SearchResultItem[];
  documents: SearchResultItem[];
};

// Données de démo Tazrout utilisées comme filet de secours si la base est momentanément inaccessible
const DEMO_ITEMS: SearchResultItem[] = [
  { id: "m-1", type: "member", title: "Fatima Zahra Aït Brahim", subtitle: "Présidente · Groupe Argan", href: "/members", badge: "Actif", meta: "CIN: JA123456" },
  { id: "m-2", type: "member", title: "Khadija Oubella", subtitle: "Trésorière · Groupe Argan", href: "/members", badge: "Actif", meta: "CIN: JB654321" },
  { id: "m-3", type: "member", title: "Brahim Aït Lahcen", subtitle: "Responsable apiculture · Groupe Miel", href: "/members", badge: "Actif" },
  { id: "p-1", type: "product", title: "Huile d'argan alimentaire 250 ml", subtitle: "SKU: ARG-ALI · Huiles & Terroir", href: "/products", badge: "180 MAD" },
  { id: "p-2", type: "product", title: "Huile d'argan cosmétique 100 ml", subtitle: "SKU: ARG-COS · Cosmétique", href: "/products", badge: "140 MAD" },
  { id: "p-3", type: "product", title: "Amlou artisanal amandes & miel 250 g", subtitle: "SKU: AMLOU · Épicerie", href: "/products", badge: "65 MAD" },
  { id: "c-1", type: "customer", title: "Hôtel Palais Salam Taroudant", subtitle: "Client Pro · Taroudant", href: "/customers", badge: "Entreprise" },
  { id: "c-2", type: "customer", title: "Épicerie Fine Casablanca", subtitle: "Client Revendeur · Casablanca", href: "/customers", badge: "Revendeur" },
  { id: "o-1", type: "order", title: "Commande CMD-2026-001", subtitle: "Client : Hôtel Palais Salam", href: "/orders", badge: "Confirmée" },
  { id: "i-1", type: "invoice", title: "Facture FAC-2026-001", subtitle: "Client : Hôtel Palais Salam", href: "/invoices", badge: "Émise" },
  { id: "pr-1", type: "production", title: "Production Huile d'argan (250 L)", subtitle: "Membre : Fatima Zahra Aït Brahim · Lot ARG-2026-0915", href: "/production", badge: "Qualité Extra" },
  { id: "d-1", type: "document", title: "Statuts officiels de la coopérative", subtitle: "Catégorie : Statuts & PV", href: "/documents", badge: "Administratif" },
];

export async function searchGlobal(ctx: Ctx, rawQuery: string): Promise<SearchGroupedResults> {
  const q = rawQuery.trim();
  const empty: SearchGroupedResults = {
    total: 0,
    members: [],
    products: [],
    customers: [],
    orders: [],
    invoices: [],
    payments: [],
    productions: [],
    documents: [],
  };

  if (!q || q.length < 2) return empty;

  try {
    const [members, products, customers, orders, invoices, payments, productions, documents] =
      await Promise.all([
        // 1. Membres
        ctx.db.member.findMany({
          where: {
            deletedAt: null,
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { cin: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
              { memberNumber: { contains: q, mode: "insensitive" } },
              { groupName: { contains: q, mode: "insensitive" } },
            ],
          },
          take: 6,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            memberNumber: true,
            cin: true,
            groupName: true,
            role: true,
            status: true,
          },
        }),

        // 2. Produits
        ctx.db.product.findMany({
          where: {
            deletedAt: null,
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { nameAr: { contains: q, mode: "insensitive" } },
              { sku: { contains: q, mode: "insensitive" } },
            ],
          },
          take: 6,
          include: {
            category: { select: { name: true } },
          },
        }),

        // 3. Clients
        ctx.db.customer.findMany({
          where: {
            deletedAt: null,
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { company: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { ice: { contains: q, mode: "insensitive" } },
            ],
          },
          take: 6,
          select: {
            id: true,
            name: true,
            company: true,
            city: true,
            phone: true,
            type: true,
          },
        }),

        // 4. Commandes
        ctx.db.order.findMany({
          where: {
            OR: [
              { number: { contains: q, mode: "insensitive" } },
              { customer: { name: { contains: q, mode: "insensitive" } } },
            ],
          },
          take: 6,
          include: {
            customer: { select: { name: true } },
          },
        }),

        // 5. Factures
        ctx.db.invoice.findMany({
          where: {
            OR: [
              { number: { contains: q, mode: "insensitive" } },
              { customer: { name: { contains: q, mode: "insensitive" } } },
            ],
          },
          take: 6,
          include: {
            customer: { select: { name: true } },
          },
        }),

        // 6. Paiements
        ctx.db.payment.findMany({
          where: {
            OR: [
              { reference: { contains: q, mode: "insensitive" } },
              { customer: { name: { contains: q, mode: "insensitive" } } },
              {
                member: {
                  OR: [
                    { firstName: { contains: q, mode: "insensitive" } },
                    { lastName: { contains: q, mode: "insensitive" } },
                  ],
                },
              },
            ],
          },
          take: 6,
          include: {
            customer: { select: { name: true } },
            member: { select: { firstName: true, lastName: true } },
          },
        }),

        // 7. Productions
        ctx.db.productionRecord.findMany({
          where: {
            OR: [
              { product: { name: { contains: q, mode: "insensitive" } } },
              { groupName: { contains: q, mode: "insensitive" } },
              { quality: { contains: q, mode: "insensitive" } },
              {
                member: {
                  OR: [
                    { firstName: { contains: q, mode: "insensitive" } },
                    { lastName: { contains: q, mode: "insensitive" } },
                  ],
                },
              },
            ],
          },
          take: 6,
          include: {
            product: { select: { name: true } },
            member: { select: { firstName: true, lastName: true } },
            batch: { select: { batchNumber: true } },
          },
        }),

        // 8. Documents
        ctx.db.document.findMany({
          where: {
            deletedAt: null,
            OR: [
              { name: { contains: q, mode: "insensitive" } },
            ],
          },
          take: 6,
          select: {
            id: true,
            name: true,
            category: true,
          },
        }),
      ]);

    const formattedMembers: SearchResultItem[] = members.map((m) => ({
      id: m.id,
      type: "member",
      title: `${m.firstName} ${m.lastName}`,
      subtitle: [m.role, m.groupName].filter(Boolean).join(" · ") || `Réf: ${m.memberNumber}`,
      href: `/members/${m.id}`,
      badge: m.status,
      meta: m.cin ? `CIN: ${m.cin}` : undefined,
    }));

    const formattedProducts: SearchResultItem[] = products.map((p) => ({
      id: p.id,
      type: "product",
      title: p.name,
      subtitle: `${p.sku}${p.category ? ` · ${p.category.name}` : ""}`,
      href: `/products/${p.id}`,
      badge: `${Number(p.priceRetail)} MAD`,
    }));

    const formattedCustomers: SearchResultItem[] = customers.map((c) => ({
      id: c.id,
      type: "customer",
      title: c.name,
      subtitle: [c.company, c.city].filter(Boolean).join(" · ") || c.phone || "Client",
      href: `/customers/${c.id}`,
      badge: c.type,
    }));

    const formattedOrders: SearchResultItem[] = orders.map((o) => ({
      id: o.id,
      type: "order",
      title: `Commande ${o.number}`,
      subtitle: `Client : ${o.customer.name}`,
      href: `/orders/${o.id}`,
      badge: `${Number(o.total)} MAD`,
    }));

    const formattedInvoices: SearchResultItem[] = invoices.map((i) => ({
      id: i.id,
      type: "invoice",
      title: `Facture ${i.number}`,
      subtitle: `Client : ${i.customer.name}`,
      href: `/invoices/${i.id}`,
      badge: `${Number(i.total)} MAD`,
    }));

    const formattedPayments: SearchResultItem[] = payments.map((p) => {
      const party = p.customer?.name ?? (p.member ? `${p.member.firstName} ${p.member.lastName}` : "Tiers");
      return {
        id: p.id,
        type: "payment",
        title: `Paiement ${Number(p.amount)} MAD`,
        subtitle: `${party}${p.reference ? ` · Réf: ${p.reference}` : ""}`,
        href: `/payments`,
        badge: p.method,
      };
    });

    const formattedProductions: SearchResultItem[] = productions.map((pr) => {
      const memberName = pr.member ? `${pr.member.firstName} ${pr.member.lastName}` : pr.groupName ?? "Coopérative";
      return {
        id: pr.id,
        type: "production",
        title: `${pr.product.name} (${Number(pr.quantity)} ${pr.unit})`,
        subtitle: `${memberName}${pr.batch ? ` · Lot: ${pr.batch.batchNumber}` : ""}`,
        href: `/production/${pr.id}`,
        badge: pr.quality ?? undefined,
      };
    });

    const formattedDocuments: SearchResultItem[] = documents.map((d) => ({
      id: d.id,
      type: "document",
      title: d.name,
      subtitle: `Catégorie : ${d.category}`,
      href: `/documents`,
      badge: d.category,
    }));

    const total =
      formattedMembers.length +
      formattedProducts.length +
      formattedCustomers.length +
      formattedOrders.length +
      formattedInvoices.length +
      formattedPayments.length +
      formattedProductions.length +
      formattedDocuments.length;

    return {
      total,
      members: formattedMembers,
      products: formattedProducts,
      customers: formattedCustomers,
      orders: formattedOrders,
      invoices: formattedInvoices,
      payments: formattedPayments,
      productions: formattedProductions,
      documents: formattedDocuments,
    };
  } catch {
    // Si la DB est déconnectée en local, recherche dans le jeu de démo
    const lower = q.toLowerCase();
    const filtered = DEMO_ITEMS.filter(
      (item) =>
        item.title.toLowerCase().includes(lower) ||
        item.subtitle.toLowerCase().includes(lower) ||
        (item.meta && item.meta.toLowerCase().includes(lower))
    );

    return {
      total: filtered.length,
      members: filtered.filter((i) => i.type === "member"),
      products: filtered.filter((i) => i.type === "product"),
      customers: filtered.filter((i) => i.type === "customer"),
      orders: filtered.filter((i) => i.type === "order"),
      invoices: filtered.filter((i) => i.type === "invoice"),
      payments: filtered.filter((i) => i.type === "payment"),
      productions: filtered.filter((i) => i.type === "production"),
      documents: filtered.filter((i) => i.type === "document"),
    };
  }
}

