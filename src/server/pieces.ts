"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export interface LignePieceInput {
  compteNumero: string;
  libelleLigne: string;
  debit: number;
  credit: number;
  sectionAnalytique?: string;
}

export interface CreerPieceInput {
  dossierId: string;
  journalId: string;
  numeroPiece: string;
  datePiece?: Date;
  fournisseur?: string;
  lignes: LignePieceInput[];
}

const D = (n: number) => new Prisma.Decimal(n);

export async function creerPiece(input: CreerPieceInput) {
  const lignes = input.lignes ?? [];

  const totalDebit = lignes.reduce((s, l) => s.plus(D(l.debit)), D(0));
  const totalCredit = lignes.reduce((s, l) => s.plus(D(l.credit)), D(0));
  if (!totalDebit.equals(totalCredit)) {
    throw new Error(`Pièce déséquilibrée : débit ${totalDebit} ≠ crédit ${totalCredit}.`);
  }

  const totalTVA = lignes
    .filter((l) => l.compteNumero.startsWith("445"))
    .reduce((s, l) => s.plus(D(l.debit)), D(0));
  const montantTTC = totalDebit;
  const montantTVA = totalTVA;
  const montantHT = totalDebit.minus(totalTVA);

  return prisma.piece.create({
    data: {
      numeroPiece: input.numeroPiece,
      datePiece: input.datePiece ?? new Date(),
      fournisseur: input.fournisseur ?? null,
      montantHT,
      montantTVA,
      montantTTC,
      journalId: input.journalId,
      dossierId: input.dossierId,
      lignes: {
        create: lignes.map((l, i) => ({
          compteNumero: l.compteNumero,
          libelleLigne: l.libelleLigne,
          debit: D(l.debit),
          credit: D(l.credit),
          ordre: i,
          sectionAnalytique: l.sectionAnalytique ?? null,
        })),
      },
    },
    include: { lignes: { orderBy: { ordre: "asc" } } },
  });
}

export interface FiltrePieces {
  statut?: "BROUILLON" | "VALIDEE" | "ANNULEE";
  journalId?: string;
}

export async function listerPieces(dossierId: string, filtre: FiltrePieces = {}) {
  return prisma.piece.findMany({
    where: {
      dossierId,
      ...(filtre.statut ? { statut: filtre.statut } : {}),
      ...(filtre.journalId ? { journalId: filtre.journalId } : {}),
    },
    include: { lignes: { orderBy: { ordre: "asc" } } },
    orderBy: { numeroPiece: "asc" },
  });
}

export async function validerPiece(id: string) {
  return prisma.piece.update({ where: { id }, data: { statut: "VALIDEE" } });
}

export async function annulerPiece(id: string) {
  return prisma.piece.update({ where: { id }, data: { statut: "ANNULEE" } });
}
