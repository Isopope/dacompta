import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb, seedComptesStandards } from "./test-helpers";
import { getOpenLines } from "./lettrage";

let dossierId: string;
let journalId: string;

beforeEach(async () => {
  dossierId = await resetDb();
  await seedComptesStandards(dossierId);
  const j = await prisma.journal.create({ data: { code: "OD", libelle: "Opérations diverses", dossierId } });
  journalId = j.id;
});

// Helper bas niveau : crée une pièce + ses lignes SANS contrôle d'équilibre.
// Certains cas de test ont besoin de pièces volontairement déséquilibrées pour
// isoler le sens d'une ligne ouverte. amountResidual = |débit − crédit|.
type LigneTest = { compteNumero: string; debit: number; credit: number };
async function piece(numeroPiece: string, lignes: LigneTest[], datePiece?: Date) {
  // Résoudre les compteId depuis les comptes seedés (nécessaire car compteId est NOT NULL).
  const numeros = [...new Set(lignes.map((l) => l.compteNumero))];
  const comptes = await prisma.compte.findMany({
    where: { dossierId, numero: { in: numeros } },
    select: { id: true, numero: true },
  });
  const parNumero = new Map(comptes.map((c) => [c.numero, c.id]));
  return prisma.piece.create({
    data: {
      numeroPiece,
      datePiece: datePiece ?? new Date(),
      journalId,
      dossierId,
      lignes: {
        create: lignes.map((l, i) => ({
          compteId: parNumero.get(l.compteNumero)!,
          compteNumero: l.compteNumero,
          libelleLigne: l.compteNumero,
          debit: l.debit,
          credit: l.credit,
          ordre: i,
          amountResidual: Math.abs(l.debit - l.credit),
          isLettres: false,
        })),
      },
    },
    include: { lignes: { orderBy: { ordre: "asc" } } },
  });
}

describe("getOpenLines", () => {
  it("retourne un tableau vide quand il n'y a pas de lignes ouvertes", async () => {
    // Aucune pièce créée
    const ouvertes = await getOpenLines(dossierId);
    expect(ouvertes).toHaveLength(0);
  });

  it("retourne les lignes ouvertes (amountResidual > 0) et exclut les pièces annulées", async () => {
    // Pièce valide avec deux lignes sur comptes différents pour garder la pièce équilibrée
    const piece1 = await piece("P-1", [
      { compteNumero: "411000", debit: 100_000, credit: 0 },
      { compteNumero: "707000", debit: 0, credit: 100_000 }, // solde débiteur 100k sur 411000, créditeur 100k sur 707000
    ]);
    // Pièce annulée
    const piece2 = await piece("P-2", [
      { compteNumero: "411000", debit: 200_000, credit: 0 },
      { compteNumero: "707000", debit: 0, credit: 200_000 },
    ]);
    // Annuler piece2
    await prisma.piece.update({
      where: { id: piece2.id },
      data: { statut: "ANNULEE" },
    });

    const ouvertes = await getOpenLines(dossierId);
    // Should have 2 lignes from piece1 (both have amountResidual > 0)
    expect(ouvertes).toHaveLength(2);
    // Vérifier qu'aucune ligne de piece2 n'est présente
    const piece2Ids = ouvertes.filter((l) => l.pieceId === piece2.id);
    expect(piece2Ids).toHaveLength(0);
    // Vérifier que les lignes ont les bons champs
    for (const l of ouvertes) {
      expect(l).toHaveProperty("id");
      expect(l).toHaveProperty("pieceId");
      expect(l).toHaveProperty("pieceNumero");
      expect(l).toHaveProperty("pieceDate");
      expect(l).toHaveProperty("journalCode");
      expect(l).toHaveProperty("compteNumero");
      expect(l).toHaveProperty("intituleCompte");
      expect(l).toHaveProperty("libelleLigne");
      expect(l).toHaveProperty("debit");
      expect(l).toHaveProperty("credit");
      expect(l).toHaveProperty("amountResidual");
      expect([1, -1]).toContain(l.sens);
      expect(["BROUILLON", "VALIDEE", "ANNULEE"]).toContain(l.pieceStatut);
    }
  });

  it("calcule correctement le sens (débit = 1, crédit = -1)", async () => {
    const piece1 = await piece("P-3", [
      { compteNumero: "411000", debit: 0, credit: 30_000 }, // ligne crédit sur 411000
      { compteNumero: "707000", debit: 20_000, credit: 0 }, // ligne débit sur 707000
    ]);
    const ouvertes = await getOpenLines(dossierId);
    expect(ouvertes).toHaveLength(2);
    const ligneCredit = ouvertes.find((l) => l.debit === 0 && l.credit === 30_000);
    const ligneDebit = ouvertes.find((l) => l.debit === 20_000 && l.credit === 0);
    expect(ligneCredit).toBeDefined();
    expect(ligneDebit).toBeDefined();
    expect(ligneCredit?.sens).toBe(-1);
    expect(ligneDebit?.sens).toBe(1);
  });

  it("trie par datePiece asc, puis numeroPiece asc, puis ordre asc", async () => {
    const date1 = new Date(2020, 0, 1); // jan 1 2020
    const date2 = new Date(2020, 0, 2); // jan 2 2020
    const date3 = new Date(2020, 0, 1); // same date as date1
    // Piece A date1, numero A-1, ordre 1
    const pieceA = await piece("A-1", [
      { compteNumero: "411000", debit: 10_000, credit: 0 },
      { compteNumero: "707000", debit: 0, credit: 10_000 },
    ], date1);
    // Piece B date2, numero B-1, ordre 1 (plus récente)
    const pieceB = await piece("B-1", [
      { compteNumero: "411000", debit: 20_000, credit: 0 },
      { compteNumero: "707000", debit: 0, credit: 20_000 },
    ], date2);
    // Piece C date1 (same as A), numero C-1 (alphabetically after A-1?), ordre 1
    const pieceC = await piece("C-1", [
      { compteNumero: "411000", debit: 30_000, credit: 0 },
      { compteNumero: "707000", debit: 0, credit: 30_000 },
    ], date1);
    const ouvertes = await getOpenLines(dossierId);
    // 3 pièces × 2 lignes = 6 lignes ouvertes. Tri attendu : (date, numéro, ordre).
    // jan-1 : A-1 puis C-1 ; jan-2 : B-1 ; deux lignes par pièce (ordre 0 puis 1).
    expect(ouvertes).toHaveLength(6);
    expect(ouvertes.map((l) => l.pieceNumero)).toEqual([
      "A-1", "A-1", "C-1", "C-1", "B-1", "B-1",
    ]);
  });
});