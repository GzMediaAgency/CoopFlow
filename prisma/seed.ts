/**
 * Seed de démonstration : « Coopérative Tazrout » (produits du terroir).
 * Usage : npm run db:seed   (idempotent : la coopérative de démo est recréée à chaque fois)
 *
 * - Si NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY sont définis, les comptes de connexion
 *   sont créés dans Supabase Auth avec le mot de passe SEED_PASSWORD (généré et affiché s'il est absent).
 * - Sinon les utilisateurs sont créés sans authId : à rattacher manuellement.
 */
import { PrismaClient, type SystemRole, type CustomerType, type PriceTier, type Unit, type ExpenseCategory, type PaymentMethod } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { randomBytes, randomUUID } from "node:crypto";
import { DEFAULT_PERMISSIONS, MODULES } from "../src/lib/auth/permissions";

const prisma = new PrismaClient();
if (process.env.NODE_ENV === "production" && !process.env.SEED_FORCE) throw new Error("Seed refusé en production (SEED_FORCE=1 pour forcer).");

// ---------- utilitaires (PRNG déterministe : mêmes données à chaque exécution) ----------
let seed = 20260930;
const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const int = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
const pick = <T,>(a: readonly T[]): T => a[int(0, a.length - 1)]!;
const daysAgo = (n: number) => new Date(Date.now() - n * 864e5);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 864e5);
const r2 = (n: number) => Math.round(n * 100) / 100;
const pad = (n: number, w = 3) => String(n).padStart(w, "0");
const ymd = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1, 2)}${pad(d.getDate(), 2)}`;
const phone = () => `0${pick([6, 7])}${int(10000000, 99999999)}`;
const year = new Date().getFullYear();

async function wipe() {
  const org = await prisma.organization.findUnique({ where: { slug: "tazrout" } });
  if (!org) return;
  const o = { organizationId: org.id };
  await prisma.payment.deleteMany({ where: o });
  await prisma.invoiceItem.deleteMany({ where: { invoice: o } });
  await prisma.invoice.deleteMany({ where: o });
  await prisma.inventoryMovement.deleteMany({ where: o });
  await prisma.saleItem.deleteMany({ where: { sale: o } });
  await prisma.sale.deleteMany({ where: o });
  await prisma.orderItem.deleteMany({ where: { order: o } });
  await prisma.order.deleteMany({ where: o });
  await prisma.inventoryCount.deleteMany({ where: o });
  await prisma.productionRecord.deleteMany({ where: o });
  await prisma.productionBatch.deleteMany({ where: o });
  await prisma.inventory.deleteMany({ where: o });
  await prisma.expense.deleteMany({ where: o });
  await prisma.contribution.deleteMany({ where: o });
  await prisma.memberShare.deleteMany({ where: o });
  for (const m of ["document", "notification", "auditLog", "product", "category", "supplier", "customer", "member", "subscription", "user", "role"] as const) {
    await (prisma[m] as unknown as { deleteMany: (a: object) => Promise<unknown> }).deleteMany({ where: o });
  }
  await prisma.organization.delete({ where: { id: org.id } });
}

async function ensureAuth(email: string, password: string): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const admin = createClient(url, key, { auth: { persistSession: false } }).auth.admin;
  const created = await admin.createUser({ email, password, email_confirm: true });
  if (created.data.user) return created.data.user.id;
  const list = await admin.listUsers({ perPage: 1000 });
  return list.data.users.find((u) => u.email === email)?.id ?? null;
}

// ---------- données de référence ----------
const MEMBERS = [
  ["Fatima Zahra", "Aït Brahim", "Présidente", "Groupe Argan"], ["Khadija", "Oubella", "Trésorière", "Groupe Argan"],
  ["Aïcha", "Ouhmad", "Secrétaire", "Groupe Argan"], ["Zahra", "Lahcen", null, "Groupe Argan"],
  ["Latifa", "Ben Ali", null, "Groupe Argan"], ["Hafida", "Amghar", null, "Groupe Argan"],
  ["Naïma", "Id Said", null, "Groupe Artisanat"], ["Malika", "Oulhaj", null, "Groupe Artisanat"],
  ["Rachida", "Taoussi", null, "Groupe Artisanat"], ["Amina", "Bouchta", null, "Groupe Artisanat"],
  ["Brahim", "Aït Lahcen", "Responsable apiculture", "Groupe Miel"], ["Hassan", "Ouaziz", null, "Groupe Miel"],
  ["Lahcen", "Izem", null, "Groupe Miel"], ["Saïd", "Benhammou", null, "Groupe Miel"], ["Mohamed", "Ouzzine", null, "Groupe Miel"],
] as const;

type P = { sku: string; ar: string; name: string; cat: string; unit: Unit; cost: number; price: number; shelf: number | null; pre: string; group: string; qty: [number, number] };
const PRODUCTS: P[] = [
  { sku: "ARG-ALI", ar: "زيت أركان غذائي", name: "Huile d'argan alimentaire 250 ml", cat: "Huiles", unit: "UNIT", cost: 110, price: 180, shelf: null, pre: "ARG", group: "Groupe Argan", qty: [40, 90] },
  { sku: "ARG-COS", ar: "زيت أركان تجميلي", name: "Huile d'argan cosmétique 100 ml", cat: "Cosmétique naturelle", unit: "UNIT", cost: 85, price: 140, shelf: null, pre: "ARC", group: "Groupe Argan", qty: [30, 70] },
  { sku: "AMLOU", ar: "أملو", name: "Amlou 250 g", cat: "Épicerie", unit: "UNIT", cost: 38, price: 65, shelf: 365, pre: "AML", group: "Groupe Argan", qty: [60, 120] },
  { sku: "MIEL-THY", ar: "عسل الزعتر", name: "Miel de thym 500 g", cat: "Produits apicoles", unit: "UNIT", cost: 55, price: 90, shelf: null, pre: "MTH", group: "Groupe Miel", qty: [50, 100] },
  { sku: "MIEL-EUP", ar: "عسل الفرنان", name: "Miel d'euphorbe 500 g", cat: "Produits apicoles", unit: "UNIT", cost: 95, price: 150, shelf: null, pre: "MEU", group: "Groupe Miel", qty: [30, 60] },
  { sku: "COUSCOUS", ar: "كسكس الشعير", name: "Couscous d'orge (kg)", cat: "Épicerie", unit: "KG", cost: 17, price: 28, shelf: 540, pre: "CSC", group: "Groupe Artisanat", qty: [150, 300] },
  { sku: "SAVON-N", ar: "صابون بلدي", name: "Savon noir beldi", cat: "Cosmétique naturelle", unit: "UNIT", cost: 18, price: 35, shelf: null, pre: "SVN", group: "Groupe Artisanat", qty: [80, 160] },
  { sku: "EAU-ROSE", ar: "ماء الورد", name: "Eau de rose 250 ml", cat: "Cosmétique naturelle", unit: "UNIT", cost: 25, price: 45, shelf: 130, pre: "ERO", group: "Groupe Artisanat", qty: [50, 100] },
  { sku: "TAGINE", ar: "طاجين فخار", name: "Tajine en poterie", cat: "Artisanat", unit: "UNIT", cost: 70, price: 120, shelf: null, pre: "TAJ", group: "Groupe Artisanat", qty: [25, 50] },
  { sku: "PANIER", ar: "قفة مضفورة", name: "Panier tressé", cat: "Artisanat", unit: "UNIT", cost: 50, price: 85, shelf: null, pre: "PAN", group: "Groupe Artisanat", qty: [20, 40] },
];

const CUSTOMERS: [string, string | null, CustomerType][] = [
  ["Riad Dar Atlas", "Riad Dar Atlas SARL", "HOTEL"], ["Restaurant Le Souss", "Le Souss Restauration", "RESTAURANT"],
  ["Épicerie Fine Agadir", "Gourmet Souss SARL", "RESELLER"], ["Nadia Bennani", null, "INDIVIDUAL"],
  ["Maison Atlas Export", "Atlas Export SA", "EXPORTER"], ["Grossiste Ait Melloul", "Bio Distribution", "WHOLESALER"],
  ["Youssef El Fassi", null, "INDIVIDUAL"], ["Hôtel Palmeraie Taroudant", "Palmeraie Hospitality", "COMPANY"],
];
const tierOf = (t: CustomerType): PriceTier => (t === "INDIVIDUAL" ? "RETAIL" : ["COMPANY", "RESTAURANT", "HOTEL"].includes(t) ? "PROFESSIONAL" : "RESELLER");
const TIER_MULT: Record<PriceTier, number> = { RETAIL: 1, PROFESSIONAL: 0.9, RESELLER: 0.8, MEMBER: 0.95 };
const QTY_MULT: Record<PriceTier, number> = { RETAIL: 1, PROFESSIONAL: 2, RESELLER: 4, MEMBER: 1 };

const SUPPLIERS = [
  ["Verrerie Souss", "Flacons et bouteilles en verre"], ["Imprimerie Al Amal", "Étiquettes et emballages"],
  ["Transports Chtouka", "Transport de marchandises"], ["Amandes du Sud", "Amandes et matières premières"], ["Cartonnerie Agadir", "Cartons d'expédition"],
] as const;

// ---------- seed ----------
async function main() {
  await wipe();
  const password = process.env.SEED_PASSWORD ?? randomBytes(9).toString("base64url");

  // Plans
  for (const [code, name, price, users, members] of [["STARTER", "Starter", 149, 3, 50], ["PROFESSIONAL", "Professional", 299, 10, 300], ["BUSINESS", "Business", 599, 50, null]] as const) {
    await prisma.subscriptionPlan.upsert({ where: { code }, update: {}, create: { code, name, priceMonthly: price, maxUsers: users, maxMembers: members, features: { whatsapp: code !== "STARTER", automations: code === "BUSINESS" } } });
  }
  // Permissions globales
  const actions = ["read", "write", "delete", "validate", "export"];
  await prisma.permission.createMany({ data: MODULES.flatMap((m) => actions.map((a) => ({ code: `${m}:${a}`, module: m }))), skipDuplicates: true });
  const perms = new Map((await prisma.permission.findMany()).map((p) => [p.code, p.id]));

  // Coopérative
  const org = await prisma.organization.create({ data: {
    name: "Coopérative Tazrout", slug: "tazrout", type: "TERROIR", sector: "TERROIR", foundedAt: new Date("2016-03-12"),
    address: "Douar Tazrout, route de Taroudant", city: "Taroudant", region: "Souss-Massa", phone: "0528000000", email: "contact@tazrout.demo",
    ice: "000000000000000", taxId: "00000000", registrationNumber: "DEMO-0001", description: "Coopérative de démonstration : argan, miel, amlou, couscous et artisanat.",
    isDemo: true, onboardingStep: 6, onboardedAt: new Date(),
  } });
  const organizationId = org.id;
  const plan = await prisma.subscriptionPlan.findUniqueOrThrow({ where: { code: "PROFESSIONAL" } });
  await prisma.subscription.create({ data: { organizationId, planId: plan.id, status: "ACTIVE", currentPeriodStart: daysAgo(10), currentPeriodEnd: addDays(new Date(), 20) } });

  // Rôles
  const ROLE_NAMES: Partial<Record<SystemRole, string>> = { ADMIN: "Administrateur", PRESIDENT: "Président / Directeur", MANAGER: "Responsable", ACCOUNTANT: "Comptable", STOCK_MANAGER: "Responsable stock", AGENT: "Agent" };
  const roleId = {} as Record<string, string>;
  for (const [code, name] of Object.entries(ROLE_NAMES) as [SystemRole, string][]) {
    const r = await prisma.role.create({ data: { organizationId, code, name, isSystem: true } });
    roleId[code] = r.id;
    await prisma.rolePermission.createMany({ data: DEFAULT_PERMISSIONS[code].map((c) => ({ roleId: r.id, permissionId: perms.get(c)! })) });
  }

  // Utilisateurs (1 super admin + 3 utilisateurs de la coopérative)
  const USERS = [
    { email: "admin@coopflow.ma", fullName: "Super Admin CoopFlow", role: null, superAdmin: true },
    { email: "admin@tazrout.demo", fullName: "Hassan Ouaziz", role: "ADMIN", superAdmin: false },
    { email: "comptable@tazrout.demo", fullName: "Latifa Ben Ali", role: "ACCOUNTANT", superAdmin: false },
    { email: "stock@tazrout.demo", fullName: "Saïd Benhammou", role: "STOCK_MANAGER", superAdmin: false },
  ] as const;
  for (const u of USERS) {
    const authId = await ensureAuth(u.email, password);
    const data = { fullName: u.fullName, authId, isSuperAdmin: u.superAdmin, organizationId: u.superAdmin ? null : organizationId, roleId: u.role ? roleId[u.role]! : null };
    await prisma.user.upsert({ where: { email: u.email }, update: data, create: { email: u.email, ...data } });
  }
  const accountant = await prisma.user.findUniqueOrThrow({ where: { email: "comptable@tazrout.demo" } });

  // Membres, parts, cotisations
  const members = MEMBERS.map(([firstName, lastName, role, groupName], i) => ({
    id: randomUUID(), organizationId, memberNumber: `M-${pad(i + 1)}`, firstName, lastName, role, groupName,
    cin: `${pick(["JB", "JA", "JH", "JK"])}${int(100000, 999999)}`, phone: phone(), city: "Taroudant", address: "Douar Tazrout",
    birthDate: new Date(int(1965, 1995), int(0, 11), int(1, 28)), joinedAt: daysAgo(int(200, 2500)),
    status: i === 13 ? "INACTIVE" as const : i === 14 ? "SUSPENDED" as const : "ACTIVE" as const,
  }));
  await prisma.member.createMany({ data: members });
  await prisma.memberShare.createMany({ data: members.map((m) => ({ organizationId, memberId: m.id, sharesCount: int(1, 5), shareValue: 100, subscribedAt: m.joinedAt })) });
  const contributions = members.map((m, i) => {
    const late = i >= 12; // 3 cotisations en retard
    return { id: randomUUID(), organizationId, memberId: m.id, type: "MEMBERSHIP" as const, amountDue: 200, amountPaid: late ? 0 : 200,
      dueDate: new Date(year, 0, 31), paidAt: late ? null : new Date(year, 0, int(5, 28)), method: late ? null : pick<PaymentMethod>(["CASH", "BANK_TRANSFER"]), createdById: accountant.id };
  });
  await prisma.contribution.createMany({ data: contributions });

  // Catalogue
  const catNames = [...new Set(PRODUCTS.map((p) => p.cat))];
  const cats = catNames.map((name) => ({ id: randomUUID(), organizationId, name }));
  await prisma.category.createMany({ data: cats });
  const suppliers = SUPPLIERS.map(([name, notes]) => ({ id: randomUUID(), organizationId, name, company: name, notes, phone: phone() }));
  await prisma.supplier.createMany({ data: suppliers });
  const products = PRODUCTS.map((p) => ({
    ...p, id: randomUUID(), stock: 0, reserved: 0, stockMin: Math.round(p.qty[0] / 3),
    categoryId: cats.find((c) => c.name === p.cat)!.id, supplierId: suppliers[int(0, 4)]!.id,
  }));
  await prisma.product.createMany({ data: products.map((p) => ({
    id: p.id, organizationId, name: p.name, nameAr: p.ar, sku: p.sku, reference: p.sku, unit: p.unit, categoryId: p.categoryId, supplierId: p.supplierId,
    purchasePrice: p.cost, priceRetail: p.price, priceProfessional: r2(p.price * 0.9), priceReseller: r2(p.price * 0.8), priceMember: r2(p.price * 0.95),
    vatRate: 20, stockMin: p.stockMin, shelfLifeDays: p.shelf, slug: p.sku.toLowerCase(),
  })) });

  // Production : 3 lots par produit, datés pour alimenter les graphiques et quelques alertes
  type Batch = { id: string; productId: string; batchNumber: string; producedAt: Date; initial: number; remaining: number; expiresAt: Date | null; producer: string };
  const batches: Batch[] = [];
  const records: { id: string; productId: string; memberId: string; batchId: string; qty: number; unit: Unit; producedAt: Date; cost: number; group: string }[] = [];
  for (const p of products) {
    ([[190, 160], [110, 100], [40, 5]] as [number, number][]).forEach(([from, to], k) => {
      const producedAt = daysAgo(int(to, from)), owner = pick(members.filter((m) => m.groupName === p.group && m.status === "ACTIVE"));
      const b: Batch = { id: randomUUID(), productId: p.id, batchNumber: `${p.pre}-${ymd(producedAt)}-${k + 1}`, producedAt, initial: int(...p.qty), remaining: 0,
        expiresAt: p.shelf ? addDays(producedAt, p.shelf) : null, producer: `${owner.firstName} ${owner.lastName}` };
      b.remaining = b.initial; batches.push(b);
      records.push({ id: randomUUID(), productId: p.id, memberId: owner.id, batchId: b.id, qty: b.initial, unit: p.unit, producedAt, cost: p.cost, group: p.group });
    });
  }
  batches.sort((a, b) => a.producedAt.getTime() - b.producedAt.getTime());

  type Mv = { productId: string; batchId: string | null; direction: "IN" | "OUT"; type: "PRODUCTION" | "SALE" | "LOSS"; quantity: number; movedAt: Date; reference: string; productionRecordId?: string; saleId?: string };
  const movements: Mv[] = records.map((r) => ({ productId: r.productId, batchId: r.batchId, direction: "IN", type: "PRODUCTION", quantity: r.qty, movedAt: r.producedAt, reference: batches.find((b) => b.id === r.batchId)!.batchNumber, productionRecordId: r.id }));
  records.forEach((r) => (products.find((p) => p.id === r.productId)!.stock += r.qty));

  // Clients
  const customers = CUSTOMERS.map(([name, company, type]) => ({ id: randomUUID(), organizationId, name, company, type, priceTier: tierOf(type), phone: phone(), email: `${name.split(" ")[0]!.toLowerCase().replace(/[^a-z]/g, "")}@demo.ma`, city: pick(["Agadir", "Taroudant", "Marrakech", "Casablanca"]) }));
  await prisma.customer.createMany({ data: customers });

  // Commandes (20) → 16 livrées (ventes + factures) + 4 en cours ; + 4 ventes comptoir = 20 ventes
  const lines = (tier: PriceTier, when: Date) => {
    const chosen = [...products].sort(() => rnd() - 0.5).slice(0, int(1, 2));
    return chosen.flatMap((p) => {
      const qty = Math.max(1, (p.unit === "KG" ? int(5, 25) : int(2, 10)) * QTY_MULT[tier]);
      const batch = batches.find((b) => b.productId === p.id && b.remaining >= qty && b.producedAt <= when && (!b.expiresAt || b.expiresAt >= when));
      if (!batch) return [];
      return [{ p, qty, batch, unitPrice: r2(p.price * TIER_MULT[tier]) }];
    });
  };
  const totals = (ls: { qty: number; unitPrice: number }[]) => { const subtotal = r2(ls.reduce((s, l) => s + l.qty * l.unitPrice, 0)); const tax = r2(subtotal * 0.2); return { subtotal, tax, total: r2(subtotal + tax) }; };

  const orders: any[] = [], orderItems: any[] = [], sales: any[] = [], saleItems: any[] = [], invoices: any[] = [], invoiceItems: any[] = [], payments: any[] = [];
  const saleDays = Array.from({ length: 20 }, (_, i) => (i < 14 ? int(12, 150) : int(0, 9))).sort((a, b) => b - a); // plus ancien → plus récent
  let saleN = 0, orderN = 0, invN = 0;

  saleDays.forEach((d, i) => {
    const c = pick(customers), when = daysAgo(d), fromOrder = i % 5 !== 4 || i < 4;
    const ls = lines(c.priceTier, when); if (!ls.length) return;
    const t = totals(ls), saleId = randomUUID(), invoiceId = randomUUID();
    let orderId: string | null = null;
    if (fromOrder) {
      orderId = randomUUID();
      orders.push({ id: orderId, organizationId, number: `CMD-${year}-${pad(++orderN)}`, customerId: c.id, status: "DELIVERED", orderedAt: addDays(when, -int(1, 3)), subtotal: t.subtotal, taxTotal: t.tax, total: t.total });
      ls.forEach((l) => orderItems.push({ orderId, productId: l.p.id, quantity: l.qty, unitPrice: l.unitPrice, vatRate: 20, lineTotal: r2(l.qty * l.unitPrice) }));
    }
    // état de paiement : quelques ventes partielles ou impayées pour alimenter les créances
    const state = i % 7 === 3 ? "PARTIAL" : i % 9 === 5 ? "UNPAID" : "PAID";
    const paid = state === "PAID" ? t.total : state === "PARTIAL" ? r2(t.total * 0.5) : 0;
    const due = addDays(when, 30), overdue = state !== "PAID" && due < new Date();
    sales.push({ id: saleId, organizationId, number: `VTE-${year}-${pad(++saleN)}`, customerId: c.id, orderId, status: "COMPLETED", paymentState: state, soldAt: when, subtotal: t.subtotal, taxTotal: t.tax, total: t.total, amountPaid: paid, createdById: accountant.id });
    if (orderId) orders.find((o) => o.id === orderId).paymentState = state;
    invoices.push({ id: invoiceId, organizationId, number: `FAC-${year}-${pad(++invN)}`, customerId: c.id, saleId, orderId, issueDate: when, dueDate: due, subtotal: t.subtotal, taxTotal: t.tax, total: t.total, amountPaid: paid, validatedAt: when,
      status: state === "PAID" ? "PAID" : state === "PARTIAL" ? (overdue ? "OVERDUE" : "PARTIALLY_PAID") : (overdue ? "OVERDUE" : "ISSUED"), paymentTerms: "Paiement à 30 jours" });
    ls.forEach((l) => {
      l.batch.remaining -= l.qty; l.p.stock -= l.qty;
      saleItems.push({ saleId, productId: l.p.id, batchId: l.batch.id, quantity: l.qty, unitPrice: l.unitPrice, vatRate: 20, lineTotal: r2(l.qty * l.unitPrice) });
      invoiceItems.push({ invoiceId, productId: l.p.id, description: l.p.name, quantity: l.qty, unitPrice: l.unitPrice, vatRate: 20, lineTotal: r2(l.qty * l.unitPrice) });
      movements.push({ productId: l.p.id, batchId: l.batch.id, direction: "OUT", type: "SALE", quantity: l.qty, movedAt: when, reference: `VTE-${year}-${pad(saleN)}`, saleId });
    });
    if (paid > 0) { // paiement en 1 ou 2 fois
      const parts = i % 4 === 0 && paid > 200 ? [r2(paid / 2), r2(paid - r2(paid / 2))] : [paid];
      parts.forEach((amount, k) => payments.push({ organizationId, type: "CUSTOMER", direction: "IN", amount, paidAt: new Date(Math.min(addDays(when, int(0, 10) + k * 7).getTime(), Date.now())), method: pick<PaymentMethod>(["CASH", "BANK_TRANSFER", "CHEQUE", "CARD"]), reference: `PAY-${pad(payments.length + 1)}`, customerId: c.id, invoiceId, orderId, createdById: accountant.id }));
    }
  });

  // 4 commandes en cours (stock réservé pour confirmées / en préparation)
  (["NEW", "CONFIRMED", "PREPARING", "CANCELLED"] as const).forEach((status, k) => {
    const c = pick(customers), when = daysAgo(k), ls = lines(c.priceTier, when); if (!ls.length) return;
    const t = totals(ls), id = randomUUID();
    orders.push({ id, organizationId, number: `CMD-${year}-${pad(++orderN)}`, customerId: c.id, status, orderedAt: when, subtotal: t.subtotal, taxTotal: t.tax, total: t.total, createdById: accountant.id });
    ls.forEach((l) => { orderItems.push({ orderId: id, productId: l.p.id, quantity: l.qty, unitPrice: l.unitPrice, vatRate: 20, lineTotal: r2(l.qty * l.unitPrice) }); if (status === "CONFIRMED" || status === "PREPARING") l.p.reserved += l.qty; });
  });

  // Cotisations encaissées → paiements
  contributions.filter((c) => c.amountPaid > 0).forEach((c) => payments.push({ organizationId, type: "CONTRIBUTION", direction: "IN", amount: c.amountPaid, paidAt: c.paidAt, method: c.method ?? "CASH", reference: `COT-${pad(payments.length + 1)}`, memberId: c.memberId, contributionId: c.id, createdById: accountant.id }));

  // Cas d'alerte pour la démo : un produit épuisé (perte du stock restant) et un produit en stock faible
  const soldOut = products.find((p) => p.sku === "PANIER")!;
  batches.filter((b) => b.productId === soldOut.id && b.remaining > 0).forEach((b) => { movements.push({ productId: soldOut.id, batchId: b.id, direction: "OUT", type: "LOSS", quantity: b.remaining, movedAt: daysAgo(3), reference: "Casse / perte" }); b.remaining = 0; });
  soldOut.stock = 0;
  const low = products.find((p) => p.sku === "ARG-COS")!; low.stockMin = Math.ceil(low.stock) + 20;

  // Insertion dans l'ordre des clés étrangères
  const bStatus = (b: Batch) => b.remaining === 0 ? "SOLD_OUT" as const : b.expiresAt && b.expiresAt < new Date() ? "EXPIRED" as const : b.remaining < b.initial ? "PARTIALLY_SOLD" as const : "AVAILABLE" as const;
  await prisma.productionBatch.createMany({ data: batches.map((b) => ({ id: b.id, organizationId, productId: b.productId, batchNumber: b.batchNumber, producedAt: b.producedAt, initialQuantity: b.initial, remainingQty: b.remaining, expiresAt: b.expiresAt, producerName: b.producer, origin: "Souss-Massa", status: bStatus(b) })) });
  await prisma.productionRecord.createMany({ data: records.map((r) => ({ id: r.id, organizationId, productId: r.productId, memberId: r.memberId, batchId: r.batchId, groupName: r.group, quantity: r.qty, unit: r.unit, producedAt: r.producedAt, unitCost: r.cost, quality: "Première qualité", createdById: accountant.id })) });
  await prisma.product.updateMany({ where: { id: low.id }, data: { stockMin: low.stockMin } });
  await prisma.order.createMany({ data: orders });
  await prisma.sale.createMany({ data: sales });
  await prisma.orderItem.createMany({ data: orderItems });
  await prisma.saleItem.createMany({ data: saleItems });
  await prisma.invoice.createMany({ data: invoices });
  await prisma.invoiceItem.createMany({ data: invoiceItems });
  await prisma.inventoryMovement.createMany({ data: movements.map((m) => ({ organizationId, ...m, userId: accountant.id })) });
  await prisma.payment.createMany({ data: payments });
  await prisma.inventory.createMany({ data: products.map((p) => ({ organizationId, productId: p.id, quantity: p.stock, reservedQty: p.reserved })) });

  // Dépenses (15)
  const EXP: [ExpenseCategory, number, number][] = [["RAW_MATERIALS", 3200, 3], ["RAW_MATERIALS", 2100, 3], ["PACKAGING", 1450, 0], ["PACKAGING", 980, 4], ["TRANSPORT", 650, 2], ["TRANSPORT", 720, 2], ["SALARIES", 4500, 0], ["SALARIES", 4500, 0], ["ELECTRICITY", 480, 0], ["WATER", 160, 0], ["MARKETING", 900, 1], ["MAINTENANCE", 1200, 0], ["ADMINISTRATION", 350, 0], ["SUPPLIES", 270, 4], ["OTHER", 210, 0]];
  await prisma.expense.createMany({ data: EXP.map(([category, amount, s], i) => ({ organizationId, category, amount, spentAt: daysAgo(int(2, 150)), supplierId: s ? suppliers[s]!.id : null, method: pick<PaymentMethod>(["CASH", "BANK_TRANSFER"]), note: `Dépense démo ${i + 1}`, createdById: accountant.id })) });

  // Notifications in-app (clés i18n)
  const lateMember = members[12]!, unpaid = invoices.find((i) => i.status === "OVERDUE"), newOrder = orders.find((o) => o.status === "NEW");
  await prisma.notification.createMany({ data: [
    { organizationId, type: "LOW_STOCK" as const, titleKey: "notif.lowStock", params: { product: low.name }, linkUrl: "/stock" },
    { organizationId, type: "OUT_OF_STOCK" as const, titleKey: "notif.outOfStock", params: { product: soldOut.name }, linkUrl: "/stock" },
    { organizationId, type: "LATE_CONTRIBUTION" as const, titleKey: "notif.lateContribution", params: { member: `${lateMember.firstName} ${lateMember.lastName}` }, linkUrl: "/contributions" },
    ...(unpaid ? [{ organizationId, type: "UNPAID_INVOICE" as const, titleKey: "notif.unpaidInvoice", params: { number: unpaid.number }, linkUrl: "/invoices" }] : []),
    ...(newOrder ? [{ organizationId, type: "NEW_ORDER" as const, titleKey: "notif.newOrder", params: { number: newOrder.number }, linkUrl: "/orders" }] : []),
  ] });

  console.log(`✔ Coopérative Tazrout créée : ${members.length} membres, ${products.length} produits, ${customers.length} clients, ${suppliers.length} fournisseurs,`);
  console.log(`  ${records.length} productions, ${movements.length} mouvements, ${orders.length} commandes, ${sales.length} ventes, ${invoices.length} factures, ${payments.length} paiements, ${EXP.length} dépenses.`);
  console.log(process.env.SUPABASE_SERVICE_ROLE_KEY ? `  Comptes Supabase créés. Mot de passe : ${password}` : "  Supabase non configuré : rattachez users.authId à vos comptes Auth.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
