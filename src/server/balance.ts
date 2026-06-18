"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

// Le Grand Livre et la Balance ne sont jamais « fabriqués » : ils sont déduits
// des écritures (LigneEcriture) en temps réel. « Rien à fabriquer — tout vient
// des écritures. »  On ignore les pièces ANNULEE (elles ne participent pas aux soldes).

const D = (n: Prisma.Decimal.Value) => new Prisma.Decimal(n);
const classeDe = (numero: string) => Number(numero[0]) || 0;

export interface GrandLivreLigne {
  date: string; // ISO
  numeroPiece: string;
  journalCode: string;
  libelle: string;
  debit: number;
  credit: number;
  soldeApres: number; // solde cumulé du compte après cette ligne (débit − crédit)
}

export interface GrandLivreCompte {
  compteNumero: string;
  intitule: string;
  classeNum: number;
  totalDebit: number;
  totalCredit: number;
  solde: number; // solde final (débit − crédit ; positif = débiteur)
  lignes: GrandLivreLigne[];
}

export interface BalanceLigne {
  compteNumero: string;
  intitule: string;
  classeNum: number;
  typeCompte: string; // DETAIL | TOTAL
  ouverture: number; // 0 pour un exercice neuf
  debit: number; // total des mouvements débit
  credit: number; // total des mouvements crédit
  soldeDebiteur: number;
  soldeCrediteur: number;
}

export interface BalanceTotaux {
  debit: number;
  credit: number;
  soldeDebiteur: number;
  soldeCrediteur: number;
}

export interface BalanceResultat {
  lignes: BalanceLigne[];
  totaux: BalanceTotaux;
}

interface MetaCompte {
  intitule: string;
  classeNum: number;
  type: string;
}

// Récupère la métadonnée (intitulé, classe, type) de chaque compte du dossier.
async function chargerComptes(dossierId: string): Promise<Map<string, MetaCompte>> {
  const comptes = await prisma.compte.findMany({
    where: { dossierId },
    select: { numero: true, intitule: true, classeNum: true, type: true },
  });
  return new Map(
    comptes.map((c) => [c.numero, { intitule: c.intitule, classeNum: c.classeNum, type: c.type }])
  );
}

function metaPour(meta: Map<string, MetaCompte>, numero: string): MetaCompte {
  return (
    meta.get(numero) ?? {
      intitule: "(compte non référencé)",
      classeNum: classeDe(numero),
      type: "DETAIL",
    }
  );
}

type LigneAvecPiece = Prisma.LigneEcritureGetPayload<{
  include: { piece: { include: { journal: true } } };
}>;

// Charge toutes les lignes non annulées du dossier, triées (date, n° pièce, ordre).
async function chargerLignes(dossierId: string, compteNumero?: string): Promise<LigneAvecPiece[]> {
  const lignes = await prisma.ligneEcriture.findMany({
    where: {
      piece: { dossierId, statut: { not: "ANNULEE" } },
      ...(compteNumero ? { compteNumero: { startsWith: compteNumero } } : {}),
    },
    include: { piece: { include: { journal: true } } },
  });
  return lignes.sort((a, b) => {
    const da = a.piece.datePiece.getTime();
    const db = b.piece.datePiece.getTime();
    if (da !== db) return da - db;
    if (a.piece.numeroPiece !== b.piece.numeroPiece)
      return a.piece.numeroPiece.localeCompare(b.piece.numeroPiece);
    return a.ordre - b.ordre;
  });
}

/**
 * Grand Livre : tous les mouvements regroupés par compte, avec solde cumulé.
 * `compteNumero` filtre par préfixe (ex. "4" → toute la classe 4).
 */
export async function getGrandLivre(
  dossierId: string,
  options: { compteNumero?: string } = {}
): Promise<GrandLivreCompte[]> {
  const [meta, lignes] = await Promise.all([
    chargerComptes(dossierId),
    chargerLignes(dossierId, options.compteNumero),
  ]);

  const parCompte = new Map<string, GrandLivreCompte>();
  const cumul = new Map<string, Prisma.Decimal>();

  for (const l of lignes) {
    let compte = parCompte.get(l.compteNumero);
    if (!compte) {
      const m = metaPour(meta, l.compteNumero);
      compte = {
        compteNumero: l.compteNumero,
        intitule: m.intitule,
        classeNum: m.classeNum,
        totalDebit: 0,
        totalCredit: 0,
        solde: 0,
        lignes: [],
      };
      parCompte.set(l.compteNumero, compte);
      cumul.set(l.compteNumero, D(0));
    }

    const solde = cumul.get(l.compteNumero)!.plus(l.debit).minus(l.credit);
    cumul.set(l.compteNumero, solde);

    const debit = Number(l.debit);
    const credit = Number(l.credit);
    compte.totalDebit += debit;
    compte.totalCredit += credit;
    compte.solde = solde.toNumber();
    compte.lignes.push({
      date: l.piece.datePiece.toISOString(),
      numeroPiece: l.piece.numeroPiece,
      journalCode: l.piece.journal.code,
      libelle: l.libelleLigne,
      debit,
      credit,
      soldeApres: solde.toNumber(),
    });
  }

  return [...parCompte.values()].sort((a, b) => a.compteNumero.localeCompare(b.compteNumero));
}

/**
 * Balance générale (6 colonnes) : pour chaque compte mouvementé,
 * ouverture (0), mouvements débit/crédit, solde débiteur/créditeur,
 * plus les totaux généraux. Triée par classe puis numéro.
 */
export async function getBalance(dossierId: string): Promise<BalanceResultat> {
  const [meta, lignes] = await Promise.all([chargerComptes(dossierId), chargerLignes(dossierId)]);

  const acc = new Map<string, { debit: Prisma.Decimal; credit: Prisma.Decimal }>();
  for (const l of lignes) {
    const a = acc.get(l.compteNumero) ?? { debit: D(0), credit: D(0) };
    a.debit = a.debit.plus(l.debit);
    a.credit = a.credit.plus(l.credit);
    acc.set(l.compteNumero, a);
  }

  const lignesBalance: BalanceLigne[] = [...acc.entries()].map(([numero, a]) => {
    const m = metaPour(meta, numero);
    const solde = a.debit.minus(a.credit);
    const debiteur = solde.isPositive() ? solde : D(0);
    const crediteur = solde.isNegative() ? solde.negated() : D(0);
    return {
      compteNumero: numero,
      intitule: m.intitule,
      classeNum: m.classeNum,
      typeCompte: m.type,
      ouverture: 0,
      debit: a.debit.toNumber(),
      credit: a.credit.toNumber(),
      soldeDebiteur: debiteur.toNumber(),
      soldeCrediteur: crediteur.toNumber(),
    };
  });

  lignesBalance.sort((x, y) =>
    x.classeNum !== y.classeNum
      ? x.classeNum - y.classeNum
      : x.compteNumero.localeCompare(y.compteNumero)
  );

  const totaux = lignesBalance.reduce<BalanceTotaux>(
    (t, l) => ({
      debit: t.debit + l.debit,
      credit: t.credit + l.credit,
      soldeDebiteur: t.soldeDebiteur + l.soldeDebiteur,
      soldeCrediteur: t.soldeCrediteur + l.soldeCrediteur,
    }),
    { debit: 0, credit: 0, soldeDebiteur: 0, soldeCrediteur: 0 }
  );

  return { lignes: lignesBalance, totaux };
}
