// src/lib/ui/facture-ui.ts
// Mappers purs pour l'interface facture : badge état paiement et aperçu des totaux.
import { Prisma } from "@prisma/client";
import { computeTaxe } from "@/lib/comptabilite/taxe";
import { arrondiDevise } from "@/lib/comptabilite/devise";

/**
 * Mappe un état de paiement vers un libellé affichable et une variante de badge.
 * - PAYE   → variante "ok"    (vert)
 * - PARTIEL → variante "warn"  (orange)
 * - NON_PAYE → variante "muted" (gris)
 */
export function badgeEtatPaiement(
  e: "NON_PAYE" | "PARTIEL" | "PAYE",
): { label: string; variant: "warn" | "ok" | "muted" } {
  switch (e) {
    case "PAYE":    return { label: "Payé",      variant: "ok" };
    case "PARTIEL": return { label: "Partiel",   variant: "warn" };
    default:        return { label: "Non payé",  variant: "muted" };
  }
}

/** Ligne de saisie HT : montant hors taxe et taux de TVA en pourcentage. */
export interface LigneSaisieHT {
  montantHT: number;
  taux: number;
}

/**
 * Calcule l'aperçu HT / TVA / TTC à partir d'une liste de lignes de saisie.
 * Chaque ligne est calculée via `computeTaxe` (percent, hors taxe).
 * Le total TTC est arrondi à la précision de la devise (ex. 0 décimale pour XOF).
 */
export function apercuTotaux(
  lignes: LigneSaisieHT[],
  devise: string,
): { ht: number; tva: number; ttc: number } {
  // Accumulation en Decimal pour éviter les erreurs de virgule flottante.
  let ht = new Prisma.Decimal(0);
  let tva = new Prisma.Decimal(0);

  for (const l of lignes) {
    const r = computeTaxe(l.montantHT, l.taux, {
      priceInclude: false,
      typeAmount: "percent",
      devise,
    });
    ht = ht.plus(r.baseHT);
    tva = tva.plus(r.montantTaxe);
  }

  // Le TTC doit être arrondi à la précision de la devise (contrainte devise).
  const ttc = arrondiDevise(ht.plus(tva), devise);

  return {
    ht:  ht.toNumber(),
    tva: tva.toNumber(),
    ttc: ttc.toNumber(),
  };
}
