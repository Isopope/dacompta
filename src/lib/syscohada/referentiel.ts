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
];
