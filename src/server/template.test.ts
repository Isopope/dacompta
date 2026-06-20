import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb } from "./test-helpers";
import { instancierPlanSyscohada } from "./template";

let dossierId: string;
beforeEach(async () => { dossierId = await resetDb(); });

describe("instancierPlanSyscohada", () => {
  it("instancie le plan SYSCOHADA dans un dossier vierge avec types et réconciliation", async () => {
    const res = await instancierPlanSyscohada(dossierId);
    expect(res.crees).toBeGreaterThan(0);

    const client = await prisma.compte.findFirstOrThrow({ where: { dossierId, numero: "411100" } });
    expect(client.accountType).toBe("asset_receivable");
    expect(client.reconciliable).toBe(true);
    expect(client.collectif).toBe(true);

    const banque = await prisma.compte.findFirstOrThrow({ where: { dossierId, numero: "521100" } });
    expect(banque.accountType).toBe("asset_cash");
    expect(banque.reconciliable).toBe(false);
  });

  it("est idempotent : une 2e instanciation ne crée pas de doublon", async () => {
    const a = await instancierPlanSyscohada(dossierId);
    const b = await instancierPlanSyscohada(dossierId);
    expect(b.crees).toBe(0);
    const total = await prisma.compte.count({ where: { dossierId } });
    expect(total).toBe(a.crees);
  });
});
