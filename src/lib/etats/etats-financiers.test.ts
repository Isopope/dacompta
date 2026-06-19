import { describe, it, expect } from "vitest";
import type { BalanceLigne, BalanceResultat } from "@/server/balance";
import { deriverBilan, deriverCompteResultat, deriverFluxTresorerie } from "./etats-financiers";

function ligne(p: Partial<BalanceLigne> & { compteNumero: string; classeNum: number }): BalanceLigne {
  return {
    intitule: "Compte " + p.compteNumero,
    typeCompte: "DETAIL",
    ouverture: 0,
    soldeNMoins1: p.ouverture ?? 0,
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
// Contrôle d'équilibre des mouvements de la période (hors RAN) :
//   Débit  = 36M (241) + 30M (411) + 2M (571) + 30M (601) = 98 000 000
//   Crédit = 50M (101) +  8M (521) + 40M (701)            = 98 000 000
// Le TFT s'appuie sur ces mouvements (debit/credit), pas sur les soldes : les
// soldes d'ouverture (RAN) sont déjà comptés dans tresorerieOuverture.
const balance: BalanceResultat = {
  lignes: [
    ligne({ compteNumero: "101300", classeNum: 1, intitule: "Capital social", soldeCrediteur: 50_000_000, ouverture: -50_000_000, credit: 50_000_000 }),
    ligne({ compteNumero: "241000", classeNum: 2, intitule: "Matériel", soldeDebiteur: 36_000_000, ouverture: 20_000_000, debit: 36_000_000 }),
    ligne({ compteNumero: "411000", classeNum: 4, intitule: "Clients", soldeDebiteur: 30_000_000, debit: 30_000_000 }),
    ligne({ compteNumero: "521100", classeNum: 5, intitule: "Banque (découvert)", soldeCrediteur: 8_000_000, credit: 8_000_000 }),
    ligne({ compteNumero: "571100", classeNum: 5, intitule: "Caisse", soldeDebiteur: 2_000_000, debit: 2_000_000 }),
    ligne({ compteNumero: "601100", classeNum: 6, intitule: "Achats", soldeDebiteur: 30_000_000, debit: 30_000_000 }),
    ligne({ compteNumero: "701100", classeNum: 7, intitule: "Ventes", soldeCrediteur: 40_000_000, credit: 40_000_000 }),
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

describe("deriverCompteResultat — N-1 (snapshot)", () => {
  // soldeNMoins1 est signé débit − crédit : charge (débit) > 0, produit (crédit) < 0.
  const balanceN1: BalanceResultat = {
    lignes: [
      ligne({ compteNumero: "601100", classeNum: 6, intitule: "Achats", soldeDebiteur: 30_000_000, soldeNMoins1: 25_000_000 }),
      ligne({ compteNumero: "701100", classeNum: 7, intitule: "Ventes", soldeCrediteur: 40_000_000, soldeNMoins1: -32_000_000 }),
    ],
    totaux: { debit: 0, credit: 0, soldeDebiteur: 0, soldeCrediteur: 0 },
  };

  it("expose le montant N-1 par poste, signé comme le montant N, et les totaux N-1", () => {
    const cr = deriverCompteResultat(balanceN1);
    const achats = cr.charges.find((c) => c.compteNumero === "601100")!;
    expect(achats.montant).toBe(30_000_000);
    expect(achats.montantNMoins1).toBe(25_000_000); // charge : sens +1
    const ventes = cr.produits.find((p) => p.compteNumero === "701100")!;
    expect(ventes.montant).toBe(40_000_000);
    expect(ventes.montantNMoins1).toBe(32_000_000); // produit : sens −1 → −(−32M)
    expect(cr.totalChargesNMoins1).toBe(25_000_000);
    expect(cr.totalProduitsNMoins1).toBe(32_000_000);
    expect(cr.resultatNetNMoins1).toBe(7_000_000); // 32M − 25M
  });

  it("inclut un poste qui n'a qu'un réalisé N-1 (aucun mouvement N)", () => {
    const balanceOnlyN1: BalanceResultat = {
      lignes: [ligne({ compteNumero: "605300", classeNum: 6, intitule: "Carburant", soldeNMoins1: 5_000_000 })],
      totaux: { debit: 0, credit: 0, soldeDebiteur: 0, soldeCrediteur: 0 },
    };
    const cr = deriverCompteResultat(balanceOnlyN1);
    expect(cr.charges.map((c) => c.compteNumero)).toEqual(["605300"]);
    expect(cr.charges[0].montant).toBe(0);
    expect(cr.charges[0].montantNMoins1).toBe(5_000_000);
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

  it("expose le montant N-1 (ouverture) sur chaque poste, signé comme le montant N", () => {
    const bilan = deriverBilan(balance);
    // Actif débiteur : N-1 = ouverture telle quelle (matériel acquis +16M durant N).
    const materiel = bilan.actif.find((p) => p.compteNumero === "241000")!;
    expect(materiel.montant).toBe(36_000_000);
    expect(materiel.montantNMoins1).toBe(20_000_000);
    // Passif créditeur : N-1 = ouverture en valeur absolue (capital stable).
    const capital = bilan.passif.find((p) => p.compteNumero === "101300")!;
    expect(capital.montant).toBe(50_000_000);
    expect(capital.montantNMoins1).toBe(50_000_000);
    // Compte sans RAN : N-1 = 0.
    const client = bilan.actif.find((p) => p.compteNumero === "411000")!;
    expect(client.montantNMoins1).toBe(0);
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

describe("deriverFluxTresorerie", () => {
  it("calcule le flux d'exploitation (produits encaissés − charges − variation BFRE)", () => {
    const flux = deriverFluxTresorerie(balance);
    // Ventes 701100 +40M (entrée) − Achats 601100 30M (sortie) − Clients 411000 30M (BFRE, sortie)
    expect(flux.exploitation.total).toBe(-20_000_000);
    const libelles = flux.exploitation.postes.map((p) => p.libelle).join(" | ");
    expect(libelles).toContain("701100");
    expect(libelles).toContain("601100");
    expect(libelles).toContain("411000"); // créance client = besoin en fonds de roulement
  });

  it("classe l'acquisition d'immobilisations (classe 2 débitée) en sortie d'investissement", () => {
    const flux = deriverFluxTresorerie(balance);
    // Matériel 241000 acquis (débit 36M) → sortie
    expect(flux.investissement.total).toBe(-36_000_000);
    expect(flux.investissement.postes[0].libelle).toContain("Acquisition");
    expect(flux.investissement.postes[0].montant).toBe(-36_000_000);
  });

  it("classe l'augmentation de capital (101 crédité) en entrée de financement", () => {
    const flux = deriverFluxTresorerie(balance);
    expect(flux.financement.total).toBe(50_000_000);
    expect(flux.financement.postes[0].libelle).toContain("Augmentation de capital");
    expect(flux.financement.postes[0].montant).toBe(50_000_000);
  });

  it("la variation de trésorerie = somme des trois catégories", () => {
    const flux = deriverFluxTresorerie(balance);
    expect(flux.variationTresorerie).toBe(
      flux.exploitation.total + flux.investissement.total + flux.financement.total
    );
    expect(flux.variationTresorerie).toBe(-6_000_000); // -20M -36M +50M
  });

  it("boucle : trésorerie de clôture = ouverture + variation, et reflète les comptes 52/57", () => {
    const flux = deriverFluxTresorerie(balance);
    expect(flux.tresorerieOuverture).toBe(0); // exercice neuf, aucun RAN
    expect(flux.tresorerieCloture).toBe(flux.tresorerieOuverture + flux.variationTresorerie);
    // Contrôle indépendant : solde net des disponibilités 521100 (−8M) + 571100 (+2M) = −6M
    const tresoBalance = balance.lignes
      .filter((l) => l.compteNumero.startsWith("52") || l.compteNumero.startsWith("57"))
      .reduce((s, l) => s + l.soldeDebiteur - l.soldeCrediteur, 0);
    expect(flux.tresorerieCloture).toBe(tresoBalance);
  });

  it("ignore les postes à montant nul", () => {
    const flux = deriverFluxTresorerie(balance);
    const tous = [...flux.exploitation.postes, ...flux.investissement.postes, ...flux.financement.postes];
    expect(tous.every((p) => p.montant !== 0)).toBe(true);
  });
});
