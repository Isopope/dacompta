import { Prisma } from "@prisma/client";

const SANS_DECIMALE = new Set(["XOF", "XAF", "GNF", "CDF", "JPY"]);

/** Nombre de décimales significatives d'une devise. */
export function decimalesDevise(devise: string): number {
  return SANS_DECIMALE.has((devise ?? "").toUpperCase()) ? 0 : 2;
}

/** Arrondit un montant à la précision de la devise (arrondi commercial). */
export function arrondiDevise(montant: Prisma.Decimal, devise: string): Prisma.Decimal {
  return montant.toDecimalPlaces(decimalesDevise(devise), Prisma.Decimal.ROUND_HALF_UP);
}

/** Vrai si le montant est nul une fois arrondi à la précision de la devise. */
export function estNulDevise(montant: Prisma.Decimal, devise: string): boolean {
  return arrondiDevise(montant, devise).isZero();
}
