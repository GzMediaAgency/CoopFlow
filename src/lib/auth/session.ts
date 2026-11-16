import { cache } from "react";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { prisma, tenantDb } from "@/lib/db/tenant";
import { DEFAULT_PERMISSIONS, type PermissionCode } from "./permissions";

/** Utilisateur connecté + sa coopérative + ses permissions + un client DB isolé. */
export const requireUser = cache(async () => {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser(); // valide le JWT côté serveur
  if (!data.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { authId: data.user.id },
    include: { role: { include: { permissions: { include: { permission: true } } } }, organization: true },
  });
  if (!user || user.status !== "ACTIVE") redirect("/login");
  if (!user.organizationId || !user.organization) redirect(user.isSuperAdmin ? "/admin" : "/login");
  if (user.organization.status !== "ACTIVE") redirect("/suspended"); // coopérative suspendue par la plateforme

  let sub = null;
  try {
    sub = await prisma.subscription.findUnique({
      where: { organizationId: user.organizationId },
      include: { plan: true },
    });
  } catch (e) {
    console.error("[requireUser] sub query error", e);
  }

  const daysRemaining = sub?.status === "TRIALING" && sub.trialEndsAt
    ? Math.ceil((sub.trialEndsAt.getTime() - Date.now()) / 864e5)
    : null;

  // Fin d'essai (daysRemaining <= 0) ou abonnement non actif (EXPIRED, CANCELLED, PAST_DUE)
  const isTrialEnded = sub?.status === "TRIALING" && daysRemaining !== null && daysRemaining <= 0;
  const isSubInactive = sub ? ["EXPIRED", "CANCELLED", "PAST_DUE"].includes(sub.status) : false;
  const isReadOnly = (isTrialEnded || isSubInactive) && !user.isSuperAdmin;

  const custom = user.role?.permissions.map((p) => p.permission.code as PermissionCode) ?? [];
  const basePermissions = custom.length ? custom : DEFAULT_PERMISSIONS[user.role?.code ?? "AGENT"];

  // En mode lecture seule : on verrouille strictement toute mutation (write, delete, validate)
  const effectivePermissions = isReadOnly
    ? basePermissions.filter((p) => p.endsWith(":read") || p.endsWith(":export"))
    : basePermissions;

  const permissions = new Set<PermissionCode>(effectivePermissions);
  return {
    user,
    org: user.organization,
    permissions,
    db: tenantDb(user.organizationId),
    isReadOnly,
    subscription: sub,
    daysRemaining,
  };
});

export async function requirePermission(code: PermissionCode) {
  const ctx = await requireUser();
  if (ctx.isReadOnly && !code.endsWith(":read") && !code.endsWith(":export")) {
    redirect("/settings/subscription?expired=1");
  }
  if (!ctx.permissions.has(code)) redirect("/");
  return ctx;
}

/** Espace propriétaire de la plateforme : réservé aux comptes `isSuperAdmin`, revérifié à chaque appel. */
export const requireSuperAdmin = cache(async () => {
  const { data } = await (await supabaseServer()).auth.getUser();
  if (!data.user) redirect("/login");
  const user = await prisma.user.findUnique({ where: { authId: data.user.id } });
  if (!user || !user.isSuperAdmin || user.status !== "ACTIVE") redirect("/");
  return { user };
});
