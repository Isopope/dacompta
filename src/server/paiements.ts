"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { arrondiDevise, estNulDevise } from "@/lib/comptabilite/devise";
import { creerPiece } from "./pieces";
import { validerPiece } from "./pieces";
import { createLettrage } from "./lettrage";

const D = (n: Prisma.Decimal.Value) => new Prisma.Decimal(n);

export type SensPaiement = "ENTRANT" | "SORTANT";
export type EtatPaiementFacture = "NON_PAYE" | "PARTIEL" | "PAYE";

export interface EnregistrerPaiementInput {
  dossierId: string;
  journalId: string;
  numeroPiece: string;
  datePiece?: Date;
  sens: SensPaiement;
  tiersId: string;
  compteTresorerieNumero: string; // 521/571
  compteTiersNumero: string; // 411 (entrant) / 401 (sortant)
  montant: number;
}

/**
 * Enregistre un paiement (équivalent account.payment d'Odoo) : génère une pièce
 * de trésorerie équilibrée, la valide (séquence + hash), puis la lettre
 * automatiquement (FIFO) contre les factures ouvertes du tiers.
 *
 * - ENTRANT (encaissement client) : débit trésorerie, crédit compte client.
 * - SORTANT (décaissement fournisseur) : crédit trésorerie, débit compte fournisseur.
 */
export async function enregistrerPaiement(input: EnregistrerPaiementInput) {
  const dossier = await prisma.dossier.findUniqueOrThrow({
    where: { id: input.dossierId }, select: { devise: true },
  });
  const m = arrondiDevise(D(input.montant), dossier.devise).toNumber();
  const entrant = input.sens === "ENTRANT";

  // Pièce de trésorerie équilibrée.
  const brouillon = await creerPiece({
    dossierId: input.dossierId,
    journalId: input.journalId,
    numeroPiece: input.numeroPiece,
    datePiece: input.datePiece,
    lignes: [
      {
        compteNumero: input.compteTresorerieNumero,
        libelleLigne: entrant ? "Encaissement" : "Décaissement",
        debit: entrant ? m : 0,
        credit: entrant ? 0 : m,
      },
      {
        compteNumero: input.compteTiersNumero,
        libelleLigne: entrant ? "Règlement client" : "Règlement fournisseur",
        debit: entrant ? 0 : m,
        credit: entrant ? m : 0,
        tiersId: input.tiersId,
      },
    ],
  });
  await validerPiece(brouillon.id);

  // Ligne de tiers du paiement (à lettrer).
  const lignesPaiement = await prisma.ligneEcriture.findMany({ where: { pieceId: brouillon.id } });
  const ligneTiersPaiement = lignesPaiement.find((l) => l.compteNumero === input.compteTiersNumero)!;

  // Factures ouvertes du tiers, sens opposé, FIFO par date de pièce.
  const ouvertes = await prisma.ligneEcriture.findMany({
    where: {
      compteNumero: input.compteTiersNumero,
      tiersId: input.tiersId,
      amountResidual: { gt: 0 },
      id: { not: ligneTiersPaiement.id },
      piece: { dossierId: input.dossierId, statut: { not: "ANNULEE" } },
      // Entrant : on solde des factures au débit ; sortant : au crédit.
      ...(entrant ? { debit: { gt: 0 } } : { credit: { gt: 0 } }),
    },
    include: { piece: { select: { datePiece: true } } },
  });
  ouvertes.sort((a, b) => a.piece.datePiece.getTime() - b.piece.datePiece.getTime());

  let residuelPaiement = Number(ligneTiersPaiement.amountResidual);
  for (const facture of ouvertes) {
    if (estNulDevise(D(residuelPaiement), dossier.devise)) break;
    const montantLettre = Math.min(residuelPaiement, Number(facture.amountResidual));
    if (montantLettre <= 0) continue;
    // Entrant : facture au débit, paiement au crédit. Sortant : l'inverse.
    if (entrant) {
      await createLettrage(input.dossierId, facture.id, ligneTiersPaiement.id, montantLettre);
    } else {
      await createLettrage(input.dossierId, ligneTiersPaiement.id, facture.id, montantLettre);
    }
    residuelPaiement -= montantLettre;
  }

  const paiement = await prisma.paiement.create({
    data: {
      dossierId: input.dossierId,
      tiersId: input.tiersId,
      pieceId: brouillon.id,
      sens: input.sens,
      montant: D(m),
      datePaiement: input.datePiece ?? new Date(),
      etat: "posted",
    },
  });

  return { paiement, piece: brouillon };
}

/**
 * État de paiement d'une facture (équivalent payment_state d'Odoo), DÉRIVÉ du
 * résiduel des lignes de tiers de la facture (pas de champ stocké : toujours exact).
 */
export async function getEtatPaiementFacture(
  dossierId: string,
  pieceId: string,
): Promise<EtatPaiementFacture> {
  const dossier = await prisma.dossier.findUniqueOrThrow({ where: { id: dossierId }, select: { devise: true } });
  const lignes = await prisma.ligneEcriture.findMany({
    where: { pieceId, tiersId: { not: null } },
    select: { debit: true, credit: true, amountResidual: true },
  });
  if (lignes.length === 0) return "NON_PAYE";

  let original = D(0), residuel = D(0);
  for (const l of lignes) {
    original = original.plus(D(l.debit).minus(l.credit).abs());
    residuel = residuel.plus(l.amountResidual);
  }
  if (estNulDevise(residuel, dossier.devise)) return "PAYE";
  if (estNulDevise(residuel.minus(original), dossier.devise)) return "NON_PAYE";
  return "PARTIEL";
}
