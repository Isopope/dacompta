export type Famille =
  | "TIERS" | "CAPITAUX" | "TRESORERIE" | "GESTION" | "IMMO" | "STOCK";

export interface ClasseDef { numero: number; libelle: string; }
export interface NatureDef { racine: string; libelle: string; famille: Famille; reportNplus1: boolean; }
export interface PaysDef { pays: string; capitale: string; devise: string; tva: number; }

export const REFERENTIEL_CODE = "SYSCOHADA_REVISE";
export const REFERENTIEL_LIBELLE = "SYSCOHADA révisé (AUDCIF 2017)";

// 9 classes — colonne vertébrale du plan comptable.
export const CLASSES: ClasseDef[] = [
  { numero: 1, libelle: "Ressources durables" },
  { numero: 2, libelle: "Actif immobilisé" },
  { numero: 3, libelle: "Stocks" },
  { numero: 4, libelle: "Tiers" },
  { numero: 5, libelle: "Trésorerie" },
  { numero: 6, libelle: "Charges des activités ordinaires" },
  { numero: 7, libelle: "Produits des activités ordinaires" },
  { numero: 8, libelle: "Autres charges & produits (HAO)" },
  { numero: 9, libelle: "Analytique & engagements" },
];

// Natures auto-déduites de la racine — conformes SYSCOHADA révisé.
export const NATURES: NatureDef[] = [
  { racine: "11", libelle: "Réserves", famille: "CAPITAUX", reportNplus1: true },
  { racine: "12", libelle: "Report à nouveau", famille: "CAPITAUX", reportNplus1: true },
  { racine: "40", libelle: "Fournisseurs", famille: "TIERS", reportNplus1: false },
  { racine: "41", libelle: "Clients", famille: "TIERS", reportNplus1: false },
  { racine: "42", libelle: "Personnel", famille: "TIERS", reportNplus1: false },
  { racine: "43", libelle: "Organismes sociaux", famille: "TIERS", reportNplus1: false },
  { racine: "44", libelle: "État & collectivités", famille: "TIERS", reportNplus1: false },
  { racine: "52", libelle: "Banques", famille: "TRESORERIE", reportNplus1: true },
  { racine: "57", libelle: "Caisse", famille: "TRESORERIE", reportNplus1: true },
  { racine: "6", libelle: "Charges (activités ordinaires)", famille: "GESTION", reportNplus1: false },
  { racine: "7", libelle: "Produits (activités ordinaires)", famille: "GESTION", reportNplus1: false },
  { racine: "8", libelle: "Charges & produits HAO", famille: "GESTION", reportNplus1: false },
];

// 17 pays OHADA (pour le dossier par défaut + future config par pays).
export const PAYS: PaysDef[] = [
  { pays: "Bénin", capitale: "Cotonou", devise: "XOF", tva: 18 },
  { pays: "Burkina Faso", capitale: "Ouagadougou", devise: "XOF", tva: 18 },
  { pays: "Cameroun", capitale: "Yaoundé", devise: "XAF", tva: 19.25 },
  { pays: "Centrafrique", capitale: "Bangui", devise: "XAF", tva: 19 },
  { pays: "Comores", capitale: "Moroni", devise: "KMF", tva: 10 },
  { pays: "Congo", capitale: "Brazzaville", devise: "XAF", tva: 18.9 },
  { pays: "Côte d'Ivoire", capitale: "Abidjan", devise: "XOF", tva: 18 },
  { pays: "Gabon", capitale: "Libreville", devise: "XAF", tva: 18 },
  { pays: "Guinée", capitale: "Conakry", devise: "GNF", tva: 18 },
  { pays: "Guinée-Bissau", capitale: "Bissau", devise: "XOF", tva: 10 },
  { pays: "Guinée Équatoriale", capitale: "Malabo", devise: "XAF", tva: 15 },
  { pays: "Mali", capitale: "Bamako", devise: "XOF", tva: 18 },
  { pays: "Niger", capitale: "Niamey", devise: "XOF", tva: 19 },
  { pays: "RDC", capitale: "Kinshasa", devise: "CDF", tva: 16 },
  { pays: "Sénégal", capitale: "Dakar", devise: "XOF", tva: 18 },
  { pays: "Tchad", capitale: "N'Djamena", devise: "XAF", tva: 18 },
  { pays: "Togo", capitale: "Lomé", devise: "XOF", tva: 18 },
];

