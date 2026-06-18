"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

// Le réalisé d'un poste budgétaire n'est jamais stocké : il est déduit des écritures
// (LigneEcriture) en temps réel — comme la Balance et le Grand Livre. On ignore les
// pièces ANNULEE. Pour une charge on somme les débits des comptes du préfixe `compteLie`,
// pour un produit on somme les crédits.

export interface PosteRealise {
  id: string;
  code: string;
  libelle: string;
  sens: string; // "P" (Produit) | "C" (Charge)
  prevision: number;
  realise: number;
  pourcentage: number; // réalisé / prévision × 100 (0 si prévision nulle)
  compteLie: string;
}

export interface CreerPosteInput {
  dossierId: string;
  code: string;
  libelle: string;
  sens: string; // "P" | "C"
  prevision: number;
  compteLie: string;
}

export interface ModifierPosteData {
  code?: string;
  libelle?: string;
  sens?: string;
  prevision?: number;
  compteLie?: string;
}

const D = (n: Prisma.Decimal.Value) => new Prisma.Decimal(n);

// Réalisé d'un poste : somme (aggregate, sans charger toutes les lignes) des débits
// (charge) ou crédits (produit) des comptes commençant par `compteLie`, hors pièces ANNULEE.
async function realisePoste(dossierId: string, sens: string, compteLie: string): Promise<number> {
  const agg = await prisma.ligneEcriture.aggregate({
    where: {
      compteNumero: { startsWith: compteLie },
      piece: { dossierId, statut: { not: "ANNULEE" } },
    },
    _sum: { debit: true, credit: true },
  });
  const colonne = sens === "P" ? agg._sum.credit : agg._sum.debit;
  return Number(colonne ?? 0);
}

export async function listerPostes(dossierId: string): Promise<PosteRealise[]> {
  const postes = await prisma.budgetPoste.findMany({
    where: { dossierId },
    orderBy: [{ sens: "asc" }, { code: "asc" }],
  });

  return Promise.all(
    postes.map(async (p) => {
      const prevision = Number(p.prevision);
      const realise = await realisePoste(dossierId, p.sens, p.compteLie);
      const pourcentage = prevision > 0 ? (realise / prevision) * 100 : 0;
      return {
        id: p.id,
        code: p.code,
        libelle: p.libelle,
        sens: p.sens,
        prevision,
        realise,
        pourcentage,
        compteLie: p.compteLie,
      };
    })
  );
}

export async function creerPoste(input: CreerPosteInput) {
  return prisma.budgetPoste.create({
    data: {
      code: input.code,
      libelle: input.libelle,
      sens: input.sens,
      prevision: D(input.prevision),
      compteLie: input.compteLie,
      dossierId: input.dossierId,
    },
  });
}

export async function modifierPoste(id: string, data: ModifierPosteData) {
  return prisma.budgetPoste.update({
    where: { id },
    data: {
      ...(data.code !== undefined ? { code: data.code } : {}),
      ...(data.libelle !== undefined ? { libelle: data.libelle } : {}),
      ...(data.sens !== undefined ? { sens: data.sens } : {}),
      ...(data.prevision !== undefined ? { prevision: D(data.prevision) } : {}),
      ...(data.compteLie !== undefined ? { compteLie: data.compteLie } : {}),
    },
  });
}

export async function supprimerPoste(id: string) {
  return prisma.budgetPoste.delete({ where: { id } });
}
