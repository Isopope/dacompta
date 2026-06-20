import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb, seedComptesStandards } from "./test-helpers";
import { creerPiece, listerPieces, validerPiece, annulerPiece, extournerPiece } from "./pieces";
import { creerCompte } from "./comptes";
import { creerTiers } from "./tiers";

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

describe("creerPiece", () => {
  it("refuse une ligne sur un compte inexistant", async () => {
    await expect(creerPiece({
      dossierId, journalId, numeroPiece: "ACH-X",
      lignes: [
        { compteNumero: "999999", libelleLigne: "Inconnu", debit: 100, credit: 0 },
        { compteNumero: "401000", libelleLigne: "Fournisseur", debit: 0, credit: 100 },
      ],
    })).rejects.toThrow(/compte.*inexistant|introuvable/i);
  });

  it("crée une pièce équilibrée avec ses lignes en BROUILLON", async () => {
    const p = await creerPiece({
      dossierId, journalId, numeroPiece: "ACH-001",
      lignes: [
        { compteNumero: "601000", libelleLigne: "Achat marchandises", debit: 1000, credit: 0 },
        { compteNumero: "401000", libelleLigne: "Fournisseur ACI", debit: 0, credit: 1000 },
      ],
    });
    expect(p.statut).toBe("BROUILLON");
    expect(p.lignes).toHaveLength(2);
    expect(p.lignes[0].ordre).toBe(0);
    expect(p.lignes[1].ordre).toBe(1);
  });

  it("rejette une pièce déséquilibrée", async () => {
    await expect(creerPiece({
      dossierId, journalId, numeroPiece: "ACH-002",
      lignes: [
        { compteNumero: "601000", libelleLigne: "Achat", debit: 1000, credit: 0 },
        { compteNumero: "401000", libelleLigne: "Fournisseur", debit: 0, credit: 900 },
      ],
    })).rejects.toThrow(/déséquilibr/i);
  });

  it("calcule HT/TVA/TTC à partir des lignes (TVA = comptes 445)", async () => {
    const p = await creerPiece({
      dossierId, journalId, numeroPiece: "ACH-003", fournisseur: "ACI",
      lignes: [
        { compteNumero: "601000", libelleLigne: "Achat", debit: 1000, credit: 0 },
        { compteNumero: "445660", libelleLigne: "TVA déductible", debit: 200, credit: 0 },
        { compteNumero: "401000", libelleLigne: "Fournisseur", debit: 0, credit: 1200 },
      ],
    });
    expect(Number(p.montantHT)).toBe(1000);
    expect(Number(p.montantTVA)).toBe(200);
    expect(Number(p.montantTTC)).toBe(1200);
  });

  it("refuse une ligne sur un compte collectif sans tiers", async () => {
    await creerCompte({ dossierId, numeroSaisi: "411200", intitule: "Clients collectif", collectif: true });
    await expect(creerPiece({
      dossierId, journalId, numeroPiece: "ACH-COL1",
      lignes: [
        { compteNumero: "411200", libelleLigne: "Client", debit: 1000, credit: 0 },
        { compteNumero: "601000", libelleLigne: "Achat", debit: 0, credit: 1000 },
      ],
    })).rejects.toThrow(/tiers/i);
  });

  it("accepte et enregistre le tiers sur une ligne de compte collectif", async () => {
    await creerCompte({ dossierId, numeroSaisi: "411200", intitule: "Clients collectif", collectif: true });
    const tiers = await creerTiers({ dossierId, code: "C001", nom: "Alpha", type: "CLIENT" });
    const p = await creerPiece({
      dossierId, journalId, numeroPiece: "ACH-COL2",
      lignes: [
        { compteNumero: "411200", libelleLigne: "Client", debit: 1000, credit: 0, tiersId: tiers.id },
        { compteNumero: "601000", libelleLigne: "Achat", debit: 0, credit: 1000 },
      ],
    });
    expect(p.lignes[0].tiersId).toBe(tiers.id);
    expect(p.lignes[1].tiersId).toBeNull();
  });

  it("renseigne le solde signé (balance = débit − crédit)", async () => {
    const p = await creerPiece({
      dossierId, journalId, numeroPiece: "ACH-BAL",
      lignes: [
        { compteNumero: "601000", libelleLigne: "Achat", debit: 1000, credit: 0 },
        { compteNumero: "401000", libelleLigne: "Frns", debit: 0, credit: 1000 },
      ],
    });
    expect(Number(p.lignes[0].balance)).toBe(1000);
    expect(Number(p.lignes[1].balance)).toBe(-1000);
  });

  it("enregistre la section analytique d'une ligne", async () => {
    const p = await creerPiece({
      dossierId, journalId, numeroPiece: "ACH-004",
      lignes: [
        { compteNumero: "601000", libelleLigne: "Achat", debit: 1000, credit: 0, sectionAnalytique: "SITE-A" },
        { compteNumero: "401000", libelleLigne: "Fournisseur", debit: 0, credit: 1000 },
      ],
    });
    expect(p.lignes[0].sectionAnalytique).toBe("SITE-A");
  });
});

