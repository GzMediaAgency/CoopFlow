import { PrismaClient } from "@prisma/client";

const g = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = g.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") g.prisma = prisma;

// Modèles portant directement organizationId. Les tables enfants (OrderItem, InvoiceItem…)
// sont atteintes uniquement via leur parent filtré.
const TENANT_MODELS = new Set([
  "Member","MemberShare","Contribution","Category","Product","ProductionBatch","ProductionRecord",
  "Inventory","InventoryMovement","InventoryCount","Customer","Supplier","Order","Sale","Invoice",
  "Payment","Expense","Document","Notification","AuditLog","EmailTemplate","EmailLog","WhatsappLog",
]);

/** Client Prisma verrouillé sur UNE coopérative : le filtre organizationId est injecté partout. */
export function tenantDb(organizationId: string) {
  if (!organizationId) throw new Error("tenantDb: organizationId requis");
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!TENANT_MODELS.has(model)) return query(args);
          const a = args as Record<string, any>;
          switch (operation) {
            case "create":
              a.data = { ...a.data, organizationId };
              break;
            case "createMany":
            case "createManyAndReturn":
              a.data = (Array.isArray(a.data) ? a.data : [a.data]).map((d: object) => ({ ...d, organizationId }));
              break;
            case "upsert":
              a.where = { ...a.where, organizationId };
              a.create = { ...a.create, organizationId };
              break;
            default:
              a.where = { ...(a.where ?? {}), organizationId };
          }
          return query(a as typeof args);
        },
      },
    },
  });
}
export type TenantDb = ReturnType<typeof tenantDb>;
