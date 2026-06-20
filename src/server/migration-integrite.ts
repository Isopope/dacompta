"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getBalance } from "./balance";
import { verifierResiduel } from "@/lib/comptabilite/integrite";
import { calculerHash } from "@/lib/comptabilite/integrite";

// ---------------------------------------------------------------------------
// Types d'anomalie
// ---------------------------------------------------------------------------
export type Anomalie =
  | { type: "COMPTE_ORPHELIN"; compteNumero: string }
  | { type: "PIECE_DESEQUILIBREE"; pieceId: string }
  | { type: "LIGNE_SIGNE"; ligneId: string }
  | { type: "RESIDUEL_INCOHERENT"; ligneId: string; detail: string }
  | { type: "LETTRAGE_INTERDOSSIER"; lettrageId: string };

// ---------------------------------------------------------------------------
// Pré-vol : audit en lecture seule
// ---------------------------------------------------------------------------

/**
 * Phase 0 — Pré-vol en lecture seule.
 * Remonte toutes les anomalies bloquantes sans écrire en base.
 */
export async function preVolMigration(dossierId: string): Promise<Anomalie[]> {
  const anomalies: Anomalie[] = [];

  // ─── 1. Lignes et comptes ───────────────────────────────────────────────
  const lignes = await prisma.ligneEcriture.findMany({
    where: { piece: { dossierId } },
    select: {
      id: true,
      compteNumero: true,
      debit: true,
      credit: true,
      amountResidual: true,
      lettragesDebit: { select: { montant: true } },
      lettragesCredit: { select: { montant: true } },
    },
  });

  // Comptes présents dans ce dossier
  const numeros = [...new Set(lignes.map((l) => l.compteNumero))];
  const comptesExistants = new Set(
    (
      await prisma.compte.findMany({
        where: { dossierId, numero: { in: numeros } },
        select: { numero: true },
      })
    ).map((c) => c.numero),
  );

  // SoldeAntérieur — compteNumero orphelins
  const soldes = await prisma.soldeAnterieur.findMany({
    where: { dossierId },
    select: { compteNumero: true },
  });
  for (const s of soldes) {
    if (!comptesExistants.has(s.compteNumero)) {
      // seulement si pas encore signalé via lignes
      if (!anomalies.some((a) => a.type === "COMPTE_ORPHELIN" && a.compteNumero === s.compteNumero)) {
        anomalies.push({ type: "COMPTE_ORPHELIN", compteNumero: s.compteNumero });
      }
    }
  }

  for (const n of numeros) {
    if (!comptesExistants.has(n)) {
      anomalies.push({ type: "COMPTE_ORPHELIN", compteNumero: n });
    }
  }

  // ─── 2. Ligne débit ET crédit simultanément ─────────────────────────────
  for (const l of lignes) {
    if (new Prisma.Decimal(l.debit).greaterThan(0) && new Prisma.Decimal(l.credit).greaterThan(0)) {
      anomalies.push({ type: "LIGNE_SIGNE", ligneId: l.id });
    }
  }

  // ─── 3. Résiduel incohérent ──────────────────────────────────────────────
  const dossier = await prisma.dossier.findUniqueOrThrow({
    where: { id: dossierId },
    select: { devise: true },
  });
  for (const l of lignes) {
    const sommeLettree = [
      ...l.lettragesDebit.map((lt) => new Prisma.Decimal(lt.montant)),
      ...l.lettragesCredit.map((lt) => new Prisma.Decimal(lt.montant)),
    ].reduce((s, m) => s.plus(m), new Prisma.Decimal(0));
    try {
      verifierResiduel(
        new Prisma.Decimal(l.amountResidual),
        new Prisma.Decimal(l.debit),
        new Prisma.Decimal(l.credit),
        sommeLettree,
        dossier.devise,
      );
    } catch (err: unknown) {
      anomalies.push({
        type: "RESIDUEL_INCOHERENT",
        ligneId: l.id,
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ─── 4. Pièces VALIDEE déséquilibrées ───────────────────────────────────
  const pieces = await prisma.piece.findMany({
    where: { dossierId, statut: "VALIDEE" },
    include: { lignes: true },
  });
  for (const p of pieces) {
    const totalD = p.lignes.reduce((s, l) => s.plus(new Prisma.Decimal(l.debit)), new Prisma.Decimal(0));
    const totalC = p.lignes.reduce((s, l) => s.plus(new Prisma.Decimal(l.credit)), new Prisma.Decimal(0));
    if (!totalD.equals(totalC)) {
      anomalies.push({ type: "PIECE_DESEQUILIBREE", pieceId: p.id });
    }
  }

  // ─── 5. Lettrages inter-dossier ──────────────────────────────────────────
  const lettrages = await prisma.lettrage.findMany({
    where: { dossierId },
    include: {
      ligneDebit: { include: { piece: true } },
      ligneCredit: { include: { piece: true } },
    },
  });
  for (const lt of lettrages) {
    if (
      lt.ligneDebit.piece.dossierId !== dossierId ||
      lt.ligneCredit.piece.dossierId !== dossierId
    ) {
      anomalies.push({ type: "LETTRAGE_INTERDOSSIER", lettrageId: lt.id });
    }
  }

  return anomalies;
}

// ---------------------------------------------------------------------------
// Exécution de migration
// ---------------------------------------------------------------------------

/**
 * Renumérote les pièces VALIDEE de façon déterministe et idempotente.
 * Tri par (journalId, exercice, datePiece, createdAt).
 * Pour les pièces non-validées : ref provisoire BROUILLON-<id> / ANNULEE-<id>.
 * Ne fait RIEN si preVolMigration remonte des anomalies.
 * Vérifie que la balance ne change pas après migration.
 */
export async function executerMigration(
  dossierId: string,
): Promise<{ balanceIdentique: boolean }> {
  // ─── Pré-vol ─────────────────────────────────────────────────────────────
  const anomalies = await preVolMigration(dossierId);
  if (anomalies.length > 0) {
    throw new Error(
      `Migration refusée : ${anomalies.length} anomalie(s) détectée(s) au pré-vol. ${JSON.stringify(anomalies)}`,
    );
  }

  // ─── Balance avant ────────────────────────────────────────────────────────
  const avant = await getBalance(dossierId);

  // ─── Transaction de renumérotation ───────────────────────────────────────
  await prisma.$transaction(async (tx) => {
    // Récupérer toutes les pièces VALIDEE du dossier
    const piecesValidees = await tx.piece.findMany({
      where: { dossierId, statut: "VALIDEE" },
      include: {
        lignes: { orderBy: { ordre: "asc" } },
        journal: true,
      },
      orderBy: [
        { journalId: "asc" },
        { datePiece: "asc" },
        { createdAt: "asc" },
      ],
    });

    // Regrouper par (journalId, exercice) pour séquencer
    const groupes = new Map<string, typeof piecesValidees>();
    for (const p of piecesValidees) {
      const exercice = p.exercice ?? p.datePiece.getFullYear();
      const clef = `${p.journalId}__${exercice}`;
      if (!groupes.has(clef)) groupes.set(clef, []);
      groupes.get(clef)!.push(p);
    }

    // Pour chaque groupe, renuméroter de façon déterministe
    for (const [clef, pieces] of groupes.entries()) {
      const [journalId, exerciceStr] = clef.split("__");
      const exercice = Number(exerciceStr);
      const journalCode = pieces[0].journal.code;

      // Réinitialiser la séquence pour ce groupe
      await tx.sequencePiece.upsert({
        where: { dossierId_journalId_exercice: { dossierId, journalId, exercice } },
        update: { dernierNumero: 0 },
        create: { dossierId, journalId, exercice, dernierNumero: 0 },
      });

      let hashPrecedent: string | null = null;

      for (let i = 0; i < pieces.length; i++) {
        const p = pieces[i];
        const seq = i + 1;
        const numeroPiece = `${journalCode}/${exercice}/${String(seq).padStart(4, "0")}`;

        const hash = calculerHash(
          {
            dossierId,
            journalId,
            datePieceISO: p.datePiece.toISOString(),
            exercice,
            numeroPiece,
            lignes: p.lignes.map((l) => ({
              compteNumero: l.compteNumero,
              debit: l.debit.toString(),
              credit: l.credit.toString(),
              ordre: l.ordre,
            })),
          },
          hashPrecedent,
        );

        await tx.piece.update({
          where: { id: p.id },
          data: {
            numeroPiece,
            exercice,
            hash,
            hashPrecedent,
          },
        });

        // Mettre à jour le compteur séquence
        await tx.sequencePiece.update({
          where: { dossierId_journalId_exercice: { dossierId, journalId, exercice } },
          data: { dernierNumero: seq },
        });

        hashPrecedent = hash;
      }
    }

    // Pièces BROUILLON et ANNULEE : ref provisoire idempotente
    const autresPieces = await tx.piece.findMany({
      where: { dossierId, statut: { in: ["BROUILLON", "ANNULEE"] } },
      select: { id: true, statut: true, numeroPiece: true },
    });
    for (const p of autresPieces) {
      const refAttendue = `${p.statut}-${p.id}`;
      // Idempotent : ne ré-écrire que si différent
      if (p.numeroPiece !== refAttendue) {
        // Vérifier d'abord qu'il n'y a pas de conflit unique (dossierId, numeroPiece)
        const existant = await tx.piece.findFirst({
          where: { dossierId, numeroPiece: refAttendue, id: { not: p.id } },
        });
        if (!existant) {
          await tx.piece.update({
            where: { id: p.id },
            data: { numeroPiece: refAttendue },
          });
        }
      }
    }
  });

  // ─── Balance après ────────────────────────────────────────────────────────
  const apres = await getBalance(dossierId);

  const balanceIdentique =
    Math.abs(apres.totaux.debit - avant.totaux.debit) < 0.01 &&
    Math.abs(apres.totaux.credit - avant.totaux.credit) < 0.01;

  if (!balanceIdentique) {
    throw new Error(
      `Réconciliation échouée : la balance a changé après migration. ` +
        `Avant: D=${avant.totaux.debit} C=${avant.totaux.credit} ` +
        `Après: D=${apres.totaux.debit} C=${apres.totaux.credit}`,
    );
  }

  return { balanceIdentique };
}
