// États financiers simplifiés (SYSCOHADA) déduits de la balance.
// « Rien à fabriquer — tout vient des écritures » : Bilan et Compte de résultat
// se calculent directement à partir des soldes de la balance générale.
import type { BalanceLigne, BalanceResultat } from "@/server/balance";

export interface PosteEtat {
  compteNumero: string;
  intitule: string;
  montant: number;
}

export interface Bilan {
  actif: PosteEtat[];
  passif: PosteEtat[];
  totalActif: number;
  totalPassif: number;
  resultatNet: number; // produits (7) − charges (6) ; reporté au passif
  equilibre: boolean;
}

export interface CompteResultat {
  charges: PosteEtat[];
  produits: PosteEtat[];
  totalCharges: number;
  totalProduits: number;
  resultatNet: number; // > 0 = bénéfice, < 0 = perte
}

const arrondi = (n: number) => Math.round(n * 100) / 100;
const poste = (l: BalanceLigne, montant: number): PosteEtat => ({
  compteNumero: l.compteNumero,
  intitule: l.intitule,
  montant: arrondi(montant),
});

/**
 * Compte de résultat simplifié : charges = classe 6, produits = classe 7,
 * résultat net = produits − charges.
 */
export function deriverCompteResultat(balance: BalanceResultat): CompteResultat {
  const charges = balance.lignes
    .filter((l) => l.classeNum === 6 && l.soldeDebiteur - l.soldeCrediteur !== 0)
    .map((l) => poste(l, l.soldeDebiteur - l.soldeCrediteur));
  const produits = balance.lignes
    .filter((l) => l.classeNum === 7 && l.soldeCrediteur - l.soldeDebiteur !== 0)
    .map((l) => poste(l, l.soldeCrediteur - l.soldeDebiteur));

  const totalCharges = arrondi(charges.reduce((s, p) => s + p.montant, 0));
  const totalProduits = arrondi(produits.reduce((s, p) => s + p.montant, 0));
  return {
    charges,
    produits,
    totalCharges,
    totalProduits,
    resultatNet: arrondi(totalProduits - totalCharges),
  };
}

/**
 * Bilan simplifié :
 *  - Actif  = soldes débiteurs des classes 2-3-4-5 (immobilisations, stocks, créances, trésorerie)
 *  - Passif = soldes créditeurs des classes 1-4 (capitaux, dettes) + résultat de l'exercice
 *  - Le résultat net (produits 7 − charges 6) équilibre le passif.
 */
export function deriverBilan(balance: BalanceResultat): Bilan {
  const actif = balance.lignes
    .filter((l) => [2, 3, 4, 5].includes(l.classeNum) && l.soldeDebiteur > 0)
    .map((l) => poste(l, l.soldeDebiteur));
  const passif = balance.lignes
    .filter((l) => [1, 4].includes(l.classeNum) && l.soldeCrediteur > 0)
    .map((l) => poste(l, l.soldeCrediteur));

  const resultatNet = deriverCompteResultat(balance).resultatNet;
  const totalActif = arrondi(actif.reduce((s, p) => s + p.montant, 0));
  const totalPassifHorsResultat = arrondi(passif.reduce((s, p) => s + p.montant, 0));
  const totalPassif = arrondi(totalPassifHorsResultat + resultatNet);

  return {
    actif,
    passif,
    totalActif,
    totalPassif,
    resultatNet,
    equilibre: Math.abs(totalActif - totalPassif) < 0.01,
  };
}
