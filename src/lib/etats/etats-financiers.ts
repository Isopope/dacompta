// États financiers simplifiés (SYSCOHADA) déduits de la balance.
// « Rien à fabriquer — tout vient des écritures » : Bilan et Compte de résultat
// se calculent directement à partir des soldes de la balance générale.
import type { BalanceLigne, BalanceResultat, GrandLivreCompte } from "@/server/balance";

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
 *  - Actif  = soldes débiteurs des classes 2-3-4-5 (immobilisations, stocks,
 *    créances, trésorerie débitrice)
 *  - Passif = soldes créditeurs des classes 1-4-5 (capitaux propres, dettes,
 *    trésorerie créditrice = découvert bancaire) + résultat de l'exercice
 *  - Le résultat net (produits 7 − charges 6) s'ajoute aux capitaux propres au passif.
 *
 * Tant que la balance est équilibrée (débit = crédit, ce qui est garanti par la
 * partie double) et que les capitaux propres (classe 1) sont créditeurs et les
 * classes 2-3 débitrices, le bilan s'équilibre : totalActif === totalPassif.
 */
export function deriverBilan(balance: BalanceResultat): Bilan {
  const actif = balance.lignes
    .filter((l) => [2, 3, 4, 5].includes(l.classeNum) && l.soldeDebiteur > 0)
    .map((l) => poste(l, l.soldeDebiteur));
  const passif = balance.lignes
    .filter((l) => [1, 4, 5].includes(l.classeNum) && l.soldeCrediteur > 0)
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

// ───────────────────────────── Tableau des Flux de Trésorerie ─────────────────
// (AUDCIF 2017 : remplace le TAFIRE dans la liasse SYSCOHADA.)
//
// Méthode directe simplifiée déduite de la balance. Pour chaque compte hors
// trésorerie, l'impact sur la trésorerie est le flux net entrant :
//   flux = crédit − débit = soldeCréditeur − soldeDébiteur
// (un compte crédité encaisse, un compte débité décaisse). Par la partie double,
// la somme de ces flux sur tous les comptes hors trésorerie égale exactement la
// variation des comptes de trésorerie (52, 57) — le tableau « boucle » donc tout
// seul : variationTresorerie === tresorerieCloture − tresorerieOuverture.

export interface FluxPoste {
  libelle: string;
  montant: number; // > 0 = entrée d'argent, < 0 = sortie
}

export interface FluxCategorie {
  total: number;
  postes: FluxPoste[];
}

export interface FluxTresorerie {
  exploitation: FluxCategorie;
  investissement: FluxCategorie;
  financement: FluxCategorie;
  variationTresorerie: number;
  tresorerieOuverture: number;
  tresorerieCloture: number;
}

// Flux entrant net d'un compte : crédité = entrée (+), débité = sortie (−).
const fluxNet = (l: BalanceLigne) => l.soldeCrediteur - l.soldeDebiteur;
// Comptes de trésorerie active : disponibilités banque (52) et caisse (57).
const estTresorerie = (numero: string) => numero.startsWith("52") || numero.startsWith("57");
// Postes du besoin en fonds de roulement d'exploitation (créances/dettes courantes).
const PREFIXES_BFRE = ["401", "411", "443", "445", "421"];
const estBFRE = (numero: string) => PREFIXES_BFRE.some((p) => numero.startsWith(p));

function categorie(postes: FluxPoste[]): FluxCategorie {
  const filtres = postes.filter((p) => p.montant !== 0);
  return { total: arrondi(filtres.reduce((s, p) => s + p.montant, 0)), postes: filtres };
}

/**
 * Tableau des Flux de Trésorerie (3 catégories : exploitation, investissement,
 * financement). Déduit de la balance ; `grandLivre` est accepté pour un usage
 * futur (détail par mouvement) mais n'est pas requis pour le POC.
 */
export function deriverFluxTresorerie(
  balance: BalanceResultat,
  grandLivre?: GrandLivreCompte[]
): FluxTresorerie {
  void grandLivre; // réservé : détail par écriture (non utilisé dans le POC)

  // A. Exploitation : produits (7) encaissés, charges (6) décaissées, variation du BFRE.
  const exploitation = categorie([
    ...balance.lignes
      .filter((l) => l.classeNum === 7)
      .map((l) => ({ libelle: `Encaissements — ${l.intitule} (${l.compteNumero})`, montant: fluxNet(l) })),
    ...balance.lignes
      .filter((l) => l.classeNum === 6)
      .map((l) => ({ libelle: `Décaissements — ${l.intitule} (${l.compteNumero})`, montant: fluxNet(l) })),
    ...balance.lignes
      .filter((l) => estBFRE(l.compteNumero))
      .map((l) => ({ libelle: `Variation BFRE — ${l.intitule} (${l.compteNumero})`, montant: fluxNet(l) })),
  ]);

  // B. Investissement : acquisitions (débit, −) et cessions (crédit, +) d'immobilisations (classe 2).
  const investissement = categorie(
    balance.lignes
      .filter((l) => l.classeNum === 2)
      .map((l) => ({
        libelle: `${fluxNet(l) < 0 ? "Acquisition" : "Cession"} — ${l.intitule} (${l.compteNumero})`,
        montant: fluxNet(l),
      }))
  );

  // C. Financement : augmentation de capital (101), emprunts nouveaux/remboursés (162).
  const financement = categorie(
    balance.lignes
      .filter((l) => l.compteNumero.startsWith("101") || l.compteNumero.startsWith("162"))
      .map((l) => {
        const emprunt = l.compteNumero.startsWith("162");
        const libelle = emprunt
          ? `${fluxNet(l) >= 0 ? "Nouvel emprunt" : "Remboursement d'emprunt"} — ${l.intitule} (${l.compteNumero})`
          : `Augmentation de capital — ${l.intitule} (${l.compteNumero})`;
        return { libelle, montant: fluxNet(l) };
      })
  );

  const variationTresorerie = arrondi(
    exploitation.total + investissement.total + financement.total
  );
  // Trésorerie d'ouverture : soldes reportés (RAN) des comptes 52/57 ; 0 en exercice neuf.
  const tresorerieOuverture = arrondi(
    balance.lignes
      .filter((l) => estTresorerie(l.compteNumero))
      .reduce((s, l) => s + l.ouverture, 0)
  );
  const tresorerieCloture = arrondi(tresorerieOuverture + variationTresorerie);

  return {
    exploitation,
    investissement,
    financement,
    variationTresorerie,
    tresorerieOuverture,
    tresorerieCloture,
  };
}
