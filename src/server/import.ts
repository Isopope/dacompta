"use server";

import * as XLSX from "xlsx";
import { prisma } from "@/lib/db";
import { NATURES, CLASSES } from "@/lib/syscohada/referentiel";
import { detecterRolesColonnes, construireLignesImport, type LigneImport } from "@/lib/syscohada/import-mapping";

export type ModeImport = "FUSIONNER" | "REMPLACER" | "AJOUTER";

/** Parse un contenu CSV ou un buffer Excel base64 en lignes de cellules. */
function parseFichier(contenu: string): string[][] {
  if (contenu.includes("\n") && (contenu.includes(";") || contenu.includes(","))) {
    // Un seul séparateur (jamais les deux à la fois) : on prend celui de la 1re ligne.
    const premiere = contenu.trim().split(/\r?\n/)[0] ?? "";
    const sep = premiere.includes(";") ? ";" : ",";
    return contenu.trim().split(/\r?\n/).map((l) => l.split(sep).map((c) => c.trim()));
  }
  const wb = XLSX.read(contenu, { type: "base64" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, raw: false, defval: "" });
}

/** En-tête présent si la 1re ligne n'a aucun n° de compte alors qu'une ligne suivante en a. */
function aUnEntete(lignes: string[][]): boolean {
  if (lignes.length < 2) return false;
  const estNum = (row: string[]) => row.some((c) => /^\d{2,6}$/.test((c ?? "").toString().trim()));
  return !estNum(lignes[0]) && lignes.slice(1).some(estNum);
}

export async function previsualiserImport(dossierId: string, fichierNom: string, contenu: string) {
  let lignes = parseFichier(contenu);
  if (aUnEntete(lignes)) lignes = lignes.slice(1);
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

  return prisma.$transaction(async (tx) => {
    const affectes: string[] = []; // dans la transaction : réinitialisé si Prisma rejoue le callback
    if (mode === "REMPLACER") {
      await tx.compte.updateMany({ where: { dossierId }, data: { statut: "ARCHIVE" } });
    }
    for (const l of lignes) {
      if (l.controle === "hors-syscohada") continue;            // jamais importé
      if (l.controle === "doublon" && mode === "AJOUTER") continue; // ignoré en mode ajout
      const compte = await tx.compte.upsert({
        where: { dossierId_numero: { dossierId, numero: l.numero } },
        update: { intitule: l.intitule, type: l.type, statut: "ACTIF", reportNplus1: l.reportNplus1 },
        create: {
          numero: l.numero, intitule: l.intitule, type: l.type,
          classeNum: Number(l.numero.charAt(0)),
          natureRacine: l.natureRacine, reportNplus1: l.reportNplus1, dossierId,
        },
      });
      affectes.push(compte.id);
    }
    const log = await tx.importLog.create({
      data: {
        dossierId, fichierNom, mode,
        snapshotAvant: JSON.stringify(avant),
        compteIds: JSON.stringify(affectes),
      },
    });
    return { importLogId: log.id, nbImportes: affectes.length };
  });
}

/** Annule un import : restaure l'état des comptes capturé avant. */
export async function annulerImport(importLogId: string): Promise<boolean> {
  const log = await prisma.importLog.findUnique({ where: { id: importLogId } });
  if (!log || log.annule) return false;
  const avant = JSON.parse(log.snapshotAvant) as Array<{ id: string; intitule: string; type: string; statut: string }>;
  const idsAvant = new Set(avant.map((c) => c.id));
  const affectes = JSON.parse(log.compteIds) as string[];

  await prisma.$transaction(async (tx) => {
    // Supprimer les comptes créés par cet import (absents de l'état d'avant).
    const aSupprimer = affectes.filter((id) => !idsAvant.has(id));
    if (aSupprimer.length) await tx.compte.deleteMany({ where: { id: { in: aSupprimer } } });
    // Restaurer TOUS les comptes pré-existants — nécessaire pour défaire un REMPLACER
    // qui a archivé des comptes absents du fichier. Pas de catch silencieux : toute
    // erreur propage et fait rollback la transaction.
    for (const c of avant) {
      await tx.compte.update({ where: { id: c.id }, data: { intitule: c.intitule, type: c.type, statut: c.statut } });
    }
    await tx.importLog.update({ where: { id: importLogId }, data: { annule: true } });
  });
  return true;
}
