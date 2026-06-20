import type { ClasseDef, NatureDef } from "./referentiel";

/** Complète une saisie en un numéro de compte à 6 chiffres (zéros à droite). */
export function completerNumero(saisie: string): string {
  const chiffres = (saisie ?? "").replace(/\D/g, "");
  return chiffres.padEnd(6, "0").slice(0, 6);
}

/** Numéro de classe = premier chiffre. */
export function extraireClasse(numero: string): number {
  return Number(numero.charAt(0));
}

/** Report N+1 : classes de bilan (1-5) reportées, gestion (6-9) remises à zéro. */
export function deduireReport(classe: number): boolean {
  return classe >= 1 && classe <= 5;
}

/** Détecte la nature par la racine la plus longue qui préfixe le numéro. */
export function detecterNature(numero: string, natures: NatureDef[]): NatureDef | null {
  const candidates = natures
    .filter((n) => numero.startsWith(n.racine))
    .sort((a, b) => b.racine.length - a.racine.length);
  return candidates[0] ?? null;
}

// Type de compte façon Odoo `account.account.account_type` : il porte le
// comportement comptable (sens, réconciliable). Aligné sur l'énumération Odoo,
// mappé depuis la numérotation SYSCOHADA.
export type AccountType =
  | "asset_receivable" | "asset_cash" | "asset_current" | "asset_non_current" | "asset_fixed"
  | "liability_payable" | "liability_current" | "liability_non_current"
  | "equity" | "equity_unaffected"
  | "income" | "income_other"
  | "expense"
  | "off_balance";

/** Déduit le type de compte (énumération Odoo) à partir du numéro SYSCOHADA. */
export function deduireAccountType(numero: string): AccountType {
  const n = (numero ?? "").replace(/\D/g, "");
  const classe = Number(n.charAt(0));
  const p2 = n.slice(0, 2);
  const p3 = n.slice(0, 3);
  switch (classe) {
    case 1: // Ressources durables
      if (p2 === "12") return "equity_unaffected"; // report à nouveau
      if (["10", "11", "13", "14"].includes(p2)) return "equity";
      return "liability_non_current"; // 15-19 : emprunts, provisions, dettes financières
    case 2: // Actif immobilisé
      return "asset_fixed";
    case 3: // Stocks
      return "asset_current";
    case 4: // Tiers
      if (p2 === "40") return "liability_payable"; // fournisseurs
      if (p2 === "41") return "asset_receivable"; // clients
      if (p2 === "42" || p2 === "43") return "liability_payable"; // personnel, organismes sociaux
      if (p2 === "44") return p3 === "445" ? "asset_current" : "liability_current"; // TVA déductible vs due
      return "asset_current"; // 46-49 : divers, régularisation, dépréciations
    case 5: // Trésorerie
      return "asset_cash";
    case 6: // Charges des activités ordinaires
      return "expense";
    case 7: // Produits des activités ordinaires
      return "income";
    case 8: // HAO : 2e chiffre pair = produit, impair = charge
      return Number(n.charAt(1)) % 2 === 0 ? "income_other" : "expense";
    default: // classe 9 (analytique/engagements) et inconnues
      return "off_balance";
  }
}

/**
 * Réconciliable par défaut : règle Odoo `account.reconcile` — vrai uniquement
 * pour les comptes de créances/dettes (receivable/payable). Éditable ensuite.
 */
export function deduireReconciliable(accountType: AccountType): boolean {
  return accountType === "asset_receivable" || accountType === "liability_payable";
}

export interface ValidationResult { ok: boolean; raison?: string; }

/** Valide un numéro : 6 chiffres, classe connue. */
export function validerNumero(numero: string, classes: ClasseDef[]): ValidationResult {
  if (!/^\d{6}$/.test(numero)) return { ok: false, raison: "Le numéro doit comporter 6 chiffres." };
  const classe = extraireClasse(numero);
  if (!classes.some((c) => c.numero === classe)) {
    return { ok: false, raison: `Classe ${classe} inconnue dans le référentiel.` };
  }
  return { ok: true };
}