describe("listerPieces", () => {
  it("liste les pièces du dossier avec leurs lignes, filtrables par statut", async () => {
    const a = await creerPiece({
      dossierId, journalId, numeroPiece: "ACH-010",
      lignes: [
        { compteNumero: "601000", libelleLigne: "Achat", debit: 500, credit: 0 },
        { compteNumero: "401000", libelleLigne: "Fournisseur", debit: 0, credit: 500 },
      ],
    });
    await creerPiece({
      dossierId, journalId, numeroPiece: "ACH-011",
      lignes: [
        { compteNumero: "601000", libelleLigne: "Achat", debit: 700, credit: 0 },
        { compteNumero: "401000", libelleLigne: "Fournisseur", debit: 0, credit: 700 },
      ],
    });
    await validerPiece(a.id);

    const toutes = await listerPieces(dossierId);
    expect(toutes).toHaveLength(2);
    expect(toutes[0].lignes.length).toBeGreaterThan(0);

    const validees = await listerPieces(dossierId, { statut: "VALIDEE" });
    expect(validees).toHaveLength(1);
    // numeroPiece is now assigned by the sequence: CODE/EXERCICE/NNNN.
    expect(validees[0].id).toBe(a.id);
    expect(validees[0].numeroPiece).toMatch(/^ACH\/\d{4}\/0001$/);
  });
});

describe("validerPiece", () => {
  it("passe le statut de BROUILLON à VALIDEE", async () => {
    const p = await creerPiece({
      dossierId, journalId, numeroPiece: "ACH-020",
      lignes: [
        { compteNumero: "601000", libelleLigne: "Achat", debit: 100, credit: 0 },
        { compteNumero: "401000", libelleLigne: "Fournisseur", debit: 0, credit: 100 },
      ],
    });
    const v = await validerPiece(p.id);
    expect(v.statut).toBe("VALIDEE");
  });
});

describe("annulerPiece", () => {
  it("passe le statut à ANNULEE", async () => {
    const p = await creerPiece({
      dossierId, journalId, numeroPiece: "ACH-030",
      lignes: [
        { compteNumero: "601000", libelleLigne: "Achat", debit: 100, credit: 0 },
        { compteNumero: "401000", libelleLigne: "Fournisseur", debit: 0, credit: 100 },
      ],
    });
    const a = await annulerPiece(p.id);
    expect(a.statut).toBe("ANNULEE");
  });
});

describe("annulerPiece — restitution de lettrage à la précision de la devise", () => {
  it("XOF (0 décimale) : restaure le résiduel de la contrepartie à l'unité", async () => {
    const compte = await prisma.compte.findFirstOrThrow({
      where: { dossierId, numero: "411000" },
    });
    // Deux pièces BROUILLON portant chacune une ligne sur le même compte de tiers.
    const p1 = await prisma.piece.create({
      data: {
        numeroPiece: "BR-1", datePiece: new Date(), journalId, dossierId,
        lignes: { create: [{ compteId: compte.id, compteNumero: "411000", libelleLigne: "débit", debit: 100, credit: 0, ordre: 0, amountResidual: 0, isLettres: true }] },
      },
      include: { lignes: true },
    });
    const p2 = await prisma.piece.create({
      data: {
        numeroPiece: "BR-2", datePiece: new Date(), journalId, dossierId,
        // Résiduel hérité avec une fraction sous l'unité, impossible en XOF.
        lignes: { create: [{ compteId: compte.id, compteNumero: "411000", libelleLigne: "crédit", debit: 0, credit: 100, ordre: 0, amountResidual: 0.4, isLettres: false }] },
      },
      include: { lignes: true },
    });
    await prisma.lettrage.create({
      data: { dossierId, ligneDebitId: p1.lignes[0].id, ligneCreditId: p2.lignes[0].id, montant: 100 },
    });

    await annulerPiece(p1.id);

    // 0,4 + 100 = 100 en XOF (et non 100,4).
    const apres = await prisma.ligneEcriture.findUniqueOrThrow({ where: { id: p2.lignes[0].id } });
    expect(Number(apres.amountResidual)).toBe(100);
    expect(apres.isLettres).toBe(false);
  });
});

describe("creerPiece — résiduel initialisé à la précision de la devise", () => {
  it("XOF (0 décimale) : un montant fractionnaire est arrondi à l'unité", async () => {
    // 100,4 et 100,4 s'équilibrent en XOF (arrondis à 100 de part et d'autre).
    const p = await creerPiece({
      dossierId, journalId, numeroPiece: "ACH-FRAC",
      lignes: [
        { compteNumero: "601000", libelleLigne: "Achat", debit: 100.4, credit: 0 },
        { compteNumero: "401000", libelleLigne: "Fournisseur", debit: 0, credit: 100.4 },
      ],
    });
    // Le résiduel doit être un entier XOF (100), pas 100,4.
    expect(Number(p.lignes[0].amountResidual)).toBe(100);
    expect(Number(p.lignes[1].amountResidual)).toBe(100);
  });
});

describe("extournerPiece — résiduel initialisé à la précision de la devise", () => {
  it("XOF (0 décimale) : le résiduel de l'extourne est un entier", async () => {
    const p = await creerPiece({
      dossierId, journalId, numeroPiece: "ACH-EXT",
      lignes: [
        { compteNumero: "601000", libelleLigne: "Achat", debit: 100.4, credit: 0 },
        { compteNumero: "401000", libelleLigne: "Fournisseur", debit: 0, credit: 100.4 },
      ],
    });
    await validerPiece(p.id);
    const extourne = await extournerPiece(p.id);

    const lignes = await prisma.ligneEcriture.findMany({ where: { pieceId: extourne.id } });
    for (const l of lignes) {
      expect(Number(l.amountResidual)).toBe(100);
    }
  });
});
