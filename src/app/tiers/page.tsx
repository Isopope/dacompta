// Page serveur Tiers — charge la liste des tiers et passe dossierId au composant client
import { Shell } from "@/components/Shell";
import { getDossierIdCookie } from "@/lib/dossier-context";
import { listerTiers } from "@/server/tiers";
import { TiersClient } from "./TiersClient";

/**
 * Page /tiers — Server Component.
 * Lit le dossierId depuis le cookie, récupère la liste des tiers via la server function,
 * puis délègue le rendu interactif (formulaire + tableau) au composant client TiersClient.
 */
export default async function Page() {
  const dossierId = await getDossierIdCookie();
  // Si aucun dossier sélectionné, la liste reste vide (Shell affichera l'écran d'invitation)
  const tiers = dossierId ? await listerTiers(dossierId) : [];
  return (
    <Shell module="tiers" breadcrumb={[{ label: "Tiers" }]}>
      <TiersClient tiers={tiers} dossierId={dossierId ?? ""} />
    </Shell>
  );
}
