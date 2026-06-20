"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { verifierEquilibre, verifierPieceNonVide, verifierSignesLigne, calculerHash, ErreurIntegrite, verifierDateNonVerrouillee } from "@/lib/comptabilite/integrite";
import { arrondiDevise, estNulDevise } from "@/lib/comptabilite/devise";

export interface LignePieceInput {
  compteNumero: string;
  libelleLigne: string;
  debit: number;
  credit: number;
  sectionAnalytique?: string;
  tiersId?: string;
  taxeId?: string;
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

  // Devise + verrous de période du dossier.
  const dossier = await prisma.dossier.findUniqueOrThrow({
    where: { id: input.dossierId },
    select: { devise: true, fiscalyearLockDate: true, hardLockDate: true },
  });
  const datePiece = input.datePiece ?? new Date();

  // Invariants métier (lèvent ErreurIntegrite sinon).
  verifierDateNonVerrouillee(datePiece, dossier);
  verifierPieceNonVide(lignes);
  for (const l of lignes) verifierSignesLigne(l);
  verifierEquilibre(lignes, dossier.devise);

  // Résolution stricte des comptes → compteId (FK).
  const comptes = await prisma.compte.findMany({
    where: { dossierId: input.dossierId, numero: { in: lignes.map((l) => l.compteNumero) } },
    select: { id: true, numero: true, collectif: true },
  });
  const parNumero = new Map(comptes.map((c) => [c.numero, c]));
  for (const l of lignes) {
    const compte = parNumero.get(l.compteNumero);
    if (!compte) {
      throw new Error(`Compte inexistant dans ce dossier : ${l.compteNumero}.`);
    }
    // Compte collectif (401/411…) ⇒ tiers obligatoire (grand-livre auxiliaire).
    if (compte.collectif && !l.tiersId) {
      throw new ErreurIntegrite(`Le compte collectif ${l.compteNumero} exige un tiers sur la ligne.`);
    }
  }

