import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/tenant";
import { Link } from "@/i18n/routing";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { user, org, permissions } = await requireUser();
  const allowed = [...permissions].filter((p) => p.endsWith(":read")).map((p) => p.split(":")[0]!);
  const t = await getTranslations("onboarding"), tb = await getTranslations("banner");
  const sub = await prisma.subscription.findUnique({ where: { organizationId: org.id } });
  const days = sub?.status === "TRIALING" && sub.trialEndsAt ? Math.ceil((sub.trialEndsAt.getTime() - Date.now()) / 864e5) : null;
  const ended = sub ? ["EXPIRED", "CANCELLED", "PAST_DUE"].includes(sub.status) || (days !== null && days < 0) : false;
  return (
    <AppShell allowed={allowed} orgName={org.name} userName={user.fullName}>
      {ended && <p role="status" className="mb-5 rounded-xl border border-clay/40 bg-clay/10 p-4 text-sm font-medium text-clay">{tb("ended")}</p>}
      {!ended && days !== null && days <= 7 && <p role="status" className="mb-5 rounded-xl border border-argan/60 bg-argan-soft p-4 text-sm font-medium text-gold-deep">{tb("trial", { days })}</p>}
      {!org.onboardedAt && permissions.has("settings:write") && (
        <Link href="/onboarding" className="mb-5 block rounded-xl border border-argan/60 bg-argan-soft p-4 text-sm font-medium text-gold-deep">{t("banner")} →</Link>
      )}
      {children}
    </AppShell>
  );
}
