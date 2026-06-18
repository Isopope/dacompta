import { describe, it, expect } from "vitest";
import type { BalanceLigne, BalanceResultat } from "@/server/balance";
import { deriverBilan, deriverCompteResultat } from "./etats-financiers";

function ligne(p: Partial<BalanceLigne> & { compteNumero: string; classeNum: number }): BalanceLigne {
  return {
    intitule: "Compte " + p.compteNumero,
    typeCompte: "DETAIL",
    ouverture: 0,
    debit: 0,
    credit: 0,
    soldeDebiteur: 0,
    soldeCrediteur: 0,
    ...p,
  };
}

// Cas fil rouge SYSCOHADA, équilibré (débit = crédit comme toute balance issue
// de la partie double). Il combine une écriture d'ouverture (RAN) et l'activité
// de l'exercice :
//   Ouverture :  Capital 101300 = 50 000 000 (C)
//                Matériel 241000 = 36 000 000 (D)
//                Caisse   571100 =  2 000 000 (D)
//                Banque   521100 = 12 000 000 (D)
//   Exercice  :  Ventes 701100 = 40 000 000 (C) → encaissées (banque +)
//                Achats 601100 = 30 000 000 (D) → réglés (banque −)
//                Clients 411000 = 30 000 000 (D) (créances non encore encaissées)
// Après ces mouvements la banque (521100) passe en découvert : solde créditeur
// 8 000 000 → trésorerie créditrice au passif (classe 5 créditeur).
//
// Contrôle d'équilibre de la balance :
//   Débit  = 36M (241) + 30M (411) + 2M (571) + 30M (601) = 98 000 000
//   Crédit = 50M (101) +  8M (521) + 40M (701)            = 98 000 000
const balance: BalanceResultat = {
  lignes: [
    ligne({ compteNumero: "101300", classeNum: 1, intitule: "Capital social", soldeCrediteur: 50_000_000 }),
    ligne({ compteNumero: "241000", classeNum: 2, intitule: "Matériel", soldeDebiteur: 36_000_000 }),
    ligne({ compteNumero: "411000", classeNum: 4, intitule: "Clients", soldeDebiteur: 30_000_000 }),
    ligne({ compteNumero: "521100", classeNum: 5, intitule: "Banque (découvert)", soldeCrediteur: 8_000_000 }),
    ligne({ compteNumero: "571100", classeNum: 5, intitule: "Caisse", soldeDebiteur: 2_000_000 }),
    ligne({ compteNumero: "601100", classeNum: 6, intitule: "Achats", soldeDebiteur: 30_000_000 }),
    ligne({ compteNumero: "701100", classeNum: 7, intitule: "Ventes", soldeCrediteur: 40_000_000 }),
  ],
  totaux: {
    debit: 98_000_000,
    credit: 98_000_000,
    soldeDebiteur: 98_000_000,
    soldeCrediteur: 98_000_000,
  },
};

describe("deriverCompteResultat", () => {
  it("sépare charges (6) et produits (7) et calcule le résultat net", () => {
    const cr = deriverCompteResultat(balance);
    expect(cr.charges.map((c) => c.compteNumero)).toEqual(["601100"]);
    expect(cr.produits.map((p) => p.compteNumero)).toEqual(["701100"]);
    expect(cr.totalCharges).toBe(30_000_000);
    expect(cr.totalProduits).toBe(40_000_000);
    expect(cr.resultatNet).toBe(10_000_000); // bénéfice
  });
});

describe("deriverBilan", () => {
  it("classe l'actif (2-3-4-5 débiteurs) et le passif (1-4-5 créditeurs)", () => {
    const bilan = deriverBilan(balance);
    // Actif : immobilisations + créances + trésorerie débitrice (caisse)
    expect(bilan.actif.map((p) => p.compteNumero).sort()).toEqual(["241000", "411000", "571100"]);
    // Passif : capitaux propres + trésorerie créditrice (découvert bancaire)
    expect(bilan.passif.map((p) => p.compteNumero).sort()).toEqual(["101300", "521100"]);
    expect(bilan.totalActif).toBe(68_000_000); // 36M + 30M + 2M
  });

  it("inclut la trésorerie créditrice (classe 5) au passif comme découvert", () => {
    const bilan = deriverBilan(balance);
    const decouvert = bilan.passif.find((p) => p.compteNumero === "521100");
    expect(decouvert).toBeDefined();
    expect(decouvert!.montant).toBe(8_000_000);
  });

  it("équilibre actif = passif via le résultat net reporté aux capitaux propres", () => {
    const bilan = deriverBilan(balance);
    expect(bilan.resultatNet).toBe(10_000_000);
    // Passif = capital 50M + découvert 8M + résultat 10M = 68M = actif
    expect(bilan.totalPassif).toBe(68_000_000);
    expect(bilan.totalActif).toBe(bilan.totalPassif);
    expect(bilan.equilibre).toBe(true);
  });
});
