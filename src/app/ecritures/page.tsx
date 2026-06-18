import { prisma } from "@/lib/db";
import { listerComptes } from "@/server/comptes";
import { listerPiecesUI } from "./actions";
import EcrituresClient from "./EcrituresClient";

// Données issues d'une base vivante : rendu dynamique (pas de snapshot figé au build).
export const dynamic = "force-dynamic";

export default async function EcrituresPage() {
  const dossier = await prisma.dossier.findFirstOrThrow();
  const journaux = await prisma.journal.findMany({
    where: { dossierId: dossier.id },
    orderBy: { code: "asc" },
    select: { id: true, code: true, libelle: true },
  });
  const pieces = await listerPiecesUI(dossier.id, {});
  const comptes = (await listerComptes(dossier.id, {})).map((c) => ({
    numero: c.numero,
    intitule: c.intitule,
  }));

  return (
    <div className="container">
      <h1>Écritures — {dossier.nom}</h1>
      <p className="muted">
        {dossier.ville}, {dossier.pays} · {dossier.devise} · exercice {dossier.exercice} · saisie des pièces comptables
      </p>
      <EcrituresClient
        dossierId={dossier.id}
        journaux={journaux}
        piecesInitiales={pieces}
        comptes={comptes}
      />
    </div>
  );
}
