import { prisma } from "@/lib/db";
import { Shell } from "@/components/Shell";
import { getDossierIdCookie } from "@/lib/dossier-context";
import { listerComptes } from "@/server/comptes";
import { CLASSES, NATURES } from "@/lib/syscohada/referentiel";
import PlanComptableClient from "./PlanComptableClient";

// Données issues d'une base vivante : rendu dynamique (pas de snapshot figé au build).
export const dynamic = "force-dynamic";

export default async function PlanComptablePage() {
  // Dossier courant lu depuis le cookie (cohérent avec le DossierSwitcher).
  const dossierId = await getDossierIdCookie();
  const dossier = dossierId
    ? await prisma.dossier.findUnique({ where: { id: dossierId } })
    : null;
  const comptes = dossier ? await listerComptes(dossier.id, {}) : [];

  return (
    <Shell breadcrumb={[{ label: "Plan comptable" }]}>
      {dossier && (
        <>
          <h1>Plan comptable — {dossier.nom}</h1>
          <p className="muted">
            {dossier.ville}, {dossier.pays} · {dossier.devise} · exercice {dossier.exercice} · SYSCOHADA révisé
          </p>
          <PlanComptableClient
            dossierId={dossier.id}
            comptesInitiaux={comptes}
            classes={CLASSES}
            natures={NATURES}
          />
        </>
      )}
    </Shell>
  );
}
