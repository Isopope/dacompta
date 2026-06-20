"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { computeTaxe, type TypeMontantTaxe } from "@/lib/comptabilite/taxe";
import { arrondiDevise } from "@/lib/comptabilite/devise";
import { creerPiece, type LignePieceInput } from "./pieces";

export type UsageTaxe = "sale" | "purchase";
export type Exigibilite = "sur_facture" | "sur_encaissement";

const D = (n: Prisma.Decimal.Value) => new Prisma.Decimal(n);

export interface CreerTaxeInput {
  dossierId: string;
  code: string;
  nom: string;
  taux: number;
  usage: UsageTaxe;
  compteNumero: string;
  typeAmount?: TypeMontantTaxe;
  priceInclude?: boolean;
  exigibilite?: Exigibilite;
}

export async function creerTaxe(input: CreerTaxeInput) {
  const code = input.code.trim();
  const existe = await prisma.taxe.findUnique({ where: { dossierId_code: { dossierId: input.dossierId, code } } });
  if (existe) throw new Error(`La taxe ${code} existe déjà dans ce dossier.`);
  return prisma.taxe.create({
    data: {
      dossierId: input.dossierId, code, nom: input.nom.trim() || "(sans nom)",
      taux: D(input.taux), usage: input.usage, compteNumero: input.compteNumero,
      typeAmount: input.typeAmount ?? "percent",
      priceInclude: input.priceInclude ?? false,
      exigibilite: input.exigibilite ?? "sur_facture",
    },
  });
}

export async function listerTaxes(dossierId: string, filtre: { usage?: UsageTaxe } = {}) {
  return prisma.taxe.findMany({
    where: { dossierId, active: true, ...(filtre.usage ? { usage: filtre.usage } : {}) },
    orderBy: { code: "asc" },
  });
}

export interface LigneFactureInput {
  compteNumero: string;
  libelleLigne: string;
  montantHT: number;
  taxeCode?: string;
}

export interface CreerFactureInput {
  dossierId: string;
  journalId: string;
  numeroPiece: string;
  datePiece?: Date;
  sens: "VENTE" | "ACHAT";
  tiersId: string;
  compteTiersNumero: string; // 411x (vente) / 401x (achat)
  lignes: LigneFactureInput[];
}

/**
 * Construit une facture équilibrée à partir de lignes HT taxées (équivalent de la
 * construction d'une facture Odoo) : lignes produit/charge HT + lignes de taxe
 * calculées + ligne de contrepartie (tiers) en TTC. Remplace l'heuristique 443/445.
 *
 * - VENTE : produits et TVA au crédit, créance client au débit (TTC).
 * - ACHAT : charges et TVA au débit, dette fournisseur au crédit (TTC).
 */
export async function creerFacture(input: CreerFactureInput) {
  const dossier = await prisma.dossier.findUniqueOrThrow({
    where: { id: input.dossierId }, select: { devise: true },
  });
  const devise = dossier.devise;
  const estVente = input.sens === "VENTE";

  // Taxes référencées par les lignes.
  const codes = [...new Set(input.lignes.map((l) => l.taxeCode).filter((c): c is string => !!c))];
  const taxes = await prisma.taxe.findMany({ where: { dossierId: input.dossierId, code: { in: codes } } });
  const taxeParCode = new Map(taxes.map((t) => [t.code, t]));

  const lignesPiece: LignePieceInput[] = [];
  let totalTTC = D(0);
  // Cumul des taxes par (compteTVA, taxeId) pour regrouper les lignes de taxe.
  const cumulTaxe = new Map<string, { compteNumero: string; taxeId: string; montant: Prisma.Decimal }>();

  for (const l of input.lignes) {
    const baseHT = arrondiDevise(D(l.montantHT), devise);
    // Ligne de base : produit (crédit en vente) ou charge (débit en achat).
    lignesPiece.push({
      compteNumero: l.compteNumero,
      libelleLigne: l.libelleLigne,
      debit: estVente ? 0 : baseHT.toNumber(),
      credit: estVente ? baseHT.toNumber() : 0,
    });
    totalTTC = totalTTC.plus(baseHT);

    if (l.taxeCode) {
      const taxe = taxeParCode.get(l.taxeCode);
      if (!taxe) throw new Error(`Taxe inconnue : ${l.taxeCode}.`);
      const r = computeTaxe(l.montantHT, taxe.taux, {
        priceInclude: taxe.priceInclude, typeAmount: taxe.typeAmount as TypeMontantTaxe, devise,
      });
      const cle = `${taxe.compteNumero}|${taxe.id}`;
      const acc = cumulTaxe.get(cle) ?? { compteNumero: taxe.compteNumero, taxeId: taxe.id, montant: D(0) };
      acc.montant = acc.montant.plus(r.montantTaxe);
      cumulTaxe.set(cle, acc);
      totalTTC = totalTTC.plus(r.montantTaxe);
    }
  }

  // Lignes de taxe (même sens que les bases : crédit en vente, débit en achat).
  for (const t of cumulTaxe.values()) {
    const montant = arrondiDevise(t.montant, devise).toNumber();
    lignesPiece.push({
      compteNumero: t.compteNumero,
      libelleLigne: estVente ? "TVA collectée" : "TVA déductible",
      debit: estVente ? 0 : montant,
      credit: estVente ? montant : 0,
      taxeId: t.taxeId,
    });
  }

  // Contrepartie tiers en TTC (créance au débit en vente, dette au crédit en achat).
  const ttc = arrondiDevise(totalTTC, devise).toNumber();
  lignesPiece.push({
    compteNumero: input.compteTiersNumero,
    libelleLigne: estVente ? "Créance client" : "Dette fournisseur",
    debit: estVente ? ttc : 0,
    credit: estVente ? 0 : ttc,
    tiersId: input.tiersId,
  });

  return creerPiece({
    dossierId: input.dossierId,
    journalId: input.journalId,
    numeroPiece: input.numeroPiece,
    datePiece: input.datePiece,
    lignes: lignesPiece,
  });
}

export interface DeclarationTVA {
  collectee: number; // TVA des taxes de vente
  deductible: number; // TVA des taxes d'achat
  netteDue: number; // collectée − déductible
}

/**
 * Déclaration de TVA : agrège les lignes de taxe (taxeId non nul) par usage de la
 * taxe — équivalent des grilles de déclaration (tax tags) d'Odoo.
 */
export async function getDeclarationTVA(dossierId: string): Promise<DeclarationTVA> {
  const lignes = await prisma.ligneEcriture.findMany({
    where: { taxeId: { not: null }, piece: { dossierId, statut: { not: "ANNULEE" } } },
    include: { taxe: { select: { usage: true } } },
  });
  let collectee = D(0), deductible = D(0);
  for (const l of lignes) {
    const montant = D(l.credit).plus(l.debit); // la TVA est d'un seul côté
    if (l.taxe?.usage === "sale") collectee = collectee.plus(montant);
    else if (l.taxe?.usage === "purchase") deductible = deductible.plus(montant);
  }
  return {
    collectee: collectee.toNumber(),
    deductible: deductible.toNumber(),
    netteDue: collectee.minus(deductible).toNumber(),
  };
}
