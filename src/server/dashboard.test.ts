import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb } from "./test-helpers";
import { creerPiece, validerPiece, annulerPiece } from "./pieces";
import { getDashboardStats } from "./dashboard";

let dossierId: string;
let achId: string;
let vtId: string;
let ranId: string;

async function seedComptes() {
  const comptes = [
    { numero: "601000", intitule: "Achats marchandises", classeNum: 6 },
    { numero: "701000", intitule: "Ventes marchandises", classeNum: 7 },
    { numero: "401000", intitule: "Fournisseurs", classeNum: 4 },
    { numero: "411000", intitule: "Clients", classeNum: 4 },
    { numero: "521000", intitule: "Banque", classeNum: 5 },
    { numero: "101000", intitule: "Capital", classeNum: 1 },
  ];
  for (const c of comptes) {
    await prisma.compte.create({
      data: { ...c, type: "DETAIL", reportNplus1: false, dossierId },
    });
  }
}

beforeEach(async () => {
  dossierId = await resetDb();
  await seedComptes();
  const ach = await prisma.journal.create({ data: { code: "ACH", libelle: "Achats", dossierId } });
  const vt = await prisma.journal.create({ data: { code: "VT", libelle: "Ventes", dossierId } });
  const ran = await prisma.journal.create({ data: { code: "RAN", libelle: "Report à nouveau", dossierId } });
  // Journal sans aucune pièce : doit quand même apparaître (carte vide).
  await prisma.journal.create({ data: { code: "OD", libelle: "Opérations diverses", dossierId } });
  achId = ach.id;
  vtId = vt.id;
  ranId = ran.id;

  // Écriture d'ouverture (RAN, validée) : trésorerie 9,6M en contrepartie du capital.
  const pRan = await creerPiece({
    dossierId, journalId: ranId, numeroPiece: "RAN-2020", datePiece: new Date("2020-01-01"),
    lignes: [
      { compteNumero: "521000", libelleLigne: "Banque (ouverture)", debit: 9_600_000, credit: 0 },
      { compteNumero: "101000", libelleLigne: "Capital (ouverture)", debit: 0, credit: 9_600_000 },
    ],
  });
  await validerPiece(pRan.id);

  // Achat (ACH, validé) : charge 1000.
  const pAch1 = await creerPiece({
    dossierId, journalId: achId, numeroPiece: "ACH-001", datePiece: new Date("2020-01-05"),
    lignes: [
      { compteNumero: "601000", libelleLigne: "Achat", debit: 1000, credit: 0 },
      { compteNumero: "401000", libelleLigne: "Fournisseur", debit: 0, credit: 1000 },
    ],
  });
  await validerPiece(pAch1.id);

  // Vente (VT, validée) : CA 3000.
  const pVt = await creerPiece({
    dossierId, journalId: vtId, numeroPiece: "VT-001", datePiece: new Date("2020-01-10"),
    lignes: [
      { compteNumero: "411000", libelleLigne: "Client", debit: 3000, credit: 0 },
      { compteNumero: "701000", libelleLigne: "Vente", debit: 0, credit: 3000 },
    ],
  });
  await validerPiece(pVt.id);

  // Achat resté en BROUILLON : charge 500 (participe aux soldes, mais compté comme brouillon).
  await creerPiece({
    dossierId, journalId: achId, numeroPiece: "ACH-002", datePiece: new Date("2020-01-15"),
    lignes: [
      { compteNumero: "601000", libelleLigne: "Achat brouillon", debit: 500, credit: 0 },
      { compteNumero: "401000", libelleLigne: "Fournisseur", debit: 0, credit: 500 },
    ],
  });

  // Pièce ANNULÉE (ACH, date la plus récente) : exclue de tous les calculs et comptages.
  const pAnnul = await creerPiece({
    dossierId, journalId: achId, numeroPiece: "ACH-099", datePiece: new Date("2020-02-01"),
    lignes: [
      { compteNumero: "601000", libelleLigne: "Achat erroné", debit: 9999, credit: 0 },
      { compteNumero: "401000", libelleLigne: "Fournisseur", debit: 0, credit: 9999 },
    ],
  });
  await annulerPiece(pAnnul.id);
});

describe("getDashboardStats — KPIs globaux", () => {
  it("calcule le résultat net (produits classe 7 − charges classe 6)", async () => {
    const { kpis } = await getDashboardStats(dossierId);
    // produits 3000 − charges (1000 + 500 brouillon) = 1500
    expect(kpis.resultatNet).toBe(1500);
  });

  it("calcule la trésorerie (soldes débiteurs des comptes 5xxxxx)", async () => {
    const { kpis } = await getDashboardStats(dossierId);
    expect(kpis.tresorerie).toBe(9_600_000);
  });

  it("calcule le chiffre d'affaires (total crédits des comptes 70xxxx)", async () => {
    const { kpis } = await getDashboardStats(dossierId);
    expect(kpis.chiffreAffaires).toBe(3000);
  });

  it("calcule le total des charges (total débits des comptes 6xxxxx, brouillons inclus)", async () => {
    const { kpis } = await getDashboardStats(dossierId);
    expect(kpis.totalCharges).toBe(1500);
  });

  it("compte les pièces non annulées et les brouillons en attente", async () => {
    const { kpis } = await getDashboardStats(dossierId);
    // RAN, ACH-001, VT-001, ACH-002 = 4 (ACH-099 annulée exclue)
    expect(kpis.nbPieces).toBe(4);
    expect(kpis.nbBrouillons).toBe(1); // seul ACH-002
  });
});

describe("getDashboardStats — cartes par journal", () => {
  it("retourne tous les journaux du dossier, triés par code", async () => {
    const { journaux } = await getDashboardStats(dossierId);
    expect(journaux.map((j) => j.code)).toEqual(["ACH", "OD", "RAN", "VT"]);
  });

  it("compte les pièces (total non annulées) et les brouillons par journal", async () => {
    const { journaux } = await getDashboardStats(dossierId);
    const ach = journaux.find((j) => j.code === "ACH")!;
    expect(ach.libelle).toBe("Achats");
    expect(ach.nbPieces).toBe(2); // ACH-001 + ACH-002 (ACH-099 annulée exclue)
    expect(ach.nbBrouillons).toBe(1);
  });

  it("calcule le volume (débits/crédits) et le solde des lignes par journal", async () => {
    const { journaux } = await getDashboardStats(dossierId);
    const ach = journaux.find((j) => j.code === "ACH")!;
    expect(ach.totalDebit).toBe(1500); // 1000 + 500
    expect(ach.totalCredit).toBe(1500);
    expect(ach.solde).toBe(0); // partie double : équilibré
  });

  it("retourne la dernière date d'écriture (ISO), en ignorant les pièces annulées", async () => {
    const { journaux } = await getDashboardStats(dossierId);
    const ach = journaux.find((j) => j.code === "ACH")!;
    // ACH-002 (2020-01-15), pas ACH-099 annulée (2020-02-01)
    expect(ach.derniereDate).toBe(new Date("2020-01-15").toISOString());
  });

  it("retourne une carte vide (zéros, date nulle) pour un journal sans pièce", async () => {
    const { journaux } = await getDashboardStats(dossierId);
    const od = journaux.find((j) => j.code === "OD")!;
    expect(od.nbPieces).toBe(0);
    expect(od.nbBrouillons).toBe(0);
    expect(od.totalDebit).toBe(0);
    expect(od.solde).toBe(0);
    expect(od.derniereDate).toBeNull();
  });
});
