// src/server/portefeuille.ts
"use server";

import { prisma } from "@/lib/db";
import { listerDossiers } from "./dossiers";
import { getOpenLines } from "./lettrage";
import { getDeclarationTVA } from "./taxes";

export interface ResumeDossier {
  id: string;
  nom: string;
  nbBrouillons: number;
  nbALettrer: number;
  tvaDue: number;
}

/**
 * Vue portefeuille multi-dossier : pour chaque dossier, des compteurs LÉGERS
 * (brouillons, lignes à lettrer, TVA nette due). Volontairement sans balance
 * complète par dossier pour rester rapide sur un cabinet de plusieurs dossiers.
 */
export async function getPortefeuille(): Promise<ResumeDossier[]> {
  const dossiers = await listerDossiers();
  return Promise.all(
    dossiers.map(async (d) => {
      const [nbBrouillons, openLines, tva] = await Promise.all([
        prisma.piece.count({ where: { dossierId: d.id, statut: "BROUILLON" } }),
        getOpenLines(d.id),
        getDeclarationTVA(d.id),
      ]);
      return { id: d.id, nom: d.nom, nbBrouillons, nbALettrer: openLines.length, tvaDue: tva.netteDue };
    })
  );
}