  // Validation des tiers référencés : doivent appartenir au dossier.
  const tiersIds = [...new Set(lignes.map((l) => l.tiersId).filter((t): t is string => !!t))];
  if (tiersIds.length) {
    const trouves = await prisma.tiers.findMany({
      where: { dossierId: input.dossierId, id: { in: tiersIds } }, select: { id: true },
    });
    if (trouves.length !== tiersIds.length) {
      throw new Error("Tiers inexistant dans ce dossier.");
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
      datePiece,
      fournisseur: input.fournisseur ?? null,
      montantHT,
      montantTVA,
      montantTTC,
      journalId: input.journalId,
      dossierId: input.dossierId,
      lignes: {
        create: lignes.map((l, i) => ({
          compteId: parNumero.get(l.compteNumero)!.id,
          compteNumero: l.compteNumero,
          libelleLigne: l.libelleLigne,
          debit: D(l.debit),
          credit: D(l.credit),
          balance: D(l.debit).minus(l.credit),
          ordre: i,
          sectionAnalytique: l.sectionAnalytique ?? null,
          tiersId: l.tiersId ?? null,
          taxeId: l.taxeId ?? null,
          // Résiduel de lettrage initialisé au montant de la ligne (|débit − crédit|),
          // arrondi à la précision de la devise, non lettrée par défaut. Le lettrage
          // le fera décroître vers 0.
          amountResidual: arrondiDevise(D(l.debit).minus(l.credit).abs(), dossier.devise),
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

// Noyau de validation réutilisable à l'intérieur d'une transaction Prisma existante.
// Prisma ne supporte pas les transactions interactives imbriquées ; on extrait donc
// la logique dans ce helper pour permettre à extournerPiece de créer le brouillon
// ET de le valider dans une seule transaction atomique.
async function validerPieceTx(tx: Prisma.TransactionClient, id: string) {
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

  verifierDateNonVerrouillee(piece.datePiece, piece.dossier);
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

  // Hash chaîné : prédécesseur immédiat dans la séquence du même (journal, exercice).
  // La chaîne est ordonnée par numéro de séquence (numeroPiece asc) — la vérification
  // (audit-chaine) utilise le même ordre ; construction et vérification doivent coïncider.
  const precedente = await tx.piece.findFirst({
    where: {
      dossierId: piece.dossierId,
      journalId: piece.journalId,
      exercice,
      statut: "VALIDEE",
    },
    orderBy: { numeroPiece: "desc" },
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

  const validee = await tx.piece.update({
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
  await tx.auditLog.create({
    data: { dossierId: piece.dossierId, type: "VALIDATION", pieceId: id, message: `Pièce ${numeroPiece} validée` },
  });
  return validee;
}

export async function validerPiece(id: string) {
  return prisma.$transaction((tx) => validerPieceTx(tx, id));
}

export async function extournerPiece(id: string, dateExtourne?: Date) {
  // Pré-vérifications (lecture seule, hors transaction) :
  // refus si la pièce n'est pas VALIDEE ou si elle est déjà extournée.
  const origine = await prisma.piece.findUniqueOrThrow({
    where: { id },
    include: { lignes: { orderBy: { ordre: "asc" } }, dossier: { select: { devise: true } } },
  });

  if (origine.statut !== "VALIDEE") {
    throw new ErreurIntegrite("Seule une pièce validée peut être extournée.");
  }
  const devise = origine.dossier.devise;

  const dejaExtournee = await prisma.piece.findFirst({
    where: { extourneDeId: id },
    select: { id: true },
  });
  if (dejaExtournee) {
    throw new ErreurIntegrite("Pièce déjà extournée.");
  }

  // Création du brouillon inverse ET sa validation dans une seule transaction atomique.
  // Si la validation échoue, le brouillon n'est pas persisté — aucun EXT- BROUILLON
  // orphelin ne peut bloquer une future extourne.
  return prisma.$transaction(async (tx) => {
    // Brouillon inverse (debit ↔ credit), même journal, daté du jour par défaut.
    const brouillon = await tx.piece.create({
      data: {
        numeroPiece: `EXT-${origine.id.slice(0, 8)}`,
        datePiece: dateExtourne ?? new Date(),
        journalId: origine.journalId,
        dossierId: origine.dossierId,
        extourneDeId: origine.id,
        montantHT: origine.montantHT.negated(),
        montantTVA: origine.montantTVA.negated(),
        montantTTC: origine.montantTTC.negated(),
        lignes: {
          create: origine.lignes.map((l) => ({
            compteId: l.compteId,
            compteNumero: l.compteNumero,
            tiersId: l.tiersId,
            libelleLigne: `Extourne — ${l.libelleLigne}`,
            debit: l.credit,
            credit: l.debit,
            balance: l.credit.minus(l.debit),
            ordre: l.ordre,
            amountResidual: arrondiDevise(l.credit.minus(l.debit).abs(), devise),
            isLettres: false,
          })),
        },
      },
    });

    // Validation atomique : l'extourne reçoit son propre numéro de séquence + hash chaîné.
    const extournee = await validerPieceTx(tx, brouillon.id);
    await tx.auditLog.create({
      data: {
        dossierId: origine.dossierId, type: "EXTOURNE", pieceId: extournee.id,
        message: `Extourne de la pièce ${origine.numeroPiece} → ${extournee.numeroPiece}`,
      },
    });
    return extournee;
  });
}

export async function annulerPiece(id: string) {
  // Annuler une pièce lettrée doit d'abord défaire ses lettrages : sinon le
  // résiduel des lignes en face resterait diminué alors que la contrepartie
  // disparaît des soldes. (Odoo interdit de toucher une ligne rapprochée sans
  // casser d'abord le rapprochement ; ici on casse automatiquement.)
  return prisma.$transaction(async (tx) => {
    // Une pièce validée est immuable : seule l'extourne peut la corriger.
    const cible = await tx.piece.findUniqueOrThrow({
      where: { id },
      select: {
        statut: true, datePiece: true,
        dossier: { select: { devise: true, fiscalyearLockDate: true, hardLockDate: true } },
      },
    });
    if (cible.statut === "VALIDEE") {
      throw new ErreurIntegrite("Une pièce validée est immuable : utilisez l'extourne.");
    }
    verifierDateNonVerrouillee(cible.datePiece, cible.dossier);
    const devise = cible.dossier.devise;
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
        const nouveau = arrondiDevise(new Prisma.Decimal(ligne.amountResidual).plus(montant), devise);
        await tx.ligneEcriture.update({
          where: { id: ligneId },
          data: { amountResidual: nouveau, isLettres: estNulDevise(nouveau, devise) },
        });
      }
      await tx.lettrage.deleteMany({ where: { id: { in: lettrages.map((l) => l.id) } } });
    }

    const annulee = await tx.piece.update({ where: { id }, data: { statut: "ANNULEE" } });
    await tx.auditLog.create({
      data: { dossierId: annulee.dossierId, type: "ANNULATION", pieceId: id, message: `Pièce ${annulee.numeroPiece} annulée` },
    });
    return annulee;
  });
}
