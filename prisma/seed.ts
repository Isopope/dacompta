import { PrismaClient } from "@prisma/client";
import {
  REFERENTIEL_CODE, REFERENTIEL_LIBELLE, CLASSES, NATURES,
  COMPTES_LES_ASSOCIES,
} from "../src/lib/syscohada/referentiel";
import { detecterNature, deduireReport, extraireClasse } from "../src/lib/syscohada/compte-logic";

const prisma = new PrismaClient();

async function main() {
  const ref = await prisma.referentiel.upsert({
    where: { code: REFERENTIEL_CODE },
    update: { libelle: REFERENTIEL_LIBELLE },
    create: { code: REFERENTIEL_CODE, libelle: REFERENTIEL_LIBELLE },
  });

  for (const c of CLASSES) {
    await prisma.classe.upsert({
      where: { referentielId_numero: { referentielId: ref.id, numero: c.numero } },
      update: { libelle: c.libelle },
      create: { numero: c.numero, libelle: c.libelle, referentielId: ref.id },
    });
  }

  for (const n of NATURES) {
    await prisma.nature.upsert({
      where: { referentielId_racine: { referentielId: ref.id, racine: n.racine } },
      update: { libelle: n.libelle, famille: n.famille, reportNplus1: n.reportNplus1 },
      create: { ...n, referentielId: ref.id },
    });
  }

  const dossier =
    (await prisma.dossier.findFirst({ where: { nom: "Les Associés SA" } })) ??
    (await prisma.dossier.create({
      data: {
        nom: "Les Associés SA", ville: "Lomé", pays: "Togo",
        devise: "XOF", exercice: 2020, referentielId: ref.id,
      },
    }));

  for (const c of COMPTES_LES_ASSOCIES) {
    const nature = detecterNature(c.numero, NATURES);
    const reportNplus1 = nature ? nature.reportNplus1 : deduireReport(extraireClasse(c.numero));
    await prisma.compte.upsert({
      where: { dossierId_numero: { dossierId: dossier.id, numero: c.numero } },
      update: { intitule: c.intitule },
      create: {
        numero: c.numero, intitule: c.intitule, type: c.type,
        classeNum: extraireClasse(c.numero),
        natureRacine: nature?.racine ?? null,
        reportNplus1,
        collectif: c.collectif ?? false,
        dossierId: dossier.id,
      },
    });
  }

  console.log(`Seed OK — référentiel ${ref.code}, dossier ${dossier.nom}, ${COMPTES_LES_ASSOCIES.length} comptes.`);
}

main().finally(() => prisma.$disconnect());
