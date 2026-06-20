"use server";

import { prisma } from "@/lib/db";
import { ErreurIntegrite } from "@/lib/comptabilite/integrite";

export interface DefinirVerrouInput {
  fiscalyearLockDate?: Date | null;
  hardLockDate?: Date | null;
}

/**
 * Définit les verrous de période d'un dossier (Odoo lock dates). Le verrou
 * définitif (hardLockDate) est irréversible : il ne peut être levé ni reculé,
 * seulement avancé. Toute modification est journalisée dans l'audit.
 */
export async function definirVerrou(dossierId: string, input: DefinirVerrouInput) {
  const dossier = await prisma.dossier.findUniqueOrThrow({
    where: { id: dossierId },
    select: { fiscalyearLockDate: true, hardLockDate: true },
  });

  if (input.hardLockDate !== undefined && dossier.hardLockDate) {
    const nouveau = input.hardLockDate;
    if (nouveau === null || nouveau.getTime() < dossier.hardLockDate.getTime()) {
      throw new ErreurIntegrite("Le verrou définitif (hard lock) est irréversible : il ne peut être levé ni reculé.");
    }
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.dossier.update({
      where: { id: dossierId },
      data: {
        ...(input.fiscalyearLockDate !== undefined ? { fiscalyearLockDate: input.fiscalyearLockDate } : {}),
        ...(input.hardLockDate !== undefined ? { hardLockDate: input.hardLockDate } : {}),
      },
    });
    const parts: string[] = [];
    if (input.fiscalyearLockDate !== undefined) {
      parts.push(`verrou exercice = ${input.fiscalyearLockDate?.toISOString().slice(0, 10) ?? "néant"}`);
    }
    if (input.hardLockDate !== undefined) {
      parts.push(`verrou définitif = ${input.hardLockDate?.toISOString().slice(0, 10) ?? "néant"}`);
    }
    await tx.auditLog.create({
      data: { dossierId, type: "VERROU", message: parts.join(" ; ") || "verrou inchangé" },
    });
    return updated;
  });
}

export async function getAuditLog(dossierId: string) {
  return prisma.auditLog.findMany({ where: { dossierId }, orderBy: { createdAt: "desc" } });
}
