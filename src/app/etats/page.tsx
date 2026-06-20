import { Shell } from "@/components/Shell";
import { getDossierIdCookie } from "@/lib/dossier-context";
import { getBalance, getGrandLivre } from "@/server/balance";
import { deriverBilan, deriverCompteResultat, deriverFluxTresorerie } from "@/lib/etats/etats-financiers";
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

  const [balance, grandLivre] = await Promise.all([
    getBalance(dossierId),
    getGrandLivre(dossierId),
  ]);
  const bilan = deriverBilan(balance);
  const compteResultat = deriverCompteResultat(balance);
  const fluxTresorerie = deriverFluxTresorerie(balance, grandLivre);

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
