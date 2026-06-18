import { prisma } from "@/lib/db";
import { getBalance, getGrandLivre } from "@/server/balance";
import { deriverBilan, deriverCompteResultat } from "@/lib/etats/etats-financiers";
import EtatsClient from "./EtatsClient";

// États déduits d'une base vivante : rendu dynamique, jamais figé au build.
export const dynamic = "force-dynamic";

export default async function EtatsPage() {
  const dossier = await prisma.dossier.findFirstOrThrow();
  const [balance, grandLivre] = await Promise.all([
    getBalance(dossier.id),
    getGrandLivre(dossier.id),
  ]);
  const bilan = deriverBilan(balance);
  const compteResultat = deriverCompteResultat(balance);

  return (
    <div className="container" style={{ maxWidth: 1280 }}>
      <h1>États & documents — {dossier.nom}</h1>
      <p className="muted">
        {dossier.ville}, {dossier.pays} · {dossier.devise} · exercice {dossier.exercice} · Rien à
        fabriquer — tout vient des écritures.
      </p>
      <EtatsClient
        balance={balance}
        grandLivre={grandLivre}
        bilan={bilan}
        compteResultat={compteResultat}
      />
    </div>
  );
}
