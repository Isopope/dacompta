import { prisma } from "@/lib/db";
import { listerPostes } from "@/server/budget";
import BudgetClient from "./BudgetClient";

// Réalisé déduit d'une base vivante : rendu dynamique, jamais figé au build.
export const dynamic = "force-dynamic";

export default async function BudgetPage() {
  const dossier = await prisma.dossier.findFirstOrThrow();
  const postes = await listerPostes(dossier.id);
  return (
    <div className="container" style={{ maxWidth: 1280 }}>
      <h1>Budget — {dossier.nom}</h1>
      <p className="muted">
        {dossier.ville}, {dossier.pays} · {dossier.devise} · exercice {dossier.exercice} · Réalisé
        déduit des écritures, en temps réel.
      </p>
      <BudgetClient dossierId={dossier.id} postesInitiaux={postes} />
    </div>
  );
}
