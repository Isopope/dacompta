// src/server/portefeuille.ts
"use server";

import { prisma } from "@/lib/db";
import { listerDossiers } from "./dossiers";
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
 * (brouillons, lignes à lettrer, TVA nette due). Le compteur "à lettrer" est
 * une requête COUNT directe (même filtre que getOpenLines : pièce non annulée,
 * amountResidual > 0), sans charger les lignes ni la balance complète, pour
 * rester rapide sur un cabinet de plusieurs dossiers.
 */
export async function getPortefeuille(): Promise<ResumeDossier[]> {
  const dossiers = await listerDossiers();
  return Promise.all(
    dossiers.map(async (d) => {
      const [nbBrouillons, nbALettrer, tva] = await Promise.all([
        prisma.piece.count({ where: { dossierId: d.id, statut: "BROUILLON" } }),
        prisma.ligneEcriture.count({
          where: {
            piece: { dossierId: d.id, statut: { not: "ANNULEE" } },
            amountResidual: { gt: 0 },
          },
        }),
        getDeclarationTVA(d.id),
      ]);
      return { id: d.id, nom: d.nom, nbBrouillons, nbALettrer, tvaDue: tva.netteDue };
    })
  );
}
