import type { DocId, ExportFormat } from "./types";
import type { DossierMeta } from "@/server/etats";

/** Minuscule, sans accents, espaces/non-alphanumériques → tirets. */
export function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function contentTypeFor(format: ExportFormat): string {
  return format === "pdf"
    ? "application/pdf"
    : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
}

export function exportFilename(docId: DocId, format: ExportFormat, dossier: DossierMeta): string {
  return `${slug(dossier.nom)}_${docId}_${dossier.exercice}.${format}`;
}
