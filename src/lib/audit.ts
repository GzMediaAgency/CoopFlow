import type { AuditAction } from "@prisma/client";
import type { requireUser } from "@/lib/auth/session";

type Ctx = Awaited<ReturnType<typeof requireUser>>;

/** Journal d'audit : qui a fait quoi, sur quel objet (la coopérative est injectée par tenantDb). */
export async function audit(ctx: Ctx, action: AuditAction, entityType: string, entityId?: string, changes?: object) {
  await ctx.db.auditLog.create({ data: { organizationId: ctx.org.id, userId: ctx.user.id, action, entityType, entityId, changes } });
}
