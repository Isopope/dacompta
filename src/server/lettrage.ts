"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

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
  const ligneDebit = await prisma.ligneEcriture.findUniqueOrThrow({ where: { id: ligneDebitId } });
  const ligneCredit = await prisma.ligneEcriture.findUniqueOrThrow({ where: { id: ligneCreditId } });

  // 1) Même compte de tiers obligatoire (on ne lettre pas deux comptes différents).
  if (ligneDebit.compteNumero !== ligneCredit.compteNumero) {
    throw new Error(
      `Lettrage impossible : comptes différents (${ligneDebit.compteNumero} ≠ ${ligneCredit.compteNumero}).`
    );
  }

  // 2) Sens : la 1re ligne doit être au débit, la 2e au crédit.
  const debitEstDebit = ligneDebit.debit.greaterThan(ligneDebit.credit);
  const creditEstCredit = ligneCredit.credit.greaterThan(ligneCredit.debit);
  if (!debitEstDebit || !creditEstCredit) {
    throw new Error(
      "Lettrage impossible : sens incompatible — il faut une ligne débit et une ligne crédit."
    );
  }

  // 3) Résiduel disponible sur chaque ligne (valeur absolue).
  const resDebit = round2(Number(ligneDebit.amountResidual));
  const resCredit = round2(Number(ligneCredit.amountResidual));
  if (resDebit <= 0 || resCredit <= 0) {
    throw new Error("Lettrage impossible : une des lignes est déjà totalement lettrée (résiduel nul).");
  }

  // 4) Le montant ne peut excéder le plus petit des deux résiduels.
  const m = round2(montant);
  const maxLettrable = Math.min(resDebit, resCredit);
  if (m <= 0 || m > maxLettrable) {
    throw new Error(
      `Lettrage impossible : montant ${m} invalide (résiduel disponible ${maxLettrable}).`
    );
  }

  const nouveauResDebit = round2(resDebit - m);
  const nouveauResCredit = round2(resCredit - m);

  const [, , lettrage] = await prisma.$transaction([
    prisma.ligneEcriture.update({
      where: { id: ligneDebitId },
      data: { amountResidual: D(nouveauResDebit), isLettres: nouveauResDebit === 0 },
    }),
    prisma.ligneEcriture.update({
      where: { id: ligneCreditId },
      data: { amountResidual: D(nouveauResCredit), isLettres: nouveauResCredit === 0 },
    }),
    prisma.lettrage.create({
      data: {
        dossierId,
        ligneDebitId,
        ligneCreditId,
        montant: D(m),
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
    include: { ligneDebit: true, ligneCredit: true },
  });

  const m = round2(Number(lettrage.montant));
  const resDebit = round2(Number(lettrage.ligneDebit.amountResidual) + m);
  const resCredit = round2(Number(lettrage.ligneCredit.amountResidual) + m);

  await prisma.$transaction([
    prisma.ligneEcriture.update({
      where: { id: lettrage.ligneDebitId },
      data: { amountResidual: D(resDebit), isLettres: resDebit === 0 },
    }),
    prisma.ligneEcriture.update({
      where: { id: lettrage.ligneCreditId },
      data: { amountResidual: D(resCredit), isLettres: resCredit === 0 },
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
    };
  });
}