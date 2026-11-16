import type { MovementDirection, MovementType } from "@prisma/client";
import type { TenantDb } from "@/lib/db/tenant";
import { DomainError } from "@/lib/errors";

/** Client transactionnel issu de `ctx.db.$transaction(async (tx) => …)`. */
export type Tx = Omit<TenantDb, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">;

export type Movement = {
  organizationId: string; userId?: string; productId: string; batchId?: string;
  direction: MovementDirection; type: MovementType; quantity: number; movedAt?: Date;
  reference?: string; comment?: string; productionRecordId?: string; orderId?: string; saleId?: string; inventoryCountId?: string;
};

/**
 * SEUL point d'entrée pour modifier un stock (production, vente, perte, inventaire…).
 * À appeler dans une transaction : stock, lot et mouvement sont mis à jour ensemble ou pas du tout.
 * Les sorties sont atomiques (`quantity >= demandé`) : deux ventes simultanées ne peuvent pas rendre le stock négatif.
 */
export async function applyMovement(tx: Tx, m: Movement) {
  if (!(m.quantity > 0)) throw new DomainError("invalidQuantity");

  if (m.direction === "IN") {
    const r = await tx.inventory.updateMany({ where: { productId: m.productId }, data: { quantity: { increment: m.quantity } } });
    if (r.count === 0) await tx.inventory.create({ data: { organizationId: m.organizationId, productId: m.productId, quantity: m.quantity } });
  } else {
    const r = await tx.inventory.updateMany({ where: { productId: m.productId, quantity: { gte: m.quantity } }, data: { quantity: { decrement: m.quantity } } });
    if (r.count === 0) throw new DomainError("insufficientStock");
    if (m.batchId) {
      const b = await tx.productionBatch.updateMany({ where: { id: m.batchId, remainingQty: { gte: m.quantity } }, data: { remainingQty: { decrement: m.quantity } } });
      if (b.count === 0) throw new DomainError("insufficientStock");
      const batch = await tx.productionBatch.findFirst({ where: { id: m.batchId } });
      if (batch) await tx.productionBatch.update({ where: { id: batch.id }, data: { status: Number(batch.remainingQty) === 0 ? "SOLD_OUT" : "PARTIALLY_SOLD" } });
    }
  }
  // Un mouvement n'est jamais modifié ni supprimé : on corrige par un mouvement inverse.
  return tx.inventoryMovement.create({ data: { ...m, movedAt: m.movedAt ?? new Date() } });
}

const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** Sortie sans lot choisi : consomme les lots du plus ancien au plus récent, le reste (stock sans lot) en dernier. */
export async function applyOutFifo(tx: Tx, m: Omit<Movement, "direction" | "batchId">) {
  let left = r3(m.quantity);
  const batches = await tx.productionBatch.findMany({ where: { productId: m.productId, remainingQty: { gt: 0 } }, orderBy: { producedAt: "asc" } });
  for (const b of batches) {
    if (left <= 0) break;
    const take = Math.min(left, Number(b.remainingQty));
    await applyMovement(tx, { ...m, direction: "OUT", batchId: b.id, quantity: take });
    left = r3(left - take);
  }
  if (left > 0) await applyMovement(tx, { ...m, direction: "OUT", quantity: left });
}
