"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { verifierLettrageValide } from "@/lib/comptabilite/integrite";
import { arrondiDevise, estNulDevise } from "@/lib/comptabilite/devise";

const D = (n: Prisma.Decimal.Value) => new Prisma.Decimal(n);
const round2 = (n: number) => Math.round(n * 100) / 100;

export interface LettrageDTO {
  id: string;
  dossierId: string;
  ligneDebitId: string;
  ligneCreditId: string;
  montant: number;
  auto: boolean;
}

export interface OpenLineDTO {
  id: string;
  pieceId: string;
  pieceNumero: string;
  pieceDate: string; // ISO
  journalCode: string;
  compteNumero: string;
  intituleCompte: string;
  libelleLigne: string;
  debit: number;
  credit: number;
  amountResidual: number; // absolu
  sens: 1 | -1; // 1 = débit, -1 = crédit
  pieceStatut: 'BROUILLON' | 'VALIDEE' | 'ANNULEE';
  tiersId: string | null;
  tiersNom: string | null;
}

function toDTO(l: {
  id: string;
  dossierId: string;
  ligneDebitId: string;
  ligneCreditId: string;
  montant: Prisma.Decimal;
  auto: boolean;
}): LettrageDTO {
  return {
    id: l.id,
    dossierId: l.dossierId,
    ligneDebitId: l.ligneDebitId,
    ligneCreditId: l.ligneCreditId,
    montant: round2(Number(l.montant)),
    auto: l.auto,
  };
}

/**
 * Crée un lettrage entre une ligne débit et une ligne crédit du même compte.
 * Diminue le résiduel des deux lignes du montant lettré et marque comme lettrée
 * (isLettres) toute ligne dont le résiduel atteint 0. Le tout en transaction.
 */
export async function createLettrage(
  dossierId: string,
  ligneDebitId: string,
  ligneCreditId: string,
  montant: number,
  options: { auto?: boolean } = {}
): Promise<LettrageDTO> {
  const [ligneDebit, ligneCredit, dossier] = await Promise.all([
    prisma.ligneEcriture.findUniqueOrThrow({
      where: { id: ligneDebitId },
      include: { piece: { select: { dossierId: true } }, compte: { select: { reconciliable: true } } },
    }),
    prisma.ligneEcriture.findUniqueOrThrow({
      where: { id: ligneCreditId },
      include: { piece: { select: { dossierId: true } }, compte: { select: { reconciliable: true } } },
    }),
    prisma.dossier.findUniqueOrThrow({ where: { id: dossierId }, select: { devise: true } }),
  ]);

  // Montant effectivement lettré, arrondi à la précision de la devise (un FCFA
  // n'a pas de sous-unité : 999,6 XOF n'existe pas → 1000). On valide et on
  // applique ce montant arrondi, pas la saisie brute.
  const m = arrondiDevise(D(montant), dossier.devise);

  // Validation via l'invariant I4 — remplace tous les checks inline précédents.
  verifierLettrageValide({
    compteDebit: ligneDebit.compteNumero,
    compteCredit: ligneCredit.compteNumero,
    dossierDebit: ligneDebit.piece.dossierId,
    dossierCredit: ligneCredit.piece.dossierId,
    dossierAttendu: dossierId,
    sensDebitOk: ligneDebit.debit.greaterThan(ligneDebit.credit),
    sensCreditOk: ligneCredit.credit.greaterThan(ligneCredit.debit),
    compteReconciliable: ligneDebit.compte.reconciliable && ligneCredit.compte.reconciliable,
    tiersDebit: ligneDebit.tiersId,
    tiersCredit: ligneCredit.tiersId,
    montant: m,
    residuelDebit: ligneDebit.amountResidual,
    residuelCredit: ligneCredit.amountResidual,
    devise: dossier.devise,
  });

  const nouveauResDebit = arrondiDevise(D(ligneDebit.amountResidual).minus(m), dossier.devise);
  const nouveauResCredit = arrondiDevise(D(ligneCredit.amountResidual).minus(m), dossier.devise);

  const [, , lettrage] = await prisma.$transaction([
    prisma.ligneEcriture.update({
      where: { id: ligneDebitId },
      data: { amountResidual: nouveauResDebit, isLettres: estNulDevise(nouveauResDebit, dossier.devise) },
    }),
    prisma.ligneEcriture.update({
      where: { id: ligneCreditId },
      data: { amountResidual: nouveauResCredit, isLettres: estNulDevise(nouveauResCredit, dossier.devise) },
    }),
    prisma.lettrage.create({
      data: {
        dossierId,
        ligneDebitId,
        ligneCreditId,
        montant: m,
        auto: options.auto ?? false,
      },
    }),
  ]);

  return toDTO(lettrage);
}

