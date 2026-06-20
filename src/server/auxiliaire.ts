"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

// Grand-livre et balance AUXILIAIRES : la ventilation par tiers d'un compte
// collectif (équivalent partner ledger / aged partner balance d'Odoo).

const D = (n: Prisma.Decimal.Value) => new Prisma.Decimal(n);
const MS_PAR_JOUR = 24 * 60 * 60 * 1000;

export interface LigneAuxiliaire {
  date: string; // ISO
  numeroPiece: string;
  libelle: string;
  debit: number;
  credit: number;
  soldeApres: number;
}

export interface CompteAuxiliaire {
  tiersId: string;
  tiersCode: string;
  tiersNom: string;
  totalDebit: number;
  totalCredit: number;
  solde: number; // débit − crédit
  lignes: LigneAuxiliaire[];
}

/**
 * Grand-livre auxiliaire d'un compte collectif : un sous-compte par tiers, avec
 * solde cumulé. La somme des soldes auxiliaires = solde du compte collectif.
 */
export async function getGrandLivreAuxiliaire(
  dossierId: string,
  compteNumero: string,
): Promise<CompteAuxiliaire[]> {
  const lignes = await prisma.ligneEcriture.findMany({
    where: {
      compteNumero,
      tiersId: { not: null },
      piece: { dossierId, statut: { not: "ANNULEE" } },
    },
    include: {
      piece: { select: { numeroPiece: true, datePiece: true } },
      tiers: { select: { id: true, code: true, nom: true } },
    },
  });

  lignes.sort((a, b) => {
    const da = a.piece.datePiece.getTime(), db = b.piece.datePiece.getTime();
    if (da !== db) return da - db;
    return a.piece.numeroPiece.localeCompare(b.piece.numeroPiece);
  });

  const parTiers = new Map<string, CompteAuxiliaire>();
  const cumul = new Map<string, Prisma.Decimal>();

  for (const l of lignes) {
    const t = l.tiers!;
    let aux = parTiers.get(t.id);
    if (!aux) {
      aux = { tiersId: t.id, tiersCode: t.code, tiersNom: t.nom, totalDebit: 0, totalCredit: 0, solde: 0, lignes: [] };
      parTiers.set(t.id, aux);
      cumul.set(t.id, D(0));
    }
    const solde = cumul.get(t.id)!.plus(l.debit).minus(l.credit);
    cumul.set(t.id, solde);
    aux.totalDebit += Number(l.debit);
    aux.totalCredit += Number(l.credit);
    aux.solde = solde.toNumber();
    aux.lignes.push({
      date: l.piece.datePiece.toISOString(),
      numeroPiece: l.piece.numeroPiece,
      libelle: l.libelleLigne,
      debit: Number(l.debit),
      credit: Number(l.credit),
      soldeApres: solde.toNumber(),
    });
  }

  return [...parTiers.values()].sort((a, b) => a.tiersCode.localeCompare(b.tiersCode));
}

export interface LigneBalanceAgee {
  tiersId: string;
  tiersCode: string;
  tiersNom: string;
  b0_30: number;
  b31_60: number;
  b61_90: number;
  b90plus: number;
  total: number;
}

/**
 * Balance âgée (échéancier) par tiers : ventile les résiduels OUVERTS
 * (amountResidual > 0) par tranche d'ancienneté, calculée depuis la date de la
 * pièce jusqu'à `dateReference`. Équivalent Aged Partner Balance d'Odoo
 * (approximé sur la date de pièce, faute d'échéances/date_maturity).
 */
export async function getBalanceAgee(
  dossierId: string,
  dateReference: Date = new Date(),
): Promise<LigneBalanceAgee[]> {
  const lignes = await prisma.ligneEcriture.findMany({
    where: {
      tiersId: { not: null },
      amountResidual: { gt: 0 },
      piece: { dossierId, statut: { not: "ANNULEE" } },
    },
    include: {
      piece: { select: { datePiece: true } },
      tiers: { select: { id: true, code: true, nom: true } },
    },
  });

  const parTiers = new Map<string, LigneBalanceAgee>();
  for (const l of lignes) {
    const t = l.tiers!;
    let row = parTiers.get(t.id);
    if (!row) {
      row = { tiersId: t.id, tiersCode: t.code, tiersNom: t.nom, b0_30: 0, b31_60: 0, b61_90: 0, b90plus: 0, total: 0 };
      parTiers.set(t.id, row);
    }
    const jours = Math.floor((dateReference.getTime() - l.piece.datePiece.getTime()) / MS_PAR_JOUR);
    // Sens : créance (débit) positive, dette (crédit) négative.
    const sens = l.debit.greaterThan(l.credit) ? 1 : -1;
    const montant = sens * Number(l.amountResidual);
    if (jours <= 30) row.b0_30 += montant;
    else if (jours <= 60) row.b31_60 += montant;
    else if (jours <= 90) row.b61_90 += montant;
    else row.b90plus += montant;
    row.total += montant;
  }

  return [...parTiers.values()].sort((a, b) => a.tiersCode.localeCompare(b.tiersCode));
}