// Comptes du cas fil rouge "Les Associés SA" (numéro, intitulé, type, collectif).
export interface CompteSeed { numero: string; intitule: string; type: "DETAIL" | "TOTAL"; collectif?: boolean; }
export const COMPTES_LES_ASSOCIES: CompteSeed[] = [
  { numero: "101300", intitule: "Capital souscrit appelé versé", type: "DETAIL" },
  { numero: "120000", intitule: "Report à nouveau", type: "TOTAL" },
  { numero: "121000", intitule: "Report à nouveau créditeur", type: "DETAIL" },
  { numero: "129000", intitule: "Report à nouveau débiteur", type: "DETAIL" },
  { numero: "162000", intitule: "Emprunts auprès des établissements de crédit", type: "DETAIL" },
  { numero: "245100", intitule: "Matériel de transport", type: "DETAIL" },
  { numero: "401100", intitule: "Fournisseurs", type: "DETAIL", collectif: true },
  { numero: "411100", intitule: "Clients", type: "DETAIL", collectif: true },
  { numero: "443100", intitule: "TVA facturée (collectée)", type: "DETAIL" },
  { numero: "445100", intitule: "TVA récupérable sur immobilisations", type: "DETAIL" },
  { numero: "445200", intitule: "TVA récupérable sur achats", type: "DETAIL" },
  { numero: "521100", intitule: "Banque BIMA", type: "DETAIL" },
  { numero: "521200", intitule: "Banque BTCI", type: "DETAIL" },
  { numero: "571100", intitule: "Caisse siège", type: "DETAIL" },
  { numero: "601100", intitule: "Achats de marchandises", type: "DETAIL" },
  { numero: "661100", intitule: "Appointements et salaires", type: "DETAIL" },
  { numero: "421000", intitule: "Personnel, rémunérations dues", type: "DETAIL" },
  { numero: "605300", intitule: "Achat carburant", type: "DETAIL" },
  { numero: "706100", intitule: "Recette transport", type: "DETAIL" },
];

