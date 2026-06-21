// src/server/portefeuille.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb, seedComptesStandards } from "./test-helpers";
import { creerPiece } from "./pieces";
import { getPortefeuille } from "./portefeuille";

let dossierA: string;
let dossierB: string;

beforeEach(async () => {
  // resetDb crée le dossier A + le référentiel ; on ajoute un dossier B partageant le référentiel.
  dossierA = await resetDb();
  await seedComptesStandards(dossierA);
  const ref = await prisma.referentiel.findFirstOrThrow();
  dossierB = (
    await prisma.dossier.create({
      data: { nom: "Beta SARL", ville: "Abidjan", pays: "Côte d'Ivoire", devise: "XOF", exercice: 2020, referentielId: ref.id },
    })
  ).id;
  await seedComptesStandards(dossierB);

  const jA = (await prisma.journal.create({ data: { code: "ACH", libelle: "Achats", dossierId: dossierA } })).id;
  const jB = (await prisma.journal.create({ data: { code: "ACH", libelle: "Achats", dossierId: dossierB } })).id;

  // Dossier A : 2 brouillons.
  for (const n of ["A-1", "A-2"]) {
    await creerPiece({
      dossierId: dossierA, journalId: jA, numeroPiece: n, datePiece: new Date("2020-01-05"),
      lignes: [
        { compteNumero: "601000", libelleLigne: "Achat", debit: 100, credit: 0 },
        { compteNumero: "401000", libelleLigne: "Fournisseur", debit: 0, credit: 100 },
      ],
    });
  }
  // Dossier B : 1 brouillon.
  await creerPiece({
    dossierId: dossierB, journalId: jB, numeroPiece: "B-1", datePiece: new Date("2020-01-05"),
    lignes: [
      { compteNumero: "601000", libelleLigne: "Achat", debit: 100, credit: 0 },
      { compteNumero: "401000", libelleLigne: "Fournisseur", debit: 0, credit: 100 },
    ],
  });
});

describe("getPortefeuille", () => {
  it("retourne un résumé par dossier", async () => {
    const p = await getPortefeuille();
    expect(p.map((r) => r.nom).sort()).toEqual(["Beta SARL", "Test SA"]);
  });

  it("compte les brouillons par dossier sans fuite entre dossiers", async () => {
    const p = await getPortefeuille();
    const a = p.find((r) => r.id === dossierA)!;
    const b = p.find((r) => r.id === dossierB)!;
    expect(a.nbBrouillons).toBe(2);
    expect(b.nbBrouillons).toBe(1);
  });

  it("isole les lignes à lettrer par dossier", async () => {
    const p = await getPortefeuille();
    const a = p.find((r) => r.id === dossierA)!;
    const b = p.find((r) => r.id === dossierB)!;
    // A a 2 pièces × 2 lignes ouvertes = 4 ; B a 1 pièce × 2 lignes = 2.
    expect(a.nbALettrer).toBe(4);
    expect(b.nbALettrer).toBe(2);
  });
});
