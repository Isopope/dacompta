"use server";

import { prisma } from "@/lib/db";
import { getEtatPaiementFacture, type EtatPaiementFacture } from "./paiements";

/** Élément de liste d'une facture client (pièce d'un journal de vente). */
export interface FactureListItem {
  id: string;
  numeroPiece: string;
  datePiece: string;
  statut: string;
  tiersNom: string | null;
  montantTTC: number;
  etatPaiement: EtatPaiementFacture;
}

/** Critères de filtrage pour la liste des factures. */
export interface FiltreFactures {
  statut?: "BROUILLON" | "VALIDEE" | "ANNULEE";
  texte?: string;
}

/** Factures clients = pièces des journaux de vente (journal.type = "sale"). */
export async function listerFactures(
  dossierId: string,
  filtre: FiltreFactures = {},
): Promise<FactureListItem[]> {
  // Récupère toutes les pièces dont le journal est de type "sale" (vente).
  const pieces = await prisma.piece.findMany({
    where: {
      dossierId,
      journal: { type: "sale" },
      ...(filtre.statut ? { statut: filtre.statut } : {}),
    },
    include: { lignes: { include: { tiers: { select: { nom: true } } } } },
    orderBy: { numeroPiece: "asc" },
  });

  // Construit chaque élément de liste en calculant l'état de paiement à la volée.
  const items = await Promise.all(
    pieces.map(async (p) => {
      // La ligne de tiers est celle qui porte un tiersId (compte client collectif).
      const ligneTiers = p.lignes.find((l) => l.tiersId != null);
      return {
        id: p.id,
        numeroPiece: p.numeroPiece,
        datePiece: p.datePiece.toISOString(),
        statut: p.statut,
        tiersNom: ligneTiers?.tiers?.nom ?? null,
        montantTTC: Number(p.montantTTC),
        etatPaiement: await getEtatPaiementFacture(dossierId, p.id),
      };
    }),
  );

  // Filtre textuel sur le numéro de pièce ou le nom du tiers (insensible à la casse).
  if (!filtre.texte) return items;
  const t = filtre.texte.toLowerCase();
  return items.filter(
    (i) => i.numeroPiece.toLowerCase().includes(t) || (i.tiersNom ?? "").toLowerCase().includes(t),
  );
}
