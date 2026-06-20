import { PrismaClient } from "@prisma/client";
import {
  REFERENTIEL_CODE, REFERENTIEL_LIBELLE, CLASSES, NATURES,
  COMPTES_LES_ASSOCIES,
} from "../src/lib/syscohada/referentiel";
import { detecterNature, deduireReport, extraireClasse, deduireAccountType, deduireReconciliable } from "../src/lib/syscohada/compte-logic";

const prisma = new PrismaClient();

async function main() {
  const ref = await prisma.referentiel.upsert({
    where: { code: REFERENTIEL_CODE },
    update: { libelle: REFERENTIEL_LIBELLE },
    create: { code: REFERENTIEL_CODE, libelle: REFERENTIEL_LIBELLE },
  });

  for (const c of CLASSES) {
    await prisma.classe.upsert({
      where: { referentielId_numero: { referentielId: ref.id, numero: c.numero } },
      update: { libelle: c.libelle },
      create: { numero: c.numero, libelle: c.libelle, referentielId: ref.id },
    });
  }

  for (const n of NATURES) {
    await prisma.nature.upsert({
      where: { referentielId_racine: { referentielId: ref.id, racine: n.racine } },
      update: { libelle: n.libelle, famille: n.famille, reportNplus1: n.reportNplus1 },
      create: { ...n, referentielId: ref.id },
    });
  }

  const dossier =
    (await prisma.dossier.findFirst({ where: { nom: "Les Associés SA" } })) ??
    (await prisma.dossier.create({
      data: {
        nom: "Les Associés SA", ville: "Lomé", pays: "Togo",
        devise: "XOF", exercice: 2020, referentielId: ref.id,
      },
    }));

  const JOURNAUX = [
    { code: "ACH", libelle: "Achats", type: "purchase" },
    { code: "VT", libelle: "Ventes", type: "sale" },
    { code: "CAI", libelle: "Caisse", type: "cash" },
    { code: "BIMA", libelle: "Banque", type: "bank" },
    { code: "OD", libelle: "Opérations diverses", type: "misc" },
    { code: "PE", libelle: "Paie", type: "misc" },
    { code: "RAN", libelle: "Report à nouveau", type: "misc" },
  ];
  for (const j of JOURNAUX) {
    await prisma.journal.upsert({
      where: { dossierId_code: { dossierId: dossier.id, code: j.code } },
      update: { libelle: j.libelle, type: j.type },
      create: { code: j.code, libelle: j.libelle, type: j.type, dossierId: dossier.id },
    });
  }

  const BUDGET_POSTES = [
    { code: "706100", libelle: "Recette transport", sens: "P", prevision: 60_000_000, compteLie: "706" },
    { code: "701100", libelle: "Recette vente", sens: "P", prevision: 18_000_000, compteLie: "701" },
    { code: "601100", libelle: "Achat marchandises", sens: "C", prevision: 9_500_000, compteLie: "601" },
    { code: "605300", libelle: "Achat carburant", sens: "C", prevision: 16_000_000, compteLie: "605" },
    { code: "660000", libelle: "Charge personnel", sens: "C", prevision: 21_867_000, compteLie: "661" },
    { code: "605600", libelle: "Achat lubrifiant", sens: "C", prevision: 4_760_000, compteLie: "605" },
    { code: "625200", libelle: "Assurance", sens: "C", prevision: 4_000_000, compteLie: "625" },
    { code: "624200", libelle: "Réparation", sens: "C", prevision: 2_430_000, compteLie: "624" },
    { code: "605200", libelle: "Électricité", sens: "C", prevision: 1_230_000, compteLie: "605" },
    { code: "638400", libelle: "Frais mission", sens: "C", prevision: 1_100_000, compteLie: "638" },
    { code: "605100", libelle: "Eau", sens: "C", prevision: 840_000, compteLie: "605" },
    { code: "671200", libelle: "Charge financière", sens: "C", prevision: 700_000, compteLie: "671" },
    { code: "621000", libelle: "Frais communication", sens: "C", prevision: 544_000, compteLie: "628" },
    { code: "607500", libelle: "Fourniture bureau", sens: "C", prevision: 290_000, compteLie: "605" },
    { code: "631000", libelle: "Frais bancaires", sens: "C", prevision: 78_000, compteLie: "631" },
  ];
  for (const bp of BUDGET_POSTES) {
    await prisma.budgetPoste.upsert({
      where: { dossierId_code: { dossierId: dossier.id, code: bp.code } },
      update: { libelle: bp.libelle, sens: bp.sens, prevision: bp.prevision, compteLie: bp.compteLie },
      create: { code: bp.code, libelle: bp.libelle, sens: bp.sens, prevision: bp.prevision, compteLie: bp.compteLie, dossierId: dossier.id },
    });
  }

  for (const c of COMPTES_LES_ASSOCIES) {
    const nature = detecterNature(c.numero, NATURES);
    const reportNplus1 = nature ? nature.reportNplus1 : deduireReport(extraireClasse(c.numero));
    const accountType = deduireAccountType(c.numero);
    await prisma.compte.upsert({
      where: { dossierId_numero: { dossierId: dossier.id, numero: c.numero } },
      update: { intitule: c.intitule, accountType, reconciliable: deduireReconciliable(accountType) },
      create: {
        numero: c.numero, intitule: c.intitule, type: c.type,
        classeNum: extraireClasse(c.numero),
        natureRacine: nature?.racine ?? null,
        reportNplus1,
        collectif: c.collectif ?? false,
        accountType,
        reconciliable: deduireReconciliable(accountType),
        dossierId: dossier.id,
      },
    });
  }

  // Tiers (auxiliaires) — requis sur les lignes des comptes collectifs 401/411.
  const TIERS = [
    { code: "C001", nom: "Client Alpha SARL", type: "CLIENT" },
    { code: "C002", nom: "Client Beta SA", type: "CLIENT" },
    { code: "F001", nom: "Fournisseur Gamma", type: "FOURNISSEUR" },
  ];
  for (const t of TIERS) {
    await prisma.tiers.upsert({
      where: { dossierId_code: { dossierId: dossier.id, code: t.code } },
      update: { nom: t.nom, type: t.type },
      create: { code: t.code, nom: t.nom, type: t.type, dossierId: dossier.id },
    });
  }

  // Taxes (TVA 18% Togo) — vente (collectée 443) et achat (déductible 445).
  const TAXES = [
    { code: "TVA18", nom: "TVA 18% (collectée)", taux: 18, usage: "sale", compteNumero: "443100" },
    { code: "TVA18A", nom: "TVA 18% (déductible)", taux: 18, usage: "purchase", compteNumero: "445200" },
  ];
  for (const t of TAXES) {
    await prisma.taxe.upsert({
      where: { dossierId_code: { dossierId: dossier.id, code: t.code } },
      update: { nom: t.nom, taux: t.taux, usage: t.usage, compteNumero: t.compteNumero },
      create: { ...t, dossierId: dossier.id },
    });
  }

  // Soldes N-1 (exercice 2019) pour les comptes de gestion — source du N-1 du
  // Compte de résultat. Signés débit − crédit : charges (6) > 0, produits (7) < 0.
  const SOLDES_N1 = [
    { compteNumero: "706100", montant: -48_000_000 }, // produit : recette transport
    { compteNumero: "601100", montant: 7_800_000 }, // charge : achats marchandises
    { compteNumero: "605300", montant: 13_200_000 }, // charge : carburant
    { compteNumero: "661100", montant: 18_500_000 }, // charge : salaires
  ];
  for (const s of SOLDES_N1) {
    await prisma.soldeAnterieur.upsert({
      where: { dossierId_compteNumero: { dossierId: dossier.id, compteNumero: s.compteNumero } },
      update: { montant: s.montant },
      create: { compteNumero: s.compteNumero, montant: s.montant, dossierId: dossier.id },
    });
  }

  console.log(`Seed OK — référentiel ${ref.code}, dossier ${dossier.nom}, ${COMPTES_LES_ASSOCIES.length} comptes, ${JOURNAUX.length} journaux, ${SOLDES_N1.length} soldes N-1.`);
}

main().finally(() => prisma.$disconnect());
