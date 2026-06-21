// src/server/cockpit.ts
"use server";

import { getDashboardStats, type KpisGlobaux, type CarteJournal } from "./dashboard";
import { getOpenLines } from "./lettrage";
import { getDeclarationTVA } from "./taxes";
import { prochaineActionDe, type ProchaineAction } from "@/lib/cockpit/prochaine-action";

export interface FileCount {
  count: number;
  href: string;
}
export interface FileTva {
  netteDue: number;
  href: string;
}
export interface Cockpit {
  kpis: KpisGlobaux;
  journaux: CarteJournal[];
  aControler: FileCount;
  aLettrer: FileCount;
  aDeclarer: FileTva;
  prochaineAction: ProchaineAction | null;
}

/**
 * État du cockpit pour le dossier courant : KPIs + cartes journaux (via
 * getDashboardStats) + 3 files actionnables dérivées des données existantes
 * + l'action recommandée. Ne stocke rien : tout est calculé en temps réel.
 */
export async function getCockpit(dossierId: string): Promise<Cockpit> {
  const [stats, openLines, tva] = await Promise.all([
    getDashboardStats(dossierId),
    getOpenLines(dossierId),
    getDeclarationTVA(dossierId),
  ]);

  const aControler: FileCount = { count: stats.kpis.nbBrouillons, href: "/ecritures" };
  const aLettrer: FileCount = { count: openLines.length, href: "/lettrage" };
  const aDeclarer: FileTva = { netteDue: tva.netteDue, href: "/etats/tva" };

  const prochaineAction = prochaineActionDe({
    nbBrouillons: aControler.count,
    nbALettrer: aLettrer.count,
    netteDue: aDeclarer.netteDue,
  });

  return { kpis: stats.kpis, journaux: stats.journaux, aControler, aLettrer, aDeclarer, prochaineAction };
}
