import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma, tenantDb } from "../src/lib/db/tenant";

// Test d'intégration : nécessite DATABASE_URL (base de test).
describe("isolation multi-tenant", () => {
  let orgA: string, orgB: string, memberA: string;
  beforeAll(async () => {
    const s = Date.now();
    orgA = (await prisma.organization.create({ data: { name: "A", slug: `a-${s}` } })).id;
    orgB = (await prisma.organization.create({ data: { name: "B", slug: `b-${s}` } })).id;
    memberA = (await tenantDb(orgA).member.create({ data: { memberNumber: "M1", firstName: "Fatima", lastName: "Zahra" } as never })).id;
  });
  afterAll(async () => {
    const ids = [orgA, orgB].filter(Boolean);
    if (ids.length) await prisma.organization.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  it("B ne voit aucun membre de A (liste)", async () => {
    expect(await tenantDb(orgB).member.findMany()).toHaveLength(0);
  });
  it("B ne peut pas lire un membre de A par id", async () => {
    expect(await tenantDb(orgB).member.findFirst({ where: { id: memberA } })).toBeNull();
  });
  it("B ne peut pas modifier un membre de A", async () => {
    const r = await tenantDb(orgB).member.updateMany({ where: { id: memberA }, data: { firstName: "X" } });
    expect(r.count).toBe(0);
  });
  it("A retrouve bien son membre", async () => {
    expect(await tenantDb(orgA).member.findMany()).toHaveLength(1);
  });
});