// Plan SYSCOHADA de base, générique et réutilisable pour tout NOUVEAU dossier.
// Donnée de référence propre — à NE PAS confondre avec COMPTES_LES_ASSOCIES (démo
// spécifique au cas « Les Associés SA »). classeNum/natureRacine/accountType, etc.
// sont DÉRIVÉS à la création (voir creerDossier), pas stockés ici.
export const COMPTES_BASE_SYSCOHADA: CompteSeed[] = [
  // Classe 1 — Ressources durables
  { numero: "101000", intitule: "Capital social", type: "DETAIL" },
  { numero: "106000", intitule: "Réserves (légales et autres)", type: "DETAIL" },
  { numero: "120000", intitule: "Report à nouveau", type: "DETAIL" },
  { numero: "130000", intitule: "Résultat net de l'exercice", type: "DETAIL" },
  { numero: "162000", intitule: "Emprunts auprès des établissements de crédit", type: "DETAIL" },
  { numero: "165000", intitule: "Dépôts et cautionnements reçus", type: "DETAIL" },
  // Classe 2 — Actif immobilisé
  { numero: "213000", intitule: "Logiciels", type: "DETAIL" },
  { numero: "220000", intitule: "Terrains", type: "DETAIL" },
  { numero: "231000", intitule: "Bâtiments", type: "DETAIL" },
  { numero: "241000", intitule: "Matériel et outillage", type: "DETAIL" },
  { numero: "244000", intitule: "Matériel et mobilier de bureau", type: "DETAIL" },
  { numero: "245000", intitule: "Matériel de transport", type: "DETAIL" },
  { numero: "275000", intitule: "Dépôts et cautionnements versés", type: "DETAIL" },
  { numero: "281000", intitule: "Amortissements des bâtiments", type: "DETAIL" },
  { numero: "284400", intitule: "Amortissements du matériel et mobilier de bureau", type: "DETAIL" },
  { numero: "284500", intitule: "Amortissements du matériel de transport", type: "DETAIL" },
  // Classe 3 — Stocks
  { numero: "311000", intitule: "Marchandises", type: "DETAIL" },
  { numero: "321000", intitule: "Matières premières et fournitures", type: "DETAIL" },
  { numero: "351000", intitule: "Produits finis", type: "DETAIL" },
  { numero: "388000", intitule: "Stocks en cours de route", type: "DETAIL" },
  // Classe 4 — Tiers
  { numero: "401000", intitule: "Fournisseurs", type: "DETAIL", collectif: true },
  { numero: "408000", intitule: "Fournisseurs, factures non parvenues", type: "DETAIL" },
  { numero: "409000", intitule: "Fournisseurs débiteurs, avances et acomptes", type: "DETAIL" },
  { numero: "411000", intitule: "Clients", type: "DETAIL", collectif: true },
  { numero: "416000", intitule: "Clients douteux ou litigieux", type: "DETAIL" },
  { numero: "418000", intitule: "Clients, produits à recevoir", type: "DETAIL" },
  { numero: "421000", intitule: "Personnel, rémunérations dues", type: "DETAIL" },
  { numero: "431000", intitule: "Sécurité sociale (CNSS)", type: "DETAIL" },
  { numero: "441000", intitule: "État, impôt sur les bénéfices", type: "DETAIL" },
  { numero: "443100", intitule: "État, TVA facturée (collectée)", type: "DETAIL" },
  { numero: "445100", intitule: "État, TVA récupérable sur immobilisations", type: "DETAIL" },
  { numero: "445200", intitule: "État, TVA récupérable sur achats (déductible)", type: "DETAIL" },
  { numero: "447000", intitule: "État, autres impôts et taxes", type: "DETAIL" },
  { numero: "471000", intitule: "Comptes d'attente", type: "DETAIL" },
  { numero: "476000", intitule: "Charges constatées d'avance", type: "DETAIL" },
  { numero: "477000", intitule: "Produits constatés d'avance", type: "DETAIL" },
  // Classe 5 — Trésorerie
  { numero: "521000", intitule: "Banques (comptes locaux)", type: "DETAIL" },
  { numero: "531000", intitule: "Chèques postaux", type: "DETAIL" },
  { numero: "571000", intitule: "Caisse", type: "DETAIL" },
  { numero: "585000", intitule: "Virements internes", type: "DETAIL" },
  // Classe 6 — Charges
  { numero: "601000", intitule: "Achats de marchandises", type: "DETAIL" },
  { numero: "602000", intitule: "Achats de matières premières", type: "DETAIL" },
  { numero: "604000", intitule: "Achats stockés de matières et fournitures", type: "DETAIL" },
  { numero: "605000", intitule: "Autres achats (eau, électricité, carburant)", type: "DETAIL" },
  { numero: "608000", intitule: "Achats d'emballages", type: "DETAIL" },
  { numero: "611000", intitule: "Transports", type: "DETAIL" },
  { numero: "622000", intitule: "Locations et charges locatives", type: "DETAIL" },
  { numero: "624000", intitule: "Entretien, réparations et maintenance", type: "DETAIL" },
  { numero: "625000", intitule: "Primes d'assurance", type: "DETAIL" },
  { numero: "627000", intitule: "Publicité, relations publiques", type: "DETAIL" },
  { numero: "628000", intitule: "Frais de télécommunications", type: "DETAIL" },
  { numero: "631000", intitule: "Frais bancaires", type: "DETAIL" },
  { numero: "632000", intitule: "Rémunérations d'intermédiaires et de conseils", type: "DETAIL" },
  { numero: "641000", intitule: "Impôts et taxes directs", type: "DETAIL" },
  { numero: "661000", intitule: "Rémunérations directes versées au personnel", type: "DETAIL" },
  { numero: "663000", intitule: "Charges sociales", type: "DETAIL" },
  { numero: "671000", intitule: "Intérêts des emprunts et dettes", type: "DETAIL" },
  { numero: "681000", intitule: "Dotations aux amortissements d'exploitation", type: "DETAIL" },
  // Classe 7 — Produits
  { numero: "701000", intitule: "Ventes de marchandises", type: "DETAIL" },
  { numero: "702000", intitule: "Ventes de produits finis", type: "DETAIL" },
  { numero: "706000", intitule: "Services vendus", type: "DETAIL" },
  { numero: "707000", intitule: "Produits accessoires", type: "DETAIL" },
  { numero: "711000", intitule: "Subventions d'exploitation", type: "DETAIL" },
  { numero: "758000", intitule: "Produits divers de gestion courante", type: "DETAIL" },
  { numero: "771000", intitule: "Revenus financiers et assimilés", type: "DETAIL" },
  { numero: "781000", intitule: "Reprises d'amortissements et provisions", type: "DETAIL" },
  // Classe 8 — HAO
  { numero: "812000", intitule: "Valeurs comptables des cessions d'immobilisations", type: "DETAIL" },
  { numero: "822000", intitule: "Produits des cessions d'immobilisations", type: "DETAIL" },
];
