// Page liste des factures clients — Server Component async
import { Shell } from "@/components/Shell";
import { getDossierIdCookie } from "@/lib/dossier-context";
import { listerFactures } from "@/server/factures";
import { FacturesClient } from "./FacturesClient";

export default async function Page() {
  // Lecture du dossier courant depuis le cookie (null si aucun dossier sélectionné)
  const dossierId = await getDossierIdCookie();
  // Chargement des factures uniquement si un dossier est sélectionné
  const factures = dossierId ? await listerFactures(dossierId) : [];
  return (
    <Shell
      module="ventes"
      breadcrumb={[{ label: "Ventes" }, { label: "Factures clients" }]}
      action={<a className="btn primary" href="/ventes/factures/nouvelle">+ Nouvelle facture</a>}
    >
      <FacturesClient factures={factures} />
    </Shell>
  );
}
