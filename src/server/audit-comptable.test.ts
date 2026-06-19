// Tests d'AUDIT — confrontation aux équivalents Odoo.
// Chaque test affirme le comportement comptablement CORRECT (celui qu'Odoo
// garantit). Un échec ici = un bug confirmé dans DaCompta, pas un test faux.
// Ce fichier est volontairement indépendant des helpers existants.
import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb, seedComptesStandards } from "./test-helpers";
import { creerPiece, annulerPiece } from "./pieces";
import { createLettrage } from "./lettrage";
import { getBalance } from "./balance";

let dossierId: string;
let journalId: string;

beforeEach(async () => {
  dossierId = await resetDb();
  await seedComptesStandards(dossierId);
  const j = await prisma.journal.create({
    data: { code: "OD", libelle: "Opérations diverses", dossierId },
  });
  journalId = j.id;
});

type L = { compteNumero: string; debit: number; credit: number };
function piece(numero: string, lignes: L[], datePiece?: Date) {
  return creerPiece({
    dossierId,
    journalId,
    numeroPiece: numero,
    datePiece,
    lignes: lignes.map((l) => ({ ...l, libelleLigne: l.compteNumero })),
  });
}

// ─────────────────────────────────────────────────────────────────────────
// CLAIM #3 — Le calcul de TVA n'isole que les comptes 445 au débit (TVA
// déductible / achats). La TVA collectée sur une vente (compte 443, au crédit)
// n'est jamais captée. Odoo : la TVA vient de tax_ids, jamais d'un préfixe.
// ─────────────────────────────────────────────────────────────────────────
describe("CLAIM #3 — TVA d'une facture de VENTE", () => {
  it("doit isoler la TVA collectée et le HT (vente 1000 HT, TVA 18%)", async () => {
    const p = await piece("VT-1", [
      { compteNumero: "411000", debit: 1180, credit: 0 }, // client, TTC
      { compteNumero: "707000", debit: 0, credit: 1000 }, // vente HT
      { compteNumero: "443100", debit: 0, credit: 180 },  // TVA collectée
    ]);
    expect(Number(p.montantTTC)).toBe(1180);
    expect(Number(p.montantTVA)).toBe(180);  // ← attendu correct
    expect(Number(p.montantHT)).toBe(1000);  // ← attendu correct
  });
});

// ─────────────────────────────────────────────────────────────────────────
// CLAIM #2 — Annuler une pièce lettrée ne défait pas le lettrage : le résiduel
// de la ligne en face reste à 0 et isLettres reste true, alors que sa
// contrepartie a disparu. Odoo interdit l'annulation tant que la ligne est
// rapprochée (ou casse d'abord le rapprochement).
// ─────────────────────────────────────────────────────────────────────────
describe("CLAIM #2 — annulation d'une pièce lettrée", () => {
  it("doit restaurer le résiduel de la facture quand l'encaissement est annulé", async () => {
    const facture = await piece("VT-10", [
      { compteNumero: "411000", debit: 100000, credit: 0 },
      { compteNumero: "707000", debit: 0, credit: 100000 },
    ]);
    const encaissement = await piece("BQ-10", [
      { compteNumero: "521000", debit: 100000, credit: 0 },
      { compteNumero: "411000", debit: 0, credit: 100000 },
    ]);
    const ligneFacture = facture.lignes.find((l) => l.compteNumero === "411000")!;
    const ligneEnc = encaissement.lignes.find((l) => l.compteNumero === "411000")!;

    await createLettrage(dossierId, ligneFacture.id, ligneEnc.id, 100000);
    await annulerPiece(encaissement.id);

    const facture411 = await prisma.ligneEcriture.findUniqueOrThrow({ where: { id: ligneFacture.id } });
    // La créance client redevient ouverte : 100000 à encaisser, non lettrée.
    expect(Number(facture411.amountResidual)).toBe(100000);
    expect(facture411.isLettres).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// CLAIM #1 — Le solde de la balance est calculé à partir du résiduel de
// lettrage et non du débit − crédit. Après l'annulation de l'encaissement
// (CLAIM #2), le résiduel reste à 0 : la balance affiche un solde nul pour le
// 411 alors que la colonne débit montre 100000. Incohérence interne.
// Odoo : le solde d'un compte = débit − crédit, JAMAIS fonction du lettrage.
// ─────────────────────────────────────────────────────────────────────────
describe("CLAIM #1 — solde de balance indépendant du lettrage", () => {
  it("après annulation de l'encaissement, le 411 doit être débiteur de 100000", async () => {
    const facture = await piece("VT-20", [
      { compteNumero: "411000", debit: 100000, credit: 0 },
      { compteNumero: "707000", debit: 0, credit: 100000 },
    ]);
    const encaissement = await piece("BQ-20", [
      { compteNumero: "521000", debit: 100000, credit: 0 },
      { compteNumero: "411000", debit: 0, credit: 100000 },
    ]);
    const ligneFacture = facture.lignes.find((l) => l.compteNumero === "411000")!;
    const ligneEnc = encaissement.lignes.find((l) => l.compteNumero === "411000")!;
    await createLettrage(dossierId, ligneFacture.id, ligneEnc.id, 100000);
    await annulerPiece(encaissement.id);

    const bal = await getBalance(dossierId);
    const c411 = bal.lignes.find((l) => l.compteNumero === "411000")!;
    // Seule la facture subsiste (encaissement annulé) : 100000 au débit.
    expect(c411.debit).toBe(100000);
    expect(c411.soldeDebiteur).toBe(100000); // ← le solde DOIT suivre débit − crédit
  });
});

// ─────────────────────────────────────────────────────────────────────────
// CLAIM #5 — createLettrage ne vérifie pas que les deux lignes appartiennent
// au même dossier (celui passé en argument). Deux dossiers ayant un compte de
// même numéro peuvent voir leurs lignes lettrées ensemble.
// ─────────────────────────────────────────────────────────────────────────
describe("CLAIM #5 — isolation multi-dossier du lettrage", () => {
  it("doit refuser de lettrer deux lignes de dossiers différents", async () => {
    const ref = await prisma.referentiel.findFirstOrThrow();
    const d2 = await prisma.dossier.create({
      data: { nom: "Autre SA", ville: "Abidjan", pays: "CI", devise: "XOF", exercice: 2020, referentielId: ref.id },
    });
    await seedComptesStandards(d2.id);
    const j2 = await prisma.journal.create({ data: { code: "OD", libelle: "OD", dossierId: d2.id } });

    const f1 = await creerPiece({
      dossierId, journalId, numeroPiece: "A-1",
      lignes: [
        { compteNumero: "411000", libelleLigne: "x", debit: 5000, credit: 0 },
        { compteNumero: "707000", libelleLigne: "x", debit: 0, credit: 5000 },
      ],
    });
    const f2 = await creerPiece({
      dossierId: d2.id, journalId: j2.id, numeroPiece: "B-1",
      lignes: [
        { compteNumero: "521000", libelleLigne: "x", debit: 5000, credit: 0 },
        { compteNumero: "411000", libelleLigne: "x", debit: 0, credit: 5000 },
      ],
    });
    const ld = f1.lignes.find((l) => l.compteNumero === "411000")!;
    const lc = f2.lignes.find((l) => l.compteNumero === "411000")!;

    // Lettrer une ligne du dossier 1 avec une ligne du dossier 2 doit échouer.
    await expect(createLettrage(dossierId, ld.id, lc.id, 5000)).rejects.toThrow();
  });
});
