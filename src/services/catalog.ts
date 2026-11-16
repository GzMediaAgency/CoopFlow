import type { requireUser } from "@/lib/auth/session";
import type { DocCustomer, DocProduct } from "@/components/sales/document-form";

type Ctx = Awaited<ReturnType<typeof requireUser>>;

/** Données de l'éditeur de lignes : clients (avec niveau de prix) et produits vendables (avec stock disponible). */
export async function documentFormData(ctx: Ctx): Promise<{ customers: DocCustomer[]; products: DocProduct[] }> {
  const [customers, products] = await Promise.all([
    ctx.db.customer.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true, priceTier: true } }),
    ctx.db.product.findMany({ where: { deletedAt: null, isActive: true }, orderBy: { name: "asc" }, include: { inventory: true } }),
  ]);
  return {
    customers: customers.map((c) => ({ id: c.id, name: c.name, tier: c.priceTier })),
    products: products.map((p) => {
      const retail = Number(p.priceRetail);
      return { id: p.id, name: p.name, unit: p.unit, vatRate: Number(p.vatRate), available: Number(p.inventory?.quantity ?? 0) - Number(p.inventory?.reservedQty ?? 0),
        prices: { RETAIL: retail, PROFESSIONAL: Number(p.priceProfessional ?? retail), RESELLER: Number(p.priceReseller ?? retail), MEMBER: Number(p.priceMember ?? retail) } };
    }),
  };
}