/**
 * Supprime un lettrage et restaure le résiduel des deux lignes concernées
 * (chaque ligne récupère le montant lettré ; isLettres repasse à false).
 */
export async function deleteLettrage(id: string): Promise<void> {
  const lettrage = await prisma.lettrage.findUniqueOrThrow({
    where: { id },
    include: { ligneDebit: true, ligneCredit: true, dossier: { select: { devise: true } } },
  });

  const { devise } = lettrage.dossier;
  const m = D(lettrage.montant);
  const resDebit = arrondiDevise(D(lettrage.ligneDebit.amountResidual).plus(m), devise);
  const resCredit = arrondiDevise(D(lettrage.ligneCredit.amountResidual).plus(m), devise);

  await prisma.$transaction([
    prisma.ligneEcriture.update({
      where: { id: lettrage.ligneDebitId },
      data: { amountResidual: resDebit, isLettres: estNulDevise(resDebit, devise) },
    }),
    prisma.ligneEcriture.update({
      where: { id: lettrage.ligneCreditId },
      data: { amountResidual: resCredit, isLettres: estNulDevise(resCredit, devise) },
    }),
    prisma.lettrage.delete({ where: { id } }),
  ]);
}

/** Tous les lettrages d'un dossier (montant converti en number). */
export async function getLettragesByDossier(dossierId: string): Promise<LettrageDTO[]> {
  const lettrages = await prisma.lettrage.findMany({
    where: { dossierId },
    orderBy: { createdAt: "asc" },
  });
  return lettrages.map(toDTO);
}

/** Lettrages impliquant une ligne donnée (côté débit OU crédit). */
export async function getLettragesByLigne(ligneId: string): Promise<LettrageDTO[]> {
  const lettrages = await prisma.lettrage.findMany({
    where: { OR: [{ ligneDebitId: ligneId }, { ligneCreditId: ligneId }] },
    orderBy: { createdAt: "asc" },
  });
  return lettrages.map(toDTO);
}

/**
 * Retourne toutes les lignes d'écriture ouvertes (amountResidual > 0) appartenant à des pièces non annulées,
 * avec les informations nécessaires pour l'interface de lettrage manuel.
 */
export async function getOpenLines(dossierId: string): Promise<OpenLineDTO[]> {
  // Récupérer les lignes ouvertes avec les infos de pièce et journal
  const lignes = await prisma.ligneEcriture.findMany({
    where: {
      piece: { dossierId, statut: { not: "ANNULEE" } },
      amountResidual: { gt: 0 },
    },
    include: {
      piece: {
        select: {
          id: true,
          numeroPiece: true,
          datePiece: true,
          statut: true,
          journal: { select: { code: true } },
        },
      },
      tiers: { select: { nom: true } },
    },
    orderBy: [
      { piece: { datePiece: "asc" } },
      { piece: { numeroPiece: "asc" } },
      { ordre: "asc" },
    ],
  });

  // Récupérer les comptes du dossier pour obtenir l'intitulé
  const comptes = await prisma.compte.findMany({
    where: { dossierId },
    select: { numero: true, intitule: true },
  });
  const compteMap = new Map<string, string>();
  for (const c of comptes) {
    compteMap.set(c.numero, c.intitule);
  }

  // Construire le DTO
  return lignes.map((l) => {
    const sens = l.debit.greaterThan(l.credit) ? 1 : l.credit.greaterThan(l.debit) ? -1 : 0;
    // sens should never be 0 because amountResidual > 0 implies debit != credit
    return {
      id: l.id,
      pieceId: l.pieceId,
      pieceNumero: l.piece.numeroPiece,
      pieceDate: l.piece.datePiece.toISOString(),
      journalCode: l.piece.journal?.code ?? "",
      compteNumero: l.compteNumero,
      intituleCompte: compteMap.get(l.compteNumero) ?? "",
      libelleLigne: l.libelleLigne,
      debit: Number(l.debit),
      credit: Number(l.credit),
      amountResidual: Number(l.amountResidual),
      sens: sens as 1 | -1,
      pieceStatut: l.piece.statut as 'BROUILLON' | 'VALIDEE' | 'ANNULEE',
      tiersId: l.tiersId,
      tiersNom: l.tiers?.nom ?? null,
    };
  });
}