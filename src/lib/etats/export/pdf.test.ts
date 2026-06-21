import { describe, it, expect } from "vitest";
import { buildPdf } from "./pdf";
import type { DocId } from "./types";
import type { EtatsData } from "@/server/etats";

const data: EtatsData = {
  dossier: { nom: "Test SARL", exercice: 2020, devise: "XOF" },
  balance: {
    lignes: [
      { compteNumero: "701000", intitule: "Ventes", classeNum: 7, typeCompte: "DETAIL", ouverture: 0, soldeNMoins1: 0, debit: 0, credit: 1000, soldeDebiteur: 0, soldeCrediteur: 1000 },
    ],
    totaux: { debit: 0, credit: 1000, soldeDebiteur: 0, soldeCrediteur: 1000 },
  },
  grandLivre: [
    { compteNumero: "701000", intitule: "Ventes", classeNum: 7, totalDebit: 0, totalCredit: 1000, solde: -1000, lignes: [
      { date: "2020-03-01T00:00:00.000Z", numeroPiece: "VT-001", journalCode: "VT", libelle: "Vente", debit: 0, credit: 1000, soldeApres: -1000 },
    ] },
  ],
  bilan: { actif: [], passif: [], totalActif: 0, totalPassif: 1000, resultatNet: 1000, equilibre: false },
  compteResultat: { charges: [], produits: [{ compteNumero: "701000", intitule: "Ventes", montant: 1000, montantNMoins1: 0 }], totalCharges: 0, totalProduits: 1000, resultatNet: 1000, totalChargesNMoins1: 0, totalProduitsNMoins1: 0, resultatNetNMoins1: 0 },
  fluxTresorerie: { exploitation: { total: 1000, postes: [] }, investissement: { total: 0, postes: [] }, financement: { total: 0, postes: [] }, variationTresorerie: 1000, tresorerieOuverture: 0, tresorerieCloture: 1000 },
};

const DOCS: DocId[] = ["balance-generale", "grand-livre", "bilan", "compte-resultat", "flux-tresorerie"];

describe("buildPdf", () => {
  it.each(DOCS)("produit un PDF valide pour %s", async (docId) => {
    const buf = await buildPdf(docId, data);
    expect(buf.length).toBeGreaterThan(500);
    expect(buf.subarray(0, 4).toString("latin1")).toBe("%PDF");
  });
});
