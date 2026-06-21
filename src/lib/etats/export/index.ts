// src/lib/etats/export/index.ts
import type { EtatsData } from "@/server/etats";
import { buildExcel } from "./excel";
import { buildPdf } from "./pdf";
import { contentTypeFor, exportFilename } from "./naming";
import type { DocId, ExportFormat } from "./types";

export * from "./types";

export interface ExportResult {
  buffer: Buffer;
  filename: string;
  contentType: string;
}

export async function buildExport(
  docId: DocId,
  format: ExportFormat,
  data: EtatsData
): Promise<ExportResult> {
  const buffer = format === "pdf" ? await buildPdf(docId, data) : buildExcel(docId, data);
  return {
    buffer,
    filename: exportFilename(docId, format, data.dossier),
    contentType: contentTypeFor(format),
  };
}
