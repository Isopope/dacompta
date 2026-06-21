import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb } from "./test-helpers";
import { COMPTES_BASE_SYSCOHADA } from "@/lib/syscohada/referentiel";
import { listerDossiers, creerDossier } from "./dossiers";

describe("listerDossiers", () => {
  beforeEach(async () => { await resetDb(); });

  it("liste les dossiers (au moins celui de test)", async () => {
    const ds = await listerDossiers();
    expect(ds.length).toBeGreaterThanOrEqual(1);
    expect(ds[0]).toHaveProperty("nom");
  });
});

describe("creerDossier", () => {
  beforeEach(async () => {
    await resetDb(); // crée le référentiel SYSCOHADA + un dossier "Test SA" (sans comptes/journaux)
  });

  it("amorce un dossier opérationnel : 6 journaux, le plan de base, 2 taxes", async () => {
    const { id } = await creerDossier({ nom: "Nouvelle SARL", ville: "Dakar", pays: "Sénégal", devise: "XOF", exercice: 2026 });
    expect(await prisma.journal.count({ where: { dossierId: id } })).toBe(6);
    expect(await prisma.compte.count({ where: { dossierId: id } })).toBe(COMPTES_BASE_SYSCOHADA.length);
    expect(await prisma.taxe.count({ where: { dossierId: id } })).toBe(2);
    const tva = await prisma.compte.findMany({ where: { dossierId: id, numero: { in: ["443100", "445200"] } } });
    expect(tva).toHaveLength(2);
  });

  it("dérive les attributs comptables (collectif, reconciliable, classeNum)", async () => {
    const { id } = await creerDossier({ nom: "X SA", ville: "Lomé", pays: "Togo", devise: "XOF", exercice: 2026 });
    const c401 = await prisma.compte.findUniqueOrThrow({ where: { dossierId_numero: { dossierId: id, numero: "401000" } } });
    expect(c401.collectif).toBe(true);
    expect(c401.reconciliable).toBe(true);
    const c601 = await prisma.compte.findUniqueOrThrow({ where: { dossierId_numero: { dossierId: id, numero: "601000" } } });
    expect(c601.classeNum).toBe(6);
  });

  it("applique le taux de TVA du pays", async () => {
    const { id } = await creerDossier({ nom: "Cam SA", ville: "Douala", pays: "Cameroun", devise: "XAF", exercice: 2026 });
    const vente = await prisma.taxe.findUniqueOrThrow({ where: { dossierId_code: { dossierId: id, code: "TVA-VENTE" } } });
    expect(vente.usage).toBe("sale");
    expect(Number(vente.taux)).toBe(19.25); // TVA Cameroun
  });

  it("isole le nouveau dossier (n'affecte pas les comptes des autres)", async () => {
    const avant = await prisma.compte.count();
    const { id } = await creerDossier({ nom: "Iso", ville: "Abidjan", pays: "Côte d'Ivoire", devise: "XOF", exercice: 2026 });
    expect(await prisma.compte.count({ where: { dossierId: { not: id } } })).toBe(avant);
  });

  it("est atomique : un input invalide ne crée aucun dossier", async () => {
    const avant = await prisma.dossier.count();
    await expect(
      creerDossier({ nom: "   ", ville: "X", pays: "Togo", devise: "XOF", exercice: 2026 })
    ).rejects.toThrow();
    expect(await prisma.dossier.count()).toBe(avant);
  });

  it("rejette un pays non supporté", async () => {
    await expect(
      creerDossier({ nom: "Y", ville: "Z", pays: "France", devise: "EUR", exercice: 2026 })
    ).rejects.toThrow();
  });
});
