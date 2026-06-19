import { prisma } from "@/lib/db";
import { getDashboardStats } from "@/server/dashboard";
import DashboardClient from "./DashboardClient";

// Chiffres déduits d'une base vivante : rendu dynamique, jamais figé au build.
export const dynamic = "force-dynamic";

export default async function Home() {
  const dossier = await prisma.dossier.findFirstOrThrow();
  const stats = await getDashboardStats(dossier.id);
  return (
    <div className="container" style={{ maxWidth: 1280 }}>
      <h1 style={{ marginBottom: 4 }}>Tableau de bord — {dossier.nom}</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        {dossier.ville}, {dossier.pays} · {dossier.devise} · exercice {dossier.exercice} · Synthèse
        déduite des écritures, en temps réel.
      </p>
      <DashboardClient stats={stats} />
    </div>
  );
}
