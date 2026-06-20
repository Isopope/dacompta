"use server";

import { prisma } from "@/lib/db";
import { createLettrage } from "./lettrage";

// Règles de lettrage automatique (inspirées des reconciliation models d'Odoo).
// Une règle cible un préfixe de compte de tiers et rapproche automatiquement les
// lignes débit/crédit du même compte dont le montant et la date sont proches
// (tolérances en % et en jours).

const MS_PAR_JOUR = 24 * 60 * 60 * 1000;

export interface RegleLettrageDTO {
  id: string;
  dossierId: string;
  nom: string;
  prefixeCompte: string;
  tolerancePct: number;
  toleranceJours: number;
  active: boolean;
}

export interface CreerRegleInput {
  dossierId: string;
  nom: string;
  prefixeCompte: string;
  tolerancePct: number;
  toleranceJours: number;
  active?: boolean;
}

export interface ModifierRegleData {
  nom?: string;
  prefixeCompte?: string;
  tolerancePct?: number;
  toleranceJours?: number;
  active?: boolean;
}

function toDTO(r: {
  id: string;
  dossierId: string;
  nom: string;
  prefixeCompte: string;
  tolerancePct: number;
  toleranceJours: number;
  active: boolean;
}): RegleLettrageDTO {
  return {
    id: r.id,
    dossierId: r.dossierId,
    nom: r.nom,
    prefixeCompte: r.prefixeCompte,
    tolerancePct: r.tolerancePct,
    toleranceJours: r.toleranceJours,
    active: r.active,
  };
}

export async function creerRegle(input: CreerRegleInput): Promise<RegleLettrageDTO> {
  const r = await prisma.regleLettrage.create({
    data: {
      dossierId: input.dossierId,
      nom: input.nom,
      prefixeCompte: input.prefixeCompte,
      tolerancePct: input.tolerancePct,
      toleranceJours: input.toleranceJours,
      active: input.active ?? true,
    },
  });
  return toDTO(r);
}

export async function listerRegles(dossierId: string): Promise<RegleLettrageDTO[]> {
  const regles = await prisma.regleLettrage.findMany({
    where: { dossierId },
    orderBy: { createdAt: "asc" },
  });
  return regles.map(toDTO);
}

export async function modifierRegle(id: string, data: ModifierRegleData): Promise<RegleLettrageDTO> {
  const r = await prisma.regleLettrage.update({
    where: { id },
    data: {
      ...(data.nom !== undefined ? { nom: data.nom } : {}),
      ...(data.prefixeCompte !== undefined ? { prefixeCompte: data.prefixeCompte } : {}),
      ...(data.tolerancePct !== undefined ? { tolerancePct: data.tolerancePct } : {}),
      ...(data.toleranceJours !== undefined ? { toleranceJours: data.toleranceJours } : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
    },
  });
  return toDTO(r);
}

export async function supprimerRegle(id: string): Promise<void> {
  await prisma.regleLettrage.delete({ where: { id } });
}

// Ligne candidate au lettrage automatique (résiduel encore ouvert).
interface Candidat {
  id: string;
  compteNumero: string;
  tiersId: string | null; // auxiliaire : le rapprochement auto reste dans le même tiers
  date: number; // timestamp de la pièce
  residuel: number; // montant restant à lettrer (suivi en mémoire pendant la passe)
}

/**
 * Applique toutes les règles actives du dossier : pour chaque règle, rapproche
 * les lignes débit/crédit du même compte dont le montant (±tolerancePct) et la
 * date (±toleranceJours) sont compatibles. Approche gloutonne : chaque ligne
 * crédit n'est consommée qu'une fois par passe.
 */
export async function appliquerReglesLettrageAutomatique(dossierId: string): Promise<void> {
  const regles = await prisma.regleLettrage.findMany({
    where: { dossierId, active: true },
  });

  for (const regle of regles) {
    // Lignes ouvertes (résiduel > 0) du préfixe ciblé, hors pièces annulées.
    const lignes = await prisma.ligneEcriture.findMany({
      where: {
        compteNumero: { startsWith: regle.prefixeCompte },
        piece: { dossierId, statut: { not: "ANNULEE" } },
        amountResidual: { gt: 0 },
      },
      include: { piece: { select: { datePiece: true } } },
    });

    const debits: Candidat[] = [];
    const credits: Candidat[] = [];
    for (const l of lignes) {
      const cand: Candidat = {
        id: l.id,
        compteNumero: l.compteNumero,
        tiersId: l.tiersId,
        date: l.piece.datePiece.getTime(),
        residuel: Number(l.amountResidual),
      };
      if (l.debit.greaterThan(l.credit)) debits.push(cand);
      else if (l.credit.greaterThan(l.debit)) credits.push(cand);
    }

    // Ordre déterministe (date croissante) pour des rapprochements reproductibles.
    debits.sort((a, b) => a.date - b.date);
    credits.sort((a, b) => a.date - b.date);

    const creditsConsommes = new Set<string>();

    for (const d of debits) {
      if (d.residuel <= 0) continue;
      const match = credits.find(
        (c) =>
          !creditsConsommes.has(c.id) &&
          c.residuel > 0 &&
          c.compteNumero === d.compteNumero &&
          c.tiersId === d.tiersId &&
          Math.abs(d.residuel - c.residuel) <= (regle.tolerancePct / 100) * d.residuel &&
          Math.abs(d.date - c.date) <= regle.toleranceJours * MS_PAR_JOUR
      );
      if (!match) continue;

      const montant = Math.min(d.residuel, match.residuel);
      await createLettrage(dossierId, d.id, match.id, montant, { auto: true });

      // Mise à jour des résiduels en mémoire pour la suite de la passe.
      d.residuel -= montant;
      match.residuel -= montant;
      if (match.residuel <= 0) creditsConsommes.add(match.id);
    }
  }
}
