import { Prisma } from "@prisma/client";
import { arrondiDevise } from "./devise";

const D = (n: Prisma.Decimal.Value) => new Prisma.Decimal(n);

export type TypeMontantTaxe = "percent" | "fixed";

export interface OptionsTaxe {
  priceInclude: boolean;
  typeAmount: TypeMontantTaxe;
  devise: string;
}

export interface ResultatTaxe {
  baseHT: Prisma.Decimal;
  montantTaxe: Prisma.Decimal;
  montantTTC: Prisma.Decimal;
}

/**
 * Moteur de calcul d'une taxe sur un montant (équivalent account.tax.compute_all
 * d'Odoo, restreint au cas mono-taxe). Tous les montants sont arrondis à la
 * précision de la devise.
 *
 * - `typeAmount = "fixed"` : `taux` est un montant fixe (indépendant de la base).
 * - `typeAmount = "percent"` :
 *    - `priceInclude = false` : `montant` est la base HT ; taxe = base × taux %.
 *    - `priceInclude = true`  : `montant` est le TTC ; base = TTC / (1 + taux %).
 */
export function computeTaxe(
  montant: Prisma.Decimal.Value,
  taux: Prisma.Decimal.Value,
  opts: OptionsTaxe,
): ResultatTaxe {
  const m = D(montant);
  const t = D(taux);

  if (opts.typeAmount === "fixed") {
    const montantTaxe = arrondiDevise(t, opts.devise);
    const baseHT = arrondiDevise(m, opts.devise);
    return { baseHT, montantTaxe, montantTTC: arrondiDevise(baseHT.plus(montantTaxe), opts.devise) };
  }

  // percent
  if (opts.priceInclude) {
    const facteur = D(1).plus(t.dividedBy(100));
    const baseHT = arrondiDevise(m.dividedBy(facteur), opts.devise);
    const montantTTC = arrondiDevise(m, opts.devise);
    return { baseHT, montantTaxe: arrondiDevise(montantTTC.minus(baseHT), opts.devise), montantTTC };
  }

  const baseHT = arrondiDevise(m, opts.devise);
  const montantTaxe = arrondiDevise(baseHT.times(t).dividedBy(100), opts.devise);
  return { baseHT, montantTaxe, montantTTC: arrondiDevise(baseHT.plus(montantTaxe), opts.devise) };
}
