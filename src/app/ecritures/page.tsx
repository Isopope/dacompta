import { prisma } from "@/lib/db";
import { Shell } from "@/components/Shell";
import { getDossierIdCookie } from "@/lib/dossier-context";
import { listerComptes } from "@/server/comptes";
import { listerPiecesUI } from "./actions";
import EcrituresClient from "./EcrituresClient";

// Données issues d'une base vivante : rendu dynamique (pas de snapshot figé au build).
export const dynamic = "force-dynamic";

export default async function EcrituresPage() {
  // Dossier courant lu depuis le cookie (cohérent avec le DossierSwitcher),
  // et non plus le premier dossier de la base.
  const dossierId = await getDossierIdCookie();
  const dossier = dossierId
    ? await prisma.dossier.findUnique({ where: { id: dossierId } })
    : null;

  // Données chargées seulement si un dossier est sélectionné ; sinon le Shell
  // affiche l'écran « aucun dossier ».
  const journaux = dossier
    ? await prisma.journal.findMany({
        where: { dossierId: dossier.id },
        orderBy: { code: "asc" },
        select: { id: true, code: true, libelle: true },
      })
    : [];
  const pieces = dossier ? await listerPiecesUI(dossier.id, {}) : [];
  const comptes = dossier
    ? (await listerComptes(dossier.id, {})).map((c) => ({
        numero: c.numero,
        intitule: c.intitule,
      }))
    : [];

  return (
    <Shell breadcrumb={[{ label: "Écritures" }]}>
      {dossier && (
        <>
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
        </>
      )}
    </Shell>
  );
}
