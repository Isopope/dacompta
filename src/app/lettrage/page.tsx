import { prisma } from "@/lib/db";

import LettrageClient from "./LettrageClient";

export const dynamic = "force-dynamic";

export default async function LettragePage() {
  const dossier = await prisma.dossier.findFirstOrThrow();
  // Optionally fetch comptes and journaux for filters
  const comptes = await prisma.compte.findMany({
    where: { dossierId: dossier.id },
    select: { numero: true, intitule: true },
  });
  const journaux = await prisma.journal.findMany({
    where: { dossierId: dossier.id },
    select: { id: true, code: true, libelle: true },
  });

  return (
    <div className="container">
      <h1>Lettrage — {dossier.nom}</h1>
      <p className="muted">
        {dossier.ville}, {dossier.pays} · {dossier.devise} · exercice {dossier.exercice} · lettrage des comptes de tiers
      </p>
      <LettrageClient
        dossierId={dossier.id}
        comptes={comptes}
        journaux={journaux}
      />
    </div>
  );
}