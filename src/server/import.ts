"use server";

import * as XLSX from "xlsx";
import { prisma } from "@/lib/db";
import { NATURES, CLASSES } from "@/lib/syscohada/referentiel";
import { detecterRolesColonnes, construireLignesImport, type LigneImport } from "@/lib/syscohada/import-mapping";

export type ModeImport = "FUSIONNER" | "REMPLACER" | "AJOUTER";

/** Parse un contenu CSV ou un buffer Excel base64 en lignes de cellules. */
function parseFichier(contenu: string): string[][] {
  // CSV brut (séparateur ; ou ,) si pas du base64 binaire
  if (contenu.includes("\n") && (contenu.includes(";") || contenu.includes(","))) {
    return contenu.trim().split(/\r?\n/).map((l) => l.split(/[;,]/).map((c) => c.trim()));
  }
  // sinon : base64 d'un classeur Excel
  const wb = XLSX.read(contenu, { type: "base64" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, raw: false, defval: "" });
}

export async function previsualiserImport(dossierId: string, fichierNom: string, contenu: string) {
  let lignes = parseFichier(contenu);
  // retirer une éventuelle ligne d'en-tête (aucune cellule numérique de compte)
  const roles0 = detecterRolesColonnes(lignes);
  const idxNum = roles0.indexOf("NUMERO");
  if (idxNum >= 0 && lignes[0] && !/^\d{2,6}$/.test((lignes[0][idxNum] ?? "").toString().trim())) {
    lignes = lignes.slice(1);
  }
  const roles = detecterRolesColonnes(lignes);
  const existants = new Set(
    (await prisma.compte.findMany({ where: { dossierId }, select: { numero: true } })).map((c) => c.numero),
  );
  const out = construireLignesImport(lignes, roles, NATURES, CLASSES, existants);
  return { fichierNom, roles, lignes: out };
}

export async function appliquerImport(
  dossierId: string, fichierNom: string, lignes: LigneImport[], mode: ModeImport,
) {
  const avant = await prisma.compte.findMany({ where: { dossierId } });
  const affectes: string[] = [];

  await prisma.$transaction(async (tx) => {
    if (mode === "REMPLACER") {
      await tx.compte.updateMany({ where: { dossierId }, data: { statut: "ARCHIVE" } });
    }
    for (const l of lignes) {
      if (l.controle === "hors-syscohada") continue;            // jamais importé
      if (l.controle === "doublon" && mode === "AJOUTER") continue; // ignoré en mode ajout
      const compte = await tx.compte.upsert({
        where: { dossierId_numero: { dossierId, numero: l.numero } },
        update: { intitule: l.intitule, type: l.type, statut: "ACTIF" },
        create: {
          numero: l.numero, intitule: l.intitule, type: l.type,
          classeNum: Number(l.numero.charAt(0)),
          natureRacine: l.natureRacine, reportNplus1: l.reportNplus1, dossierId,
        },
      });
      affectes.push(compte.id);
    }
  });

  const log = await prisma.importLog.create({
    data: {
      dossierId, fichierNom, mode,
      snapshotAvant: JSON.stringify(avant),
      compteIds: JSON.stringify(affectes),
    },
  });
  return { importLogId: log.id, nbImportes: affectes.length };
}

/** Annule un import : restaure l'état des comptes capturé avant. */
export async function annulerImport(importLogId: string): Promise<boolean> {
  const log = await prisma.importLog.findUnique({ where: { id: importLogId } });
  if (!log || log.annule) return false;
  const avant = JSON.parse(log.snapshotAvant) as Array<{ id: string }>;
  const idsAvant = new Set(avant.map((c) => c.id));
  const affectes = JSON.parse(log.compteIds) as string[];

  await prisma.$transaction(async (tx) => {
    // supprimer les comptes créés par cet import (absents de l'état d'avant)
    const aSupprimer = affectes.filter((id) => !idsAvant.has(id));
    if (aSupprimer.length) await tx.compte.deleteMany({ where: { id: { in: aSupprimer } } });
    // restaurer l'intitulé/type/statut des comptes préexistants
    for (const c of avant as Array<{ id: string; intitule: string; type: string; statut: string }>) {
      await tx.compte.update({ where: { id: c.id }, data: { intitule: c.intitule, type: c.type, statut: c.statut } }).catch(() => {});
    }
    await tx.importLog.update({ where: { id: importLogId }, data: { annule: true } });
  });
  return true;
}
