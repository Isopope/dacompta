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
          // Résiduel de lettrage initialisé au montant de la ligne (|débit − crédit|),
          // non lettrée par défaut. Le lettrage le fera décroître vers 0.
          amountResidual: D(Math.abs(l.debit - l.credit)),
          isLettres: false,
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
  // Annuler une pièce lettrée doit d'abord défaire ses lettrages : sinon le
  // résiduel des lignes en face resterait diminué alors que la contrepartie
  // disparaît des soldes. (Odoo interdit de toucher une ligne rapprochée sans
  // casser d'abord le rapprochement ; ici on casse automatiquement.)
  return prisma.$transaction(async (tx) => {
    const lignes = await tx.ligneEcriture.findMany({ where: { pieceId: id }, select: { id: true } });
    const ligneIds = lignes.map((l) => l.id);

    const lettrages = ligneIds.length
      ? await tx.lettrage.findMany({
          where: { OR: [{ ligneDebitId: { in: ligneIds } }, { ligneCreditId: { in: ligneIds } }] },
        })
      : [];

    if (lettrages.length) {
      // Montant à restituer par ligne (cumulé si plusieurs lettrages la touchent).
      const restitution = new Map<string, number>();
      for (const lt of lettrages) {
        const m = Number(lt.montant);
        restitution.set(lt.ligneDebitId, (restitution.get(lt.ligneDebitId) ?? 0) + m);
        restitution.set(lt.ligneCreditId, (restitution.get(lt.ligneCreditId) ?? 0) + m);
      }
      for (const [ligneId, montant] of restitution) {
        const ligne = await tx.ligneEcriture.findUniqueOrThrow({ where: { id: ligneId } });
        const nouveau = Math.round((Number(ligne.amountResidual) + montant) * 100) / 100;
        await tx.ligneEcriture.update({
          where: { id: ligneId },
          data: { amountResidual: D(nouveau), isLettres: nouveau === 0 },
        });
      }
      await tx.lettrage.deleteMany({ where: { id: { in: lettrages.map((l) => l.id) } } });
    }

    return tx.piece.update({ where: { id }, data: { statut: "ANNULEE" } });
  });
}
