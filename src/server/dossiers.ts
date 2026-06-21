"use server";
// Actions serveur pour la gestion des dossiers comptables
import { prisma } from "@/lib/db";
import { getDossierIdCookie, setDossierIdCookie } from "@/lib/dossier-context";
import { Prisma } from "@prisma/client";
import {
  REFERENTIEL_CODE, NATURES, PAYS, COMPTES_BASE_SYSCOHADA,
} from "@/lib/syscohada/referentiel";
import {
  extraireClasse, detecterNature, deduireReport, deduireAccountType, deduireReconciliable,
} from "@/lib/syscohada/compte-logic";

/** Retourne la liste de tous les dossiers, triés par nom. */
export async function listerDossiers(): Promise<{ id: string; nom: string }[]> {
  return prisma.dossier.findMany({ select: { id: true, nom: true }, orderBy: { nom: "asc" } });
}

/** Retourne le dossier courant lu depuis le cookie, ou null si aucun sélectionné. */
export async function getDossierCourant(): Promise<{ id: string; nom: string } | null> {
  const id = await getDossierIdCookie();
  if (!id) return null;
  return prisma.dossier.findUnique({ where: { id }, select: { id: true, nom: true } });
}

/** Enregistre le dossier sélectionné dans le cookie de session. */
export async function choisirDossier(id: string) {
  await setDossierIdCookie(id);
}

export interface CreerDossierInput {
  nom: string;
  ville: string;
  pays: string;
  devise: string;
  exercice: number;
}

// Journaux standards créés à l'ouverture d'un dossier (codes SYSCOHADA usuels).
const JOURNAUX_STANDARD = [
  { code: "ACH", libelle: "Achats", type: "purchase" },
  { code: "VT", libelle: "Ventes", type: "sale" },
  { code: "CAI", libelle: "Caisse", type: "cash" },
  { code: "BIMA", libelle: "Banque", type: "bank" },
  { code: "OD", libelle: "Opérations diverses", type: "misc" },
  { code: "RAN", libelle: "Report à nouveau", type: "misc" },
];

/**
 * Crée un dossier OPÉRATIONNEL : la ligne Dossier + journaux standards + plan
 * SYSCOHADA de base + taxes TVA du pays, le tout dans une transaction atomique.
 * Les attributs comptables des comptes sont dérivés (mêmes règles que le seed).
 */
export async function creerDossier(input: CreerDossierInput): Promise<{ id: string }> {
  const nom = input.nom?.trim();
  if (!nom) throw new Error("Le nom du dossier est obligatoire.");
  if (!Number.isInteger(input.exercice) || input.exercice < 2000 || input.exercice > 2100) {
    throw new Error("Exercice invalide (année attendue entre 2000 et 2100).");
  }
  const paysDef = PAYS.find((p) => p.pays === input.pays);
  if (!paysDef) throw new Error(`Pays non supporté : ${input.pays}.`);
  const devise = input.devise?.trim();
  if (!devise) throw new Error("La devise est obligatoire.");

  const ref = await prisma.referentiel.findFirst({ where: { code: REFERENTIEL_CODE } });
  if (!ref) throw new Error("Référentiel SYSCOHADA introuvable : lancez `npm run db:seed`.");

  const dossier = await prisma.$transaction(async (tx) => {
    const d = await tx.dossier.create({
      data: {
        nom,
        ville: input.ville?.trim() ?? "",
        pays: input.pays,
        devise,
        exercice: input.exercice,
        referentielId: ref.id,
      },
    });

    await tx.journal.createMany({
      data: JOURNAUX_STANDARD.map((j) => ({ ...j, dossierId: d.id })),
    });

    await tx.compte.createMany({
      data: COMPTES_BASE_SYSCOHADA.map((c) => {
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
          dossierId: d.id,
        };
      }),
    });

    await tx.taxe.createMany({
      data: [
        {
          dossierId: d.id, code: "TVA-VENTE", nom: `TVA ${paysDef.tva}% (collectée)`,
          taux: new Prisma.Decimal(paysDef.tva), usage: "sale", compteNumero: "443100",
        },
        {
          dossierId: d.id, code: "TVA-ACHAT", nom: `TVA ${paysDef.tva}% (déductible)`,
          taux: new Prisma.Decimal(paysDef.tva), usage: "purchase", compteNumero: "445200",
        },
      ],
    });

    return d;
  });

  return { id: dossier.id };
}
