import { createHash } from "node:crypto";
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

export interface LettrageArgs {
  compteDebit: string; compteCredit: string;
  dossierDebit: string; dossierCredit: string; dossierAttendu: string;
  sensDebitOk: boolean; sensCreditOk: boolean;
  montant: Prisma.Decimal; residuelDebit: Prisma.Decimal; residuelCredit: Prisma.Decimal;
  devise: string;
}

/** I4 — Conditions d'un lettrage valide entre une ligne débit et une ligne crédit. */
export function verifierLettrageValide(a: LettrageArgs): void {
  if (a.dossierDebit !== a.dossierAttendu || a.dossierCredit !== a.dossierAttendu) {
    throw new ErreurIntegrite("Les lignes n'appartiennent pas au dossier indiqué.");
  }
  if (a.compteDebit !== a.compteCredit) {
    throw new ErreurIntegrite(`Comptes différents (${a.compteDebit} ≠ ${a.compteCredit}).`);
  }
  if (!a.sensDebitOk || !a.sensCreditOk) {
    throw new ErreurIntegrite("Sens incompatible — il faut une ligne débit et une ligne crédit.");
  }
  const max = Prisma.Decimal.min(a.residuelDebit, a.residuelCredit);
  if (a.montant.lessThanOrEqualTo(0) || a.montant.greaterThan(max)) {
    throw new ErreurIntegrite(`Montant ${a.montant} invalide (résiduel disponible ${max}).`);
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

export interface PieceHashInput {
  dossierId: string; journalId: string; datePieceISO: string;
  exercice: number; numeroPiece: string;
  lignes: { compteNumero: string; debit: string; credit: string; ordre: number }[];
}

/** I6 — Empreinte déterministe d'une pièce validée, chaînée à la précédente. */
export function calculerHash(piece: PieceHashInput, hashPrecedent: string | null): string {
  const lignes = [...piece.lignes].sort((a, b) => a.ordre - b.ordre)
    .map((l) => [l.ordre, l.compteNumero, l.debit, l.credit]);
  const charge = JSON.stringify({
    dossierId: piece.dossierId, journalId: piece.journalId, datePieceISO: piece.datePieceISO,
    exercice: piece.exercice, numeroPiece: piece.numeroPiece, lignes, hashPrecedent,
  });
  return createHash("sha256").update(charge).digest("hex");
}

/** Rejoue et vérifie la chaîne (pièces ordonnées par numéro de séquence). */
export function verifierChaine(
  pieces: (PieceHashInput & { hash: string; hashPrecedent: string | null })[],
): void {
  let precedent: string | null = null;
  for (const p of pieces) {
    if (p.hashPrecedent !== precedent) {
      throw new ErreurIntegrite(`Rupture de chaîne sur ${p.numeroPiece} : maillon précédent incorrect.`);
    }
    if (calculerHash(p, precedent) !== p.hash) {
      throw new ErreurIntegrite(`Pièce ${p.numeroPiece} altérée : hash non reproductible.`);
    }
    precedent = p.hash;
  }
}
