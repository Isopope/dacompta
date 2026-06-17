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
