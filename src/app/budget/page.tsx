import { prisma } from "@/lib/db";
import { Shell } from "@/components/Shell";
import { getDossierIdCookie } from "@/lib/dossier-context";
import { listerPostes } from "@/server/budget";
import BudgetClient from "./BudgetClient";

// Réalisé déduit d'une base vivante : rendu dynamique, jamais figé au build.
export const dynamic = "force-dynamic";

export default async function BudgetPage() {
  // Dossier courant lu depuis le cookie (cohérent avec le DossierSwitcher).
  const dossierId = await getDossierIdCookie();
  const dossier = dossierId
    ? await prisma.dossier.findUnique({ where: { id: dossierId } })
    : null;
  const postes = dossier ? await listerPostes(dossier.id) : [];

  return (
    <Shell breadcrumb={[{ label: "Budget" }]}>
      {dossier && (
        <>
          <h1>Budget — {dossier.nom}</h1>
          <p className="muted">
            {dossier.ville}, {dossier.pays} · {dossier.devise} · exercice {dossier.exercice} · Réalisé
            déduit des écritures, en temps réel.
          </p>
          <BudgetClient dossierId={dossier.id} postesInitiaux={postes} />
        </>
      )}
    </Shell>
  );
}
