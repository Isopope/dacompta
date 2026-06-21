import { prisma } from "@/lib/db";
import { Shell } from "@/components/Shell";
import { getDossierIdCookie } from "@/lib/dossier-context";

import LettrageClient from "./LettrageClient";

export const dynamic = "force-dynamic";

export default async function LettragePage() {
  // Dossier courant lu depuis le cookie (cohérent avec le DossierSwitcher).
  const dossierId = await getDossierIdCookie();
  const dossier = dossierId
    ? await prisma.dossier.findUnique({ where: { id: dossierId } })
    : null;

  // Comptes et journaux pour les filtres ; chargés seulement si un dossier est actif.
  const comptes = dossier
    ? await prisma.compte.findMany({
        where: { dossierId: dossier.id },
        select: { numero: true, intitule: true },
      })
    : [];
  const journaux = dossier
    ? await prisma.journal.findMany({
        where: { dossierId: dossier.id },
        select: { id: true, code: true, libelle: true },
      })
    : [];

  return (
    <Shell breadcrumb={[{ label: "Lettrage" }]}>
      {dossier && (
        <>
          <h1>Lettrage — {dossier.nom}</h1>
          <p className="muted">
            {dossier.ville}, {dossier.pays} · {dossier.devise} · exercice {dossier.exercice} · lettrage des comptes de tiers
          </p>
          <LettrageClient
            dossierId={dossier.id}
            comptes={comptes}
            journaux={journaux}
          />
        </>
      )}
    </Shell>
  );
}
