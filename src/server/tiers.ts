"use server";

import { prisma } from "@/lib/db";

export type TypeTiers = "CLIENT" | "FOURNISSEUR" | "AUTRE";

export interface CreerTiersInput {
  dossierId: string;
  code: string;
  nom: string;
  type: TypeTiers;
}

export async function creerTiers(input: CreerTiersInput) {
  const code = input.code.trim();
  const existe = await prisma.tiers.findUnique({
    where: { dossierId_code: { dossierId: input.dossierId, code } },
  });
  if (existe) throw new Error(`Le tiers ${code} existe déjà dans ce dossier.`);
  return prisma.tiers.create({
    data: { dossierId: input.dossierId, code, nom: input.nom.trim() || "(sans nom)", type: input.type },
  });
}

export async function listerTiers(dossierId: string, filtre: { type?: TypeTiers } = {}) {
  return prisma.tiers.findMany({
    where: { dossierId, ...(filtre.type ? { type: filtre.type } : {}) },
    orderBy: { code: "asc" },
  });
}
