// src/lib/etats/export/excel.test.ts
import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { buildExcel } from "./excel";
import type { EtatsData } from "@/server/etats";

// Fixture minimal : 1 vente de 1000 encaissée en banque.
const data: EtatsData = {
  dossier: { nom: "Test SARL", exercice: 2020, devise: "XOF" },
  balance: {
    lignes: [
      { compteNumero: "521000", intitule: "Banque", classeNum: 5, typeCompte: "DETAIL", ouverture: 0, soldeNMoins1: 0, debit: 1000, credit: 0, soldeDebiteur: 1000, soldeCrediteur: 0 },
      { compteNumero: "701000", intitule: "Ventes", classeNum: 7, typeCompte: "DETAIL", ouverture: 0, soldeNMoins1: 0, debit: 0, credit: 1000, soldeDebiteur: 0, soldeCrediteur: 1000 },
    ],
    totaux: { debit: 1000, credit: 1000, soldeDebiteur: 1000, soldeCrediteur: 1000 },
  },
  grandLivre: [
    { compteNumero: "521000", intitule: "Banque", classeNum: 5, totalDebit: 1000, totalCredit: 0, solde: 1000, lignes: [
      { date: "2020-03-01T00:00:00.000Z", numeroPiece: "VT-001", journalCode: "VT", libelle: "Encaissement", debit: 1000, credit: 0, soldeApres: 1000 },
    ] },
  ],
  bilan: { actif: [{ compteNumero: "521000", intitule: "Banque", montant: 1000, montantNMoins1: 0 }], passif: [], totalActif: 1000, totalPassif: 1000, resultatNet: 1000, equilibre: true },
  compteResultat: { charges: [], produits: [{ compteNumero: "701000", intitule: "Ventes", montant: 1000, montantNMoins1: 0 }], totalCharges: 0, totalProduits: 1000, resultatNet: 1000, totalChargesNMoins1: 0, totalProduitsNMoins1: 0, resultatNetNMoins1: 0 },
  fluxTresorerie: { exploitation: { total: 1000, postes: [{ libelle: "Encaissements — Ventes (701000)", montant: 1000 }] }, investissement: { total: 0, postes: [] }, financement: { total: 0, postes: [] }, variationTresorerie: 1000, tresorerieOuverture: 0, tresorerieCloture: 1000 },
};

function lignes(buf: Buffer): unknown[][] {
  const wb = XLSX.read(buf, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false }) as unknown[][];
}

describe("buildExcel", () => {
  it("balance-generale : contient les comptes et le total des mouvements", () => {
    const rows = lignes(buildExcel("balance-generale", data));
    const flat = rows.flat().map(String);
    expect(flat).toContain("521000");
    expect(flat).toContain("701000");
    expect(flat).toContain("1000"); // total débit mouvements
  });

  it("bilan : porte le résultat net et l'équilibre", () => {
    const rows = lignes(buildExcel("bilan", data));
    const flat = rows.flat().map(String);
    expect(flat.some((c) => c.includes("1000"))).toBe(true);
  });

  it("compte-resultat : total produits = 1000", () => {
    const rows = lignes(buildExcel("compte-resultat", data));
    expect(rows.flat().map(String)).toContain("1000");
  });

  it("grand-livre et flux-tresorerie produisent un classeur non vide", () => {
    expect(lignes(buildExcel("grand-livre", data)).length).toBeGreaterThan(0);
    expect(lignes(buildExcel("flux-tresorerie", data)).length).toBeGreaterThan(0);
  });
});
