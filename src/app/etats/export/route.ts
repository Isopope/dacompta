// src/app/etats/export/route.ts
import { getDossierIdCookie } from "@/lib/dossier-context";
import { getEtatsData } from "@/server/etats";
import { buildExport, isDocId, isExportFormat } from "@/lib/etats/export";

// États déduits d'une base vivante : jamais figés au build.
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const dossierId = await getDossierIdCookie();
  if (!dossierId) {
    return new Response("Aucun dossier sélectionné.", { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const doc = searchParams.get("doc");
  const format = searchParams.get("format");
  if (!isDocId(doc) || !isExportFormat(format)) {
    return new Response("Paramètres « doc » ou « format » invalides.", { status: 400 });
  }

  try {
    const data = await getEtatsData(dossierId);
    const { buffer, filename, contentType } = await buildExport(doc, format, data);
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[etats/export] échec de génération", err);
    return new Response("Erreur lors de la génération du document.", { status: 500 });
  }
}
