// Test d'inaltérabilité de bout en bout — audit de la chaîne de hash.
// Crée plusieurs pièces validées via creerPiece + validerPiece, reconstruit le
// tableau PieceHashInput[] depuis la BD, puis appelle verifierChaine.
// Vérifie aussi que la falsification d'un hash brise la chaîne.
import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb, seedComptesStandards } from "./test-helpers";
import { creerPiece, validerPiece } from "./pieces";
import { verifierChaine, ErreurIntegrite, PieceHashInput } from "@/lib/comptabilite/integrite";

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

/** Crée et valide immédiatement une pièce équilibrée (601/401). */
async function creerEtValider(numeroBrouillon: string, montant: number, date: Date) {
  const p = await creerPiece({
    dossierId,
    journalId,
    numeroPiece: numeroBrouillon,
    datePiece: date,
    lignes: [
      { compteNumero: "601000", libelleLigne: "Achat", debit: montant, credit: 0 },
      { compteNumero: "401000", libelleLigne: "Fournisseur", debit: 0, credit: montant },
    ],
  });
  return validerPiece(p.id);
}

/** Reconstruit le tableau PieceHashInput[] depuis la BD pour (dossierId, journalId, exercice). */
async function chargerChaine(exercice: number): Promise<(PieceHashInput & { hash: string; hashPrecedent: string | null })[]> {
  const pieces = await prisma.piece.findMany({
    where: { dossierId, journalId, exercice, statut: "VALIDEE" },
    orderBy: { numeroPiece: "asc" },
    include: { lignes: { orderBy: { ordre: "asc" } } },
  });

  return pieces.map((p) => ({
    dossierId: p.dossierId,
    journalId: p.journalId,
    datePieceISO: p.datePiece.toISOString(),
    exercice: p.exercice!,
    numeroPiece: p.numeroPiece,
    lignes: [...p.lignes]
      .sort((a, b) => a.ordre - b.ordre)
      .map((l) => ({
        compteNumero: l.compteNumero,
        debit: l.debit.toString(),
        credit: l.credit.toString(),
        ordre: l.ordre,
      })),
    hash: p.hash!,
    hashPrecedent: p.hashPrecedent,
  }));
}

// ─────────────────────────────────────────────────────────────────────────
// I6 — La chaîne de hash de plusieurs pièces validées doit être intacte.
// ─────────────────────────────────────────────────────────────────────────
describe("audit d'inaltérabilité — chaîne de hash", () => {
  it("la chaîne de 3 pièces validées est intacte (verifierChaine ne lève pas)", async () => {
    const date = new Date("2020-03-15T12:00:00Z");
    await creerEtValider("ACH-B1", 10000, date);
    await creerEtValider("ACH-B2", 20000, date);
    await creerEtValider("ACH-B3", 30000, date);

    const chaine = await chargerChaine(2020);
    expect(chaine).toHaveLength(3);

    // Ne doit pas lever — la chaîne est intacte.
    expect(() => verifierChaine(chaine)).not.toThrow();
  });

  it("détecte une falsification du hash d'une pièce médiane", async () => {
    const date = new Date("2020-06-01T08:00:00Z");
    await creerEtValider("ACH-C1", 5000, date);
    await creerEtValider("ACH-C2", 7000, date);
    await creerEtValider("ACH-C3", 3000, date);

    const chaine = await chargerChaine(2020);
    expect(chaine).toHaveLength(3);

    // Falsifier le hash de la deuxième pièce en base.
    await prisma.piece.update({
      where: { id: (await prisma.piece.findFirstOrThrow({
        where: { dossierId, journalId, exercice: 2020, numeroPiece: chaine[1].numeroPiece },
        select: { id: true },
      })).id },
      data: { hash: "0000000000000000000000000000000000000000000000000000000000000000" },
    });

    // Recharger depuis la BD (le hash falsifié est maintenant persisté).
    const chaineFalsifiee = await chargerChaine(2020);

    // verifierChaine doit détecter la rupture.
    expect(() => verifierChaine(chaineFalsifiee)).toThrow(ErreurIntegrite);
  });

  it("une chaîne vide passe sans erreur", () => {
    expect(() => verifierChaine([])).not.toThrow();
  });
});
