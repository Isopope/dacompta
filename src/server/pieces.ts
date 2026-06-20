"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { verifierEquilibre, verifierPieceNonVide, verifierSignesLigne, calculerHash, ErreurIntegrite } from "@/lib/comptabilite/integrite";

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

  // Devise du dossier (pour l'arrondi des invariants).
  const dossier = await prisma.dossier.findUniqueOrThrow({
    where: { id: input.dossierId }, select: { devise: true },
  });

  // Invariants métier (lèvent ErreurIntegrite sinon).
  verifierPieceNonVide(lignes);
  for (const l of lignes) verifierSignesLigne(l);
  verifierEquilibre(lignes, dossier.devise);

  // Résolution stricte des comptes → compteId (FK).
  const comptes = await prisma.compte.findMany({
    where: { dossierId: input.dossierId, numero: { in: lignes.map((l) => l.compteNumero) } },
    select: { id: true, numero: true },
  });
  const parNumero = new Map(comptes.map((c) => [c.numero, c.id]));
  for (const l of lignes) {
    if (!parNumero.has(l.compteNumero)) {
      throw new Error(`Compte inexistant dans ce dossier : ${l.compteNumero}.`);
    }
  }

  // TVA = mouvements sur les comptes de TVA, quel que soit le sens :
  //  - 445 TVA récupérable/déductible (au débit, sur les achats)
  //  - 443 TVA facturée/collectée (au crédit, sur les ventes)
  // NB : heuristique de POC. La TVA « réelle » devrait venir d'un moteur de taxes
  // (account.tax chez Odoo), pas d'un préfixe de compte.
  const estCompteTVA = (n: string) => n.startsWith("443") || n.startsWith("445");
  const totalTVA = lignes
    .filter((l) => estCompteTVA(l.compteNumero))
    .reduce((s, l) => s.plus(D(l.debit)).plus(D(l.credit)), D(0));
  const totalDebit = lignes.reduce((s, l) => s.plus(D(l.debit)), D(0));
  const montantTTC = totalDebit;
  const montantTVA = totalTVA;
  const montantHT = montantTTC.minus(montantTVA);

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
          compteId: parNumero.get(l.compteNumero)!,
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
  return prisma.$transaction(async (tx) => {
    const piece = await tx.piece.findUniqueOrThrow({
      where: { id },
      include: {
        lignes: { orderBy: { ordre: "asc" } },
        journal: true,
        dossier: true,
      },
    });

    if (piece.statut !== "BROUILLON") {
      throw new ErreurIntegrite("Seule une pièce BROUILLON peut être validée.");
    }

    verifierPieceNonVide(piece.lignes);
    verifierEquilibre(piece.lignes, piece.dossier.devise);

    const exercice = piece.datePiece.getFullYear();

    // Compteur (dossier, journal, exercice) — incrément atomique dans la transaction.
    const seq = await tx.sequencePiece.upsert({
      where: {
        dossierId_journalId_exercice: {
          dossierId: piece.dossierId,
          journalId: piece.journalId,
          exercice,
        },
      },
      update: { dernierNumero: { increment: 1 } },
      create: {
        dossierId: piece.dossierId,
        journalId: piece.journalId,
        exercice,
        dernierNumero: 1,
      },
    });

    const numeroPiece = `${piece.journal.code}/${exercice}/${String(seq.dernierNumero).padStart(4, "0")}`;

    // Hash chaîné : dernière pièce validée du même (journal, exercice).
    const precedente = await tx.piece.findFirst({
      where: {
        dossierId: piece.dossierId,
        journalId: piece.journalId,
        exercice,
        statut: "VALIDEE",
      },
      orderBy: { dateValidation: "desc" },
      select: { hash: true },
    });

    const hashPrecedent = precedente?.hash ?? null;
    const hash = calculerHash(
      {
        dossierId: piece.dossierId,
        journalId: piece.journalId,
        datePieceISO: piece.datePiece.toISOString(),
        exercice,
        numeroPiece,
        lignes: piece.lignes.map((l) => ({
          compteNumero: l.compteNumero,
          debit: l.debit.toString(),
          credit: l.credit.toString(),
          ordre: l.ordre,
        })),
      },
      hashPrecedent,
    );

    return tx.piece.update({
      where: { id },
      data: {
        statut: "VALIDEE",
        numeroPiece,
        exercice,
        dateValidation: new Date(),
        hash,
        hashPrecedent,
      },
    });
  });
}

export async function annulerPiece(id: string) {
  // Une pièce validée est immuable : seule l'extourne peut la corriger.
  const cible = await prisma.piece.findUniqueOrThrow({ where: { id }, select: { statut: true } });
  if (cible.statut === "VALIDEE") {
    throw new ErreurIntegrite("Une pièce validée est immuable : utilisez l'extourne.");
  }

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
