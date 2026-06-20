import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb, seedComptesStandards } from "./test-helpers";
import { getOpenLines, createLettrage, deleteLettrage } from "./lettrage";
import { creerCompte } from "./comptes";
import { creerTiers } from "./tiers";

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
});

// Deux lignes opposées sur le même compte de tiers, pour les tests de lettrage.
async function deuxLignes411(numero: string, debit: number, credit: number) {
  const p = await piece(numero, [
    { compteNumero: "411000", debit, credit: 0 },
    { compteNumero: "411000", debit: 0, credit },
  ]);
  return { ligneDebit: p.lignes[0], ligneCredit: p.lignes[1] };
}

describe("createLettrage — arrondi à la précision de la devise", () => {
  it("XOF (0 décimale) : un montant sous l'unité est arrondi à l'unité et solde la ligne", async () => {
    const { ligneDebit, ligneCredit } = await deuxLignes411("L-1", 1000, 1000);

    // 999.6 n'est pas représentable en XOF : le montant lettré doit valoir 1000.
    const lettrage = await createLettrage(dossierId, ligneDebit.id, ligneCredit.id, 999.6);
    expect(lettrage.montant).toBe(1000);

    const d = await prisma.ligneEcriture.findUniqueOrThrow({ where: { id: ligneDebit.id } });
    const c = await prisma.ligneEcriture.findUniqueOrThrow({ where: { id: ligneCredit.id } });
    expect(Number(d.amountResidual)).toBe(0);
    expect(Number(c.amountResidual)).toBe(0);
    expect(d.isLettres).toBe(true);
    expect(c.isLettres).toBe(true);
  });

  it("XOF (0 décimale) : un lettrage partiel laisse un résiduel entier", async () => {
    const { ligneDebit, ligneCredit } = await deuxLignes411("L-2", 1000, 1000);

    // 999.4 arrondi à 999 : il reste 1 (entier) à lettrer de chaque côté.
    const lettrage = await createLettrage(dossierId, ligneDebit.id, ligneCredit.id, 999.4);
    expect(lettrage.montant).toBe(999);

    const d = await prisma.ligneEcriture.findUniqueOrThrow({ where: { id: ligneDebit.id } });
    const c = await prisma.ligneEcriture.findUniqueOrThrow({ where: { id: ligneCredit.id } });
    expect(Number(d.amountResidual)).toBe(1);
    expect(Number(c.amountResidual)).toBe(1);
    expect(d.isLettres).toBe(false);
    expect(c.isLettres).toBe(false);
  });

  it("refuse de lettrer deux tiers différents d'un même compte collectif", async () => {
    await creerCompte({ dossierId, numeroSaisi: "411200", intitule: "Clients collectif", collectif: true });
    const numeros = ["411200"];
    const comptes = await prisma.compte.findMany({ where: { dossierId, numero: { in: numeros } }, select: { id: true, numero: true } });
    const compteId = comptes[0].id;
    const tA = await creerTiers({ dossierId, code: "C-A", nom: "A", type: "CLIENT" });
    const tB = await creerTiers({ dossierId, code: "C-B", nom: "B", type: "CLIENT" });
    // Une ligne débit pour le tiers A, une ligne crédit pour le tiers B, même compte collectif.
    const p = await prisma.piece.create({
      data: {
        numeroPiece: "COL-1", datePiece: new Date(), journalId, dossierId,
        lignes: {
          create: [
            { compteId, compteNumero: "411200", tiersId: tA.id, libelleLigne: "A", debit: 1000, credit: 0, ordre: 0, amountResidual: 1000, isLettres: false },
            { compteId, compteNumero: "411200", tiersId: tB.id, libelleLigne: "B", debit: 0, credit: 1000, ordre: 1, amountResidual: 1000, isLettres: false },
          ],
        },
      },
      include: { lignes: { orderBy: { ordre: "asc" } } },
    });
    await expect(
      createLettrage(dossierId, p.lignes[0].id, p.lignes[1].id, 1000),
    ).rejects.toThrow(/tiers/i);
  });

  it("expose le tiers sur les lignes ouvertes (getOpenLines)", async () => {
    await creerCompte({ dossierId, numeroSaisi: "411200", intitule: "Clients collectif", collectif: true });
    const compte = await prisma.compte.findFirstOrThrow({ where: { dossierId, numero: "411200" }, select: { id: true } });
    const t = await creerTiers({ dossierId, code: "C-A", nom: "Alpha", type: "CLIENT" });
    await prisma.piece.create({
      data: {
        numeroPiece: "COL-2", datePiece: new Date(), journalId, dossierId,
        lignes: { create: [{ compteId: compte.id, compteNumero: "411200", tiersId: t.id, libelleLigne: "A", debit: 1000, credit: 0, ordre: 0, amountResidual: 1000, isLettres: false }] },
      },
    });
    const ouvertes = await getOpenLines(dossierId);
    const ligne = ouvertes.find((l) => l.compteNumero === "411200");
    expect(ligne?.tiersId).toBe(t.id);
    expect(ligne?.tiersNom).toBe("Alpha");
  });

  it("refuse le lettrage sur un compte non réconciliable (ex. banque 521)", async () => {
    // 521000 (banque) est asset_cash → reconciliable = false.
    const p = await piece("L-NR", [
      { compteNumero: "521000", debit: 1000, credit: 0 },
      { compteNumero: "521000", debit: 0, credit: 1000 },
    ]);
    await expect(
      createLettrage(dossierId, p.lignes[0].id, p.lignes[1].id, 1000),
    ).rejects.toThrow(/réconciliable|lettrable/i);
  });

  it("EUR (2 décimales) : conserve les centimes (non-régression)", async () => {
    await prisma.dossier.update({ where: { id: dossierId }, data: { devise: "EUR" } });
    const { ligneDebit, ligneCredit } = await deuxLignes411("L-3", 100.5, 100.5);

    const lettrage = await createLettrage(dossierId, ligneDebit.id, ligneCredit.id, 50.25);
    expect(lettrage.montant).toBe(50.25);

    const d = await prisma.ligneEcriture.findUniqueOrThrow({ where: { id: ligneDebit.id } });
    expect(Number(d.amountResidual)).toBe(50.25);
    expect(d.isLettres).toBe(false);
  });
});

describe("deleteLettrage — arrondi à la précision de la devise", () => {
  it("XOF (0 décimale) : restaure le résiduel à l'unité (assainit une fraction héritée)", async () => {
    const { ligneDebit, ligneCredit } = await deuxLignes411("D-1", 1000, 1000);
    // Données héritées : un résiduel porte une fraction sous l'unité, impossible en XOF.
    await prisma.ligneEcriture.update({ where: { id: ligneDebit.id }, data: { amountResidual: 0.4 } });
    await prisma.ligneEcriture.update({ where: { id: ligneCredit.id }, data: { amountResidual: 0.4 } });
    const lettrage = await prisma.lettrage.create({
      data: { dossierId, ligneDebitId: ligneDebit.id, ligneCreditId: ligneCredit.id, montant: 100 },
    });

    await deleteLettrage(lettrage.id);

    // 0,4 + 100 = 100 en XOF (et non 100,4).
    const d = await prisma.ligneEcriture.findUniqueOrThrow({ where: { id: ligneDebit.id } });
    const c = await prisma.ligneEcriture.findUniqueOrThrow({ where: { id: ligneCredit.id } });
    expect(Number(d.amountResidual)).toBe(100);
    expect(Number(c.amountResidual)).toBe(100);
    expect(d.isLettres).toBe(false);
  });
});

describe("getOpenLines (suite)", () => {
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