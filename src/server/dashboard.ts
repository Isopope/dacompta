"use server";

import { prisma } from "@/lib/db";
import { getBalance } from "./balance";

// Le dashboard ne stocke rien : comme la Balance et le Budget, tous les chiffres
// sont déduits des écritures en temps réel. On ignore les pièces ANNULEE partout
// (elles ne participent ni aux soldes ni aux comptages).

const arrondi = (n: number) => Math.round(n * 100) / 100;

export interface KpisGlobaux {
  resultatNet: number; // produits (classe 7) − charges (classe 6)
  tresorerie: number; // somme des soldes débiteurs des comptes 5xxxxx
  chiffreAffaires: number; // total des crédits des comptes 70xxxx
  totalCharges: number; // total des débits des comptes 6xxxxx
  nbPieces: number; // pièces non annulées
  nbBrouillons: number; // pièces au statut BROUILLON
}

export interface CarteJournal {
  code: string;
  libelle: string;
  nbPieces: number; // pièces non annulées du journal (brouillons inclus)
  nbBrouillons: number; // dont brouillons en attente
  totalDebit: number; // volume débit des lignes (hors pièces annulées)
  totalCredit: number; // volume crédit des lignes
  solde: number; // débit − crédit des lignes (≈ 0 en partie double)
  derniereDate: string | null; // dernière date d'écriture (ISO) ou null si journal vide
}

export interface DashboardStats {
  kpis: KpisGlobaux;
  journaux: CarteJournal[];
}

/**
 * Statistiques du tableau de bord d'un dossier : KPIs globaux (résultat,
 * trésorerie, CA, charges, pièces) + une carte de synthèse par journal.
 */
export async function getDashboardStats(dossierId: string): Promise<DashboardStats> {
  const [balance, nbPieces, nbBrouillons, journaux] = await Promise.all([
    getBalance(dossierId),
    prisma.piece.count({ where: { dossierId, statut: { not: "ANNULEE" } } }),
    prisma.piece.count({ where: { dossierId, statut: "BROUILLON" } }),
    prisma.journal.findMany({
      where: { dossierId },
      orderBy: { code: "asc" },
      include: {
        // Pièces non annulées uniquement, avec leurs lignes pour le volume et le solde.
        pieces: {
          where: { statut: { not: "ANNULEE" } },
          include: { lignes: { select: { debit: true, credit: true } } },
        },
      },
    }),
  ]);

  // KPIs déduits de la balance (la balance exclut déjà les pièces annulées).
  const cl = (n: number) => balance.lignes.filter((l) => l.classeNum === n);
  const somme = (arr: number[]) => arr.reduce((s, x) => s + x, 0);

  const totalCharges = somme(cl(6).map((l) => l.debit));
  const produits7 = somme(cl(7).map((l) => l.soldeCrediteur - l.soldeDebiteur));
  const charges6 = somme(cl(6).map((l) => l.soldeDebiteur - l.soldeCrediteur));
  const resultatNet = produits7 - charges6;
  const tresorerie = somme(cl(5).map((l) => l.soldeDebiteur));
  const chiffreAffaires = somme(
    balance.lignes.filter((l) => l.compteNumero.startsWith("70")).map((l) => l.credit)
  );

  const kpis: KpisGlobaux = {
    resultatNet: arrondi(resultatNet),
    tresorerie: arrondi(tresorerie),
    chiffreAffaires: arrondi(chiffreAffaires),
    totalCharges: arrondi(totalCharges),
    nbPieces,
    nbBrouillons,
  };

  const cartes: CarteJournal[] = journaux.map((j) => {
    let totalDebit = 0;
    let totalCredit = 0;
    let derniere: Date | null = null;
    let nbBrouillonsJournal = 0;

    for (const p of j.pieces) {
      if (p.statut === "BROUILLON") nbBrouillonsJournal += 1;
      if (derniere === null || p.datePiece.getTime() > derniere.getTime()) {
        derniere = p.datePiece;
      }
      for (const l of p.lignes) {
        totalDebit += Number(l.debit);
        totalCredit += Number(l.credit);
      }
    }

    return {
      code: j.code,
      libelle: j.libelle,
      nbPieces: j.pieces.length,
      nbBrouillons: nbBrouillonsJournal,
      totalDebit: arrondi(totalDebit),
      totalCredit: arrondi(totalCredit),
      solde: arrondi(totalDebit - totalCredit),
      derniereDate: derniere ? derniere.toISOString() : null,
    };
  });

  return { kpis, journaux: cartes };
}
