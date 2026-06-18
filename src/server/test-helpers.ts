import { prisma } from "@/lib/db";
import {
  REFERENTIEL_CODE, REFERENTIEL_LIBELLE, CLASSES, NATURES,
} from "@/lib/syscohada/referentiel";

/** Vide la base et reseed le référentiel + un dossier de test. Renvoie le dossierId. */
export async function resetDb(): Promise<string> {
  await prisma.ligneEcriture.deleteMany();
  await prisma.piece.deleteMany();
  await prisma.journal.deleteMany();
  await prisma.importLog.deleteMany();
  await prisma.compte.deleteMany();
  await prisma.budgetPoste.deleteMany();
  await prisma.dossier.deleteMany();
  await prisma.nature.deleteMany();
  await prisma.classe.deleteMany();
  await prisma.referentiel.deleteMany();

  const ref = await prisma.referentiel.create({
    data: { code: REFERENTIEL_CODE, libelle: REFERENTIEL_LIBELLE },
  });
  await prisma.classe.createMany({
    data: CLASSES.map((c) => ({ ...c, referentielId: ref.id })),
  });
  await prisma.nature.createMany({
    data: NATURES.map((n) => ({ ...n, referentielId: ref.id })),
  });
  const dossier = await prisma.dossier.create({
    data: { nom: "Test SA", ville: "Lomé", pays: "Togo", devise: "XOF", exercice: 2020, referentielId: ref.id },
  });
  return dossier.id;
}
