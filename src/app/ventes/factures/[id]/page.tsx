// Page serveur du document facture — charge la facture côté serveur et délègue l'affichage au client.
import { notFound } from "next/navigation";
import { Shell } from "@/components/Shell";
import { getDossierIdCookie } from "@/lib/dossier-context";
import { getFacture } from "@/server/factures";
import { DocumentClient } from "./DocumentClient";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  // En Next.js 16 (App Router), params est une Promise ; on l'attend avant d'extraire l'id.
  const { id } = await params;

  // Lecture du dossier courant depuis le cookie ; si absent, on affiche un shell vide.
  const dossierId = await getDossierIdCookie();
  if (!dossierId) return <Shell module="ventes" breadcrumb={[{ label: "Ventes" }]}><div /></Shell>;

  // Chargement du document complet (en-tête + lignes + compteurs smart buttons).
  // notFound() sur id invalide → 404 propre plutôt qu'une erreur 500.
  let f;
  try { f = await getFacture(dossierId, id); }
  catch { notFound(); }

  return (
    <Shell
      module="ventes"
      breadcrumb={[
        { label: "Ventes", href: "/ventes/factures" },
        { label: "Factures clients", href: "/ventes/factures" },
        { label: f!.numeroPiece },
      ]}
    >
      <DocumentClient f={f!} />
    </Shell>
  );
}
