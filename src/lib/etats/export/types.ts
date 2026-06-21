import type { EtatsData } from "@/server/etats";

export type DocId =
  | "balance-generale"
  | "grand-livre"
  | "bilan"
  | "compte-resultat"
  | "flux-tresorerie";

export const DOC_IDS: readonly DocId[] = [
  "balance-generale",
  "grand-livre",
  "bilan",
  "compte-resultat",
  "flux-tresorerie",
];

export type ExportFormat = "pdf" | "xlsx";
export const EXPORT_FORMATS: readonly ExportFormat[] = ["pdf", "xlsx"];

export type EtatsExportData = EtatsData;

export function isDocId(v: unknown): v is DocId {
  return typeof v === "string" && (DOC_IDS as readonly string[]).includes(v);
}

export function isExportFormat(v: unknown): v is ExportFormat {
  return typeof v === "string" && (EXPORT_FORMATS as readonly string[]).includes(v);
}
