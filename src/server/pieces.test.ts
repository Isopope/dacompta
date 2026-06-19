import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb, seedComptesStandards } from "./test-helpers";
import { creerPiece, listerPieces, validerPiece, annulerPiece } from "./pieces";

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
    expect(validees[0].numeroPiece).toBe("ACH-010");
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
