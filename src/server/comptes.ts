"use server";

import { prisma } from "@/lib/db";
import { NATURES, CLASSES } from "@/lib/syscohada/referentiel";
import {
  completerNumero, detecterNature, deduireReport, extraireClasse, validerNumero,
} from "@/lib/syscohada/compte-logic";

export interface CreerCompteInput {
  dossierId: string;
  numeroSaisi: string;
  intitule: string;
  type?: "DETAIL" | "TOTAL";
  collectif?: boolean;
}

export async function creerCompte(input: CreerCompteInput) {
  const numero = completerNumero(input.numeroSaisi);
  const validation = validerNumero(numero, CLASSES);
  if (!validation.ok) throw new Error(validation.raison ?? "Numéro invalide.");

  const existe = await prisma.compte.findUnique({
    where: { dossierId_numero: { dossierId: input.dossierId, numero } },
  });
  if (existe) throw new Error(`Le compte ${numero} existe déjà dans ce dossier.`);

  const nature = detecterNature(numero, NATURES);
  const reportNplus1 = nature ? nature.reportNplus1 : deduireReport(extraireClasse(numero));
  return prisma.compte.create({
    data: {
      numero,
      intitule: input.intitule.trim() || "(sans intitulé)",
      type: input.type ?? "DETAIL",
      classeNum: extraireClasse(numero),
      natureRacine: nature?.racine ?? null,
      reportNplus1,
      collectif: input.collectif ?? false,
      dossierId: input.dossierId,
    },
  });
}

export interface FiltreComptes { texte?: string; classe?: number; }

export async function listerComptes(dossierId: string, filtre: FiltreComptes) {
  const comptes = await prisma.compte.findMany({
    where: { dossierId, statut: "ACTIF", ...(filtre.classe ? { classeNum: filtre.classe } : {}) },
    orderBy: { numero: "asc" },
  });
  if (!filtre.texte) return comptes;
  const t = filtre.texte.toLowerCase();
  return comptes.filter((c) => c.numero.includes(t) || c.intitule.toLowerCase().includes(t));
}

export async function modifierCompte(id: string, data: { intitule?: string; type?: "DETAIL" | "TOTAL" }) {
  return prisma.compte.update({ where: { id }, data });
}

export async function archiverCompte(id: string) {
  const compte = await prisma.compte.findUniqueOrThrow({ where: { id }, select: { id: true } });
  const nb = await prisma.ligneEcriture.count({ where: { compteId: compte.id } });
  if (nb > 0) throw new Error("Impossible d'archiver un compte ayant des écritures (mouvement existant).");
  return prisma.compte.update({ where: { id }, data: { statut: "ARCHIVE" } });
}
