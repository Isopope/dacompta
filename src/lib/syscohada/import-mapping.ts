import type { ClasseDef, NatureDef } from "./referentiel";
import { completerNumero, detecterNature, deduireReport, extraireClasse, validerNumero } from "./compte-logic";

export type RoleColonne = "NUMERO" | "INTITULE" | "TYPE" | "IGNORER";
export type Controle = "ok" | "doublon" | "hors-syscohada";

export interface LigneImport {
  numero: string;
  intitule: string;
  type: "DETAIL" | "TOTAL";
  natureRacine: string | null;
  reportNplus1: boolean;
  controle: Controle;
}

const RE_NUM = /^\d{2,6}$/;
const TYPE_TOTAL = new Set(["t", "total", "σ"]);
const TYPE_DETAIL = new Set(["d", "détail", "detail"]);

function ratio(cells: string[], pred: (c: string) => boolean): number {
  const nonEmpty = cells.filter((c) => c.trim() !== "");
  if (nonEmpty.length === 0) return 0;
  return nonEmpty.filter(pred).length / nonEmpty.length;
}

/** Devine le rôle de chaque colonne par le contenu (ordre indépendant). */
export function detecterRolesColonnes(lignes: string[][]): RoleColonne[] {
  const nbCols = Math.max(0, ...lignes.map((l) => l.length));

  // Compute scores per column per role
  type Scored = { col: number; score: number };
  const scores: Record<"NUMERO" | "INTITULE" | "TYPE", Scored[]> = {
    NUMERO: [],
    INTITULE: [],
    TYPE: [],
  };

  for (let c = 0; c < nbCols; c++) {
    const col = lignes.map((l) => (l[c] ?? "").toString().trim());
    scores.NUMERO.push({ col: c, score: ratio(col, (v) => RE_NUM.test(v)) });
    scores.TYPE.push({
      col: c,
      score: ratio(col, (v) => TYPE_TOTAL.has(v.toLowerCase()) || TYPE_DETAIL.has(v.toLowerCase())),
    });
    // INTITULE: meaningful text — require at least 2 chars with letters
    scores.INTITULE.push({
      col: c,
      score: ratio(col, (v) => v.length >= 2 && /[a-zA-ZÀ-ÿ]/.test(v)),
    });
  }

  // Precompute average trimmed cell length per column (used as tie-break for INTITULE).
  const avgLen: number[] = Array.from({ length: nbCols }, (_, c) => {
    const col = lignes.map((l) => (l[c] ?? "").toString().trim()).filter((v) => v !== "");
    return col.length === 0 ? 0 : col.reduce((s, v) => s + v.length, 0) / col.length;
  });

  const result: RoleColonne[] = Array(nbCols).fill("IGNORER");
  const assigned = new Set<number>();

  // Claim NUMERO then TYPE before INTITULE: numeric/type columns are distinctive and
  // must be claimed first so the general text signal doesn't absorb them.
  for (const role of ["NUMERO", "TYPE", "INTITULE"] as const) {
    const candidates = scores[role].filter((s) => s.score >= 0.6 && !assigned.has(s.col));
    // Primary sort: highest score. Tie-break for INTITULE: shorter average cell length
    // (account labels are terse; free-text comment columns have longer sentences).
    // Final tie-break: leftmost column index for full determinism.
    candidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (role === "INTITULE") {
        const lenDiff = avgLen[a.col] - avgLen[b.col]; // prefer shorter (smaller avgLen)
        if (lenDiff !== 0) return lenDiff;
      }
      return a.col - b.col; // prefer leftmost
    });
    const best = candidates[0];
    if (best) {
      result[best.col] = role;
      assigned.add(best.col);
    }
  }

  return result;
}

function lireType(v: string | undefined): "DETAIL" | "TOTAL" {
  if (v && TYPE_TOTAL.has(v.trim().toLowerCase())) return "TOTAL";
  return "DETAIL";
}

/** Construit les lignes d'import normalisées avec contrôles. */
export function construireLignesImport(
  lignes: string[][],
  roles: RoleColonne[],
  natures: NatureDef[],
  classes: ClasseDef[],
  numerosExistants: Set<string>,
): LigneImport[] {
  const idxNum = roles.indexOf("NUMERO");
  const idxLib = roles.indexOf("INTITULE");
  const idxType = roles.indexOf("TYPE");
  const vusDansFichier = new Set<string>();
  const out: LigneImport[] = [];

  for (const ligne of lignes) {
    const brut = idxNum >= 0 ? (ligne[idxNum] ?? "") : "";
    if (brut.toString().trim() === "") continue;
    const numero = completerNumero(brut.toString());
    const intitule = (idxLib >= 0 ? ligne[idxLib] : "")?.toString().trim() || "(sans intitulé)";
    const type = lireType(idxType >= 0 ? ligne[idxType]?.toString() : undefined);

    const valide = validerNumero(numero, classes).ok;
    let controle: Controle = "ok";
    if (!valide) controle = "hors-syscohada";
    else if (numerosExistants.has(numero) || vusDansFichier.has(numero)) controle = "doublon";
    vusDansFichier.add(numero);

    const nature = detecterNature(numero, natures);
    const reportNplus1 = nature != null
      ? nature.reportNplus1
      : deduireReport(extraireClasse(numero));
    out.push({
      numero, intitule, type,
      natureRacine: nature?.racine ?? null,
      reportNplus1,
      controle,
    });
  }
  return out;
}
