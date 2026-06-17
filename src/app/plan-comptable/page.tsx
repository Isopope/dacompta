import { prisma } from "@/lib/db";
import { listerComptes } from "@/server/comptes";
import { CLASSES, NATURES } from "@/lib/syscohada/referentiel";
import PlanComptableClient from "./PlanComptableClient";

// Données issues d'une base vivante : rendu dynamique (pas de snapshot figé au build).
export const dynamic = "force-dynamic";

export default async function PlanComptablePage() {
  const dossier = await prisma.dossier.findFirstOrThrow();
  const comptes = await listerComptes(dossier.id, {});
  return (
    <div className="container">
      <h1>Plan comptable — {dossier.nom}</h1>
      <p className="muted">{dossier.ville}, {dossier.pays} · {dossier.devise} · exercice {dossier.exercice} · SYSCOHADA révisé</p>
      <PlanComptableClient
        dossierId={dossier.id}
        comptesInitiaux={comptes}
        classes={CLASSES}
        natures={NATURES}
      />
    </div>
  );
}
