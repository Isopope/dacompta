import { Prisma } from "@prisma/client";
import { arrondiDevise, estNulDevise } from "./devise";

export class ErreurIntegrite extends Error {
  constructor(message: string) { super(message); this.name = "ErreurIntegrite"; }
}

export interface LigneMontant { debit: Prisma.Decimal | number; credit: Prisma.Decimal | number; }

const D = (n: Prisma.Decimal | number) => new Prisma.Decimal(n);

/** I2 — Une ligne est soit au débit, soit au crédit, jamais les deux ; montants ≥ 0. */
export function verifierSignesLigne(ligne: LigneMontant): void {
  const d = D(ligne.debit), c = D(ligne.credit);
  if (d.isNegative() || c.isNegative()) {
    throw new ErreurIntegrite("Montant négatif interdit sur une ligne d'écriture.");
  }
  if (d.greaterThan(0) && c.greaterThan(0)) {
    throw new ErreurIntegrite("Une ligne ne peut être à la fois au débit et au crédit.");
  }
}

/** I3 — La pièce a au moins une ligne et un mouvement non nul. */
export function verifierPieceNonVide(lignes: LigneMontant[]): void {
  if (lignes.length === 0) throw new ErreurIntegrite("Pièce sans ligne.");
  const total = lignes.reduce((s, l) => s.plus(D(l.debit)).plus(D(l.credit)), new Prisma.Decimal(0));
  if (total.isZero()) throw new ErreurIntegrite("Pièce sans mouvement (tous les montants sont nuls).");
}

/** I1 — Partie double : Σ débits = Σ crédits (arrondi selon la devise). */
export function verifierEquilibre(lignes: LigneMontant[], devise: string): void {
  const totalD = arrondiDevise(lignes.reduce((s, l) => s.plus(D(l.debit)), new Prisma.Decimal(0)), devise);
  const totalC = arrondiDevise(lignes.reduce((s, l) => s.plus(D(l.credit)), new Prisma.Decimal(0)), devise);
  if (!estNulDevise(totalD.minus(totalC), devise)) {
    throw new ErreurIntegrite(`Pièce déséquilibrée : débit ${totalD} ≠ crédit ${totalC}.`);
  }
}

/** I5 — amountResidual = |debit − credit| − Σ(lettré), et ≥ 0. */
export function verifierResiduel(
  amountResidual: Prisma.Decimal, debit: Prisma.Decimal, credit: Prisma.Decimal,
  sommeLettree: Prisma.Decimal, devise: string,
): void {
  if (arrondiDevise(amountResidual, devise).isNegative()) {
    throw new ErreurIntegrite("Résiduel négatif.");
  }
  const attendu = arrondiDevise(D(debit).minus(D(credit)).abs().minus(sommeLettree), devise);
  if (!estNulDevise(D(amountResidual).minus(attendu), devise)) {
    throw new ErreurIntegrite(`Résiduel incohérent : ${amountResidual} attendu ${attendu}.`);
  }
}
