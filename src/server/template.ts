"use server";

import { prisma } from "@/lib/db";
import { NATURES, COMPTES_LES_ASSOCIES, type CompteSeed } from "@/lib/syscohada/referentiel";
import {
  detecterNature, deduireReport, extraireClasse, deduireAccountType, deduireReconciliable,
} from "@/lib/syscohada/compte-logic";

/**
 * Instancie un plan comptable SYSCOHADA dans un dossier (équivalent
 * chart_template.try_loading d'Odoo : un modèle de plan déployé par société).
 * Idempotent : les comptes déjà présents sont ignorés. Déduit nature, report,
 * accountType et réconciliation pour chaque compte.
 */
export async function instancierPlanSyscohada(
  dossierId: string,
  comptes: CompteSeed[] = COMPTES_LES_ASSOCIES,
): Promise<{ crees: number }> {
  const existants = new Set(
    (await prisma.compte.findMany({ where: { dossierId }, select: { numero: true } })).map((c) => c.numero),
  );

  const aCreer = comptes.filter((c) => !existants.has(c.numero));
  if (aCreer.length === 0) return { crees: 0 };

  await prisma.compte.createMany({
    data: aCreer.map((c) => {
      const nature = detecterNature(c.numero, NATURES);
      const reportNplus1 = nature ? nature.reportNplus1 : deduireReport(extraireClasse(c.numero));
      const accountType = deduireAccountType(c.numero);
      return {
        numero: c.numero,
        intitule: c.intitule,
        type: c.type,
        classeNum: extraireClasse(c.numero),
        natureRacine: nature?.racine ?? null,
        reportNplus1,
        collectif: c.collectif ?? false,
        accountType,
        reconciliable: deduireReconciliable(accountType),
        dossierId,
      };
    }),
  });

  return { crees: aCreer.length };
}
