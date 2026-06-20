"use server";
// Actions serveur pour la gestion des dossiers comptables
import { prisma } from "@/lib/db";
import { getDossierIdCookie, setDossierIdCookie } from "@/lib/dossier-context";

/** Retourne la liste de tous les dossiers, triés par nom. */
export async function listerDossiers() {
  return prisma.dossier.findMany({ select: { id: true, nom: true }, orderBy: { nom: "asc" } });
}

/** Retourne le dossier courant lu depuis le cookie, ou null si aucun sélectionné. */
export async function getDossierCourant() {
  const id = await getDossierIdCookie();
  if (!id) return null;
  return prisma.dossier.findUnique({ where: { id }, select: { id: true, nom: true } });
}

/** Enregistre le dossier sélectionné dans le cookie de session. */
export async function choisirDossier(id: string) {
  await setDossierIdCookie(id);
}
