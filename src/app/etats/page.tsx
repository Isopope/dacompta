import { Shell } from "@/components/Shell";
import { getDossierIdCookie } from "@/lib/dossier-context";
import { getEtatsData } from "@/server/etats";
import EtatsClient from "./EtatsClient";

// États déduits d'une base vivante : rendu dynamique, jamais figé au build.
export const dynamic = "force-dynamic";

export default async function EtatsPage() {
  const dossierId = await getDossierIdCookie();
  // Si pas de dossier, le Shell affiche déjà l'écran « aucun dossier »
  if (!dossierId) {
    return (
      <Shell module="etats" breadcrumb={[{ label: "États" }, { label: "États & documents" }]}>
        <div />
      </Shell>
    );
  }

  const { balance, grandLivre, bilan, compteResultat, fluxTresorerie } =
    await getEtatsData(dossierId);

  return (
    <Shell module="etats" breadcrumb={[{ label: "États" }, { label: "États & documents" }]}>
      <EtatsClient
        balance={balance}
        grandLivre={grandLivre}
        bilan={bilan}
        compteResultat={compteResultat}
        fluxTresorerie={fluxTresorerie}
      />
    </Shell>
  );
}
