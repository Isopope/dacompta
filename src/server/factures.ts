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

/** Ligne d'écriture d'une facture (document détaillé). */
export interface FactureLigne {
  id: string; compteNumero: string; libelleLigne: string;
  debit: number; credit: number; tiersNom: string | null; taxeCode: string | null;
}

/** Détail complet d'une facture avec en-tête, lignes et compteurs smart buttons. */
export interface FactureDetail {
  id: string; numeroPiece: string; datePiece: string; statut: string;
  journalCode: string; tiersId: string | null; tiersNom: string | null;
  montantHT: number; montantTVA: number; montantTTC: number;
  etatPaiement: EtatPaiementFacture; nbPaiements: number; estLettree: boolean;
  lignes: FactureLigne[];
}

/**
 * Retourne le document complet d'une facture : en-tête, lignes d'écriture et
 * compteurs smart buttons (nbPaiements = lettrages rapprochés, estLettree).
 */
export async function getFacture(dossierId: string, id: string): Promise<FactureDetail> {
  // Charge la pièce avec son journal, ses lignes, le tiers et la taxe de chaque ligne.
  const p = await prisma.piece.findFirstOrThrow({
    where: { id, dossierId },
    include: {
      journal: { select: { code: true } },
      lignes: {
        orderBy: { ordre: "asc" },
        include: { tiers: { select: { id: true, nom: true } }, taxe: { select: { code: true } } },
      },
    },
  });

  // La ligne de tiers est celle qui porte un tiersId (compte collectif 411/401).
  const ligneTiers = p.lignes.find((l) => l.tiersId != null);

  // Nombre de lettrages touchant la ligne de tiers = "paiements" rapprochés (smart button).
  const nbPaiements = ligneTiers
    ? await prisma.lettrage.count({
        where: { OR: [{ ligneDebitId: ligneTiers.id }, { ligneCreditId: ligneTiers.id }] },
      })
    : 0;

  // La facture est soldée quand le résiduel de la ligne de tiers est nul (amountResidual = 0).
  const estLettree = ligneTiers ? Number(ligneTiers.amountResidual) === 0 : false;

  return {
    id: p.id,
    numeroPiece: p.numeroPiece,
    datePiece: p.datePiece.toISOString(),
    statut: p.statut,
    journalCode: p.journal.code,
    tiersId: ligneTiers?.tiersId ?? null,
    tiersNom: ligneTiers?.tiers?.nom ?? null,
    montantHT: Number(p.montantHT),
    montantTVA: Number(p.montantTVA),
    montantTTC: Number(p.montantTTC),
    etatPaiement: await getEtatPaiementFacture(dossierId, p.id),
    nbPaiements,
    estLettree,
    lignes: p.lignes.map((l) => ({
      id: l.id,
      compteNumero: l.compteNumero,
      libelleLigne: l.libelleLigne,
      debit: Number(l.debit),
      credit: Number(l.credit),
      tiersNom: l.tiers?.nom ?? null,
      taxeCode: l.taxe?.code ?? null,
    })),
  };
}

// ── Paiements ────────────────────────────────────────────────────────────────

/** Élément de liste d'un paiement enregistré (encaissement / décaissement). */
export interface PaiementListItem {
  id: string;
  numeroPiece: string;
  date: string;
  tiersNom: string | null;
  montant: number;
  sens: string;
}

/**
 * Retourne la liste des paiements d'un dossier, triés du plus récent au plus ancien.
 * Filtre optionnel par tiers.
 *
 * Schéma vérifié : Paiement.tiers → Tiers.nom ; Paiement.piece → Piece.numeroPiece.
 * Les deux relations existent dans schema.prisma (PaiementPiece + Tiers).
 */
export async function listerPaiements(
  dossierId: string,
  filtre: { tiersId?: string } = {},
): Promise<PaiementListItem[]> {
  const ps = await prisma.paiement.findMany({
    where: {
      dossierId,
      ...(filtre.tiersId ? { tiersId: filtre.tiersId } : {}),
    },
    include: {
      tiers: { select: { nom: true } },
      piece: { select: { numeroPiece: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return ps.map((p) => ({
    id: p.id,
    numeroPiece: p.piece?.numeroPiece ?? "—",
    date: p.datePaiement.toISOString(),
    tiersNom: p.tiers?.nom ?? null,
    montant: Number(p.montant),
    sens: p.sens,
  }));
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
