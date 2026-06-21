// src/server/cockpit.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb, seedComptesStandards } from "./test-helpers";
import { creerPiece, validerPiece } from "./pieces";
import { creerTaxe } from "./taxes";
import { getOpenLines } from "./lettrage";
import { getCockpit } from "./cockpit";

let dossierId: string;
let achId: string;
let vtId: string;

beforeEach(async () => {
  dossierId = await resetDb();
  await seedComptesStandards(dossierId); // 401000,411000,443100,521000,601000,701000…
  achId = (await prisma.journal.create({ data: { code: "ACH", libelle: "Achats", dossierId } })).id;
  vtId = (await prisma.journal.create({ data: { code: "VT", libelle: "Ventes", dossierId } })).id;

  // 1) Achat resté en BROUILLON (charge 500) → nbBrouillons = 1.
  await creerPiece({
    dossierId, journalId: achId, numeroPiece: "ACH-001", datePiece: new Date("2020-01-05"),
    lignes: [
      { compteNumero: "601000", libelleLigne: "Achat", debit: 500, credit: 0 },
      { compteNumero: "401000", libelleLigne: "Fournisseur", debit: 0, credit: 500 },
    ],
  });

  // 2) Vente VALIDÉE avec TVA collectée 180 (taxe de vente sur compte 443100).
  await creerTaxe({ dossierId, code: "TVA18", nom: "TVA 18%", taux: 18, usage: "sale", compteNumero: "443100" });
  const taxe = await prisma.taxe.findFirstOrThrow({ where: { dossierId, code: "TVA18" } });
  const vente = await creerPiece({
    dossierId, journalId: vtId, numeroPiece: "VT-001", datePiece: new Date("2020-01-10"),
    lignes: [
      { compteNumero: "411000", libelleLigne: "Client", debit: 1180, credit: 0 },
      { compteNumero: "701000", libelleLigne: "Vente HT", debit: 0, credit: 1000 },
      { compteNumero: "443100", libelleLigne: "TVA collectée", debit: 0, credit: 180, taxeId: taxe.id },
    ],
  });
  await validerPiece(vente.id);
});

describe("getCockpit", () => {
  it("expose les KPIs de getDashboardStats", async () => {
    const c = await getCockpit(dossierId);
    expect(c.kpis.nbBrouillons).toBe(1);
    expect(c.kpis.nbPieces).toBe(2);
    expect(c.journaux.map((j) => j.code)).toEqual(["ACH", "VT"]);
  });

  it("branche la file 'à contrôler' sur le nombre de brouillons", () => {
    return getCockpit(dossierId).then((c) => {
      expect(c.aControler).toEqual({ count: 1, href: "/ecritures" });
    });
  });

  it("branche la file 'à lettrer' sur getOpenLines", async () => {
    const c = await getCockpit(dossierId);
    const attendu = (await getOpenLines(dossierId)).length;
    expect(c.aLettrer).toEqual({ count: attendu, href: "/lettrage" });
    expect(c.aLettrer.count).toBeGreaterThan(0);
  });

  it("branche la file 'à déclarer' sur la TVA nette due", async () => {
    const c = await getCockpit(dossierId);
    expect(c.aDeclarer).toEqual({ netteDue: 180, href: "/etats/tva" });
  });

  it("recommande de valider les brouillons en priorité", async () => {
    const c = await getCockpit(dossierId);
    expect(c.prochaineAction).toEqual({ libelle: "Valider 1 pièce(s) en brouillon", href: "/ecritures", raison: "brouillons" });
  });
});
