import { prisma } from "@/lib/db";
import {
  REFERENTIEL_CODE, REFERENTIEL_LIBELLE, CLASSES, NATURES,
} from "@/lib/syscohada/referentiel";
import { deduireAccountType, deduireReconciliable } from "@/lib/syscohada/compte-logic";

const COMPTES_STD: { numero: string; intitule: string; classeNum: number }[] = [
  { numero: "101000", intitule: "Capital", classeNum: 1 },
  { numero: "162000", intitule: "Emprunts", classeNum: 1 },
  { numero: "401000", intitule: "Fournisseurs", classeNum: 4 },
  { numero: "411000", intitule: "Clients", classeNum: 4 },
  { numero: "443100", intitule: "TVA collectée", classeNum: 4 },
  { numero: "445660", intitule: "TVA déductible", classeNum: 4 },
  { numero: "521000", intitule: "Banque", classeNum: 5 },
  { numero: "601000", intitule: "Achats marchandises", classeNum: 6 },
  { numero: "605100", intitule: "Eau", classeNum: 6 },
  { numero: "605300", intitule: "Carburant", classeNum: 6 },
  { numero: "701000", intitule: "Ventes marchandises", classeNum: 7 },
  { numero: "706100", intitule: "Recette transport", classeNum: 7 },
  { numero: "707000", intitule: "Ventes", classeNum: 7 },
];

export async function seedComptesStandards(dossierId: string): Promise<void> {
  await prisma.compte.createMany({
    data: COMPTES_STD.map((c) => {
      const accountType = deduireAccountType(c.numero);
      return {
        ...c, type: "DETAIL", reportNplus1: false, dossierId,
        accountType, reconciliable: deduireReconciliable(accountType),
      };
    }),
  });
}

/** Vide la base et reseed le référentiel + un dossier de test. Renvoie le dossierId. */
export async function resetDb(): Promise<string> {
  await prisma.auditLog.deleteMany();
  await prisma.lettrage.deleteMany();
  await prisma.regleLettrage.deleteMany();
  await prisma.paiement.deleteMany();
  await prisma.ligneEcriture.deleteMany();
  await prisma.piece.deleteMany();
  await prisma.taxe.deleteMany();
  await prisma.tiers.deleteMany();
  await prisma.sequencePiece.deleteMany();
  await prisma.journal.deleteMany();
  await prisma.importLog.deleteMany();
  await prisma.compte.deleteMany();
  await prisma.budgetPoste.deleteMany();
  await prisma.soldeAnterieur.deleteMany();
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
