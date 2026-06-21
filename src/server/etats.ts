"use server";

import { prisma } from "@/lib/db";
import { getBalance, getGrandLivre, type BalanceResultat, type GrandLivreCompte } from "@/server/balance";
import {
  deriverBilan,
  deriverCompteResultat,
  deriverFluxTresorerie,
  type Bilan,
  type CompteResultat,
  type FluxTresorerie,
} from "@/lib/etats/etats-financiers";

export interface DossierMeta {
  nom: string;
  exercice: number;
  devise: string;
}

export interface EtatsData {
  dossier: DossierMeta;
  balance: BalanceResultat;
  grandLivre: GrandLivreCompte[];
  bilan: Bilan;
  compteResultat: CompteResultat;
  fluxTresorerie: FluxTresorerie;
}

/**
 * Regroupe tout le nécessaire à l'affichage et à l'export des états d'un dossier.
 * Source de vérité unique : la page /etats et la route d'export l'utilisent toutes deux.
 */
export async function getEtatsData(dossierId: string): Promise<EtatsData> {
  const [dossier, balance, grandLivre] = await Promise.all([
    prisma.dossier.findUniqueOrThrow({
      where: { id: dossierId },
      select: { nom: true, exercice: true, devise: true },
    }),
    getBalance(dossierId),
    getGrandLivre(dossierId),
  ]);

  return {
    dossier,
    balance,
    grandLivre,
    bilan: deriverBilan(balance),
    compteResultat: deriverCompteResultat(balance),
    fluxTresorerie: deriverFluxTresorerie(balance, grandLivre),
  };
}
