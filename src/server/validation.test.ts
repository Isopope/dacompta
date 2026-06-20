import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb, seedComptesStandards } from "./test-helpers";
import { creerPiece, validerPiece, annulerPiece } from "./pieces";

let dossierId: string;
let journalId: string;

beforeEach(async () => {
  dossierId = await resetDb();
  await seedComptesStandards(dossierId);
  const j = await prisma.journal.create({
    data: { code: "ACH", libelle: "Achats", dossierId },
  });
  journalId = j.id;
});

/** Crée une pièce équilibrée minimale dans le journal ACH, exercice 2020. */
async function creerPieceAch(numero: string) {
  return creerPiece({
    dossierId,
    journalId,
    numeroPiece: numero,
    datePiece: new Date("2020-03-01"),
    lignes: [
      { compteNumero: "601000", libelleLigne: "Achat", debit: 100, credit: 0 },
      { compteNumero: "401000", libelleLigne: "Fournisseur", debit: 0, credit: 100 },
    ],
  });
}

describe("validerPiece — séquence & hash", () => {
  it("attribue un numéro CODE/EXERCICE/NNNN sans trou par journal+exercice", async () => {
    const p1 = await creerPieceAch("BROUILLON-1");
    const p2 = await creerPieceAch("BROUILLON-2");

    const v1 = await validerPiece(p1.id);
    const v2 = await validerPiece(p2.id);

    expect(v1.numeroPiece).toBe("ACH/2020/0001");
    expect(v2.numeroPiece).toBe("ACH/2020/0002");
  });

  it("chaîne le hash : hashPrecedent de la 2e == hash de la 1re", async () => {
    const p1 = await creerPieceAch("BROUILLON-A");
    const p2 = await creerPieceAch("BROUILLON-B");

    const v1 = await validerPiece(p1.id);
    const v2 = await validerPiece(p2.id);

    expect(v2.hashPrecedent).toBe(v1.hash);
    expect(v1.hashPrecedent).toBeNull();
  });

  it("refuse de valider une pièce déjà VALIDEE", async () => {
    const p = await creerPieceAch("BROUILLON-C");
    await validerPiece(p.id);
    await expect(validerPiece(p.id)).rejects.toThrow(/brouillon|validée/i);
  });

  it("refuse d'annuler une pièce VALIDEE", async () => {
    const p = await creerPieceAch("BROUILLON-D");
    await validerPiece(p.id);
    await expect(annulerPiece(p.id)).rejects.toThrow(/validée|immuable/i);
  });

  it("pose exercice et dateValidation lors de la validation", async () => {
    const p = await creerPieceAch("BROUILLON-E");
    const v = await validerPiece(p.id);
    expect(v.exercice).toBe(2020);
    expect(v.dateValidation).not.toBeNull();
  });
});
