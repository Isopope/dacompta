// Page serveur : formulaire d'encaissement d'une facture client.
// Reçoit l'identifiant de la facture via searchParams (?facture=<id>).
import { Shell } from "@/components/Shell";
import { getDossierIdCookie } from "@/lib/dossier-context";
import { prisma } from "@/lib/db";
import { getFacture } from "@/server/factures";
import { PaiementClient } from "./PaiementClient";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ facture?: string }>;
}) {
  const { facture } = await searchParams;
  const dossierId = await getDossierIdCookie();

  // Paramètres obligatoires : dossier et facture sélectionnée.
  if (!dossierId || !facture) {
    return (
      <Shell module="ventes" breadcrumb={[{ label: "Ventes" }]}>
        <div>Facture manquante.</div>
      </Shell>
    );
  }

  // Charge le document facture complet (lignes, tiers, montants).
  const f = await getFacture(dossierId, facture);

  // Ligne de tiers : premier compte 411x (client collectif).
  const ligneClient = f.lignes.find((l) => l.compteNumero.startsWith("411"));

  // Charge en parallèle les journaux de trésorerie et les comptes classe 5 actifs.
  const [journaux, comptesTresorerie] = await Promise.all([
    prisma.journal.findMany({
      where: { dossierId, type: { in: ["cash", "bank"] } },
      select: { id: true, libelle: true },
    }),
    prisma.compte.findMany({
      where: { dossierId, classeNum: 5, statut: "ACTIF" },
      select: { numero: true, intitule: true },
    }),
  ]);

  // Résiduel simplifié : montant TTC de la facture (le backend lettre au réel).
  const residuel = f.montantTTC;

  return (
    <Shell
      module="ventes"
      breadcrumb={[
        { label: "Ventes", href: "/ventes/factures" },
        { label: f.numeroPiece, href: `/ventes/factures/${f.id}` },
        { label: "Paiement" },
      ]}
    >
      <PaiementClient
        dossierId={dossierId}
        factureId={f.id}
        tiersId={f.tiersId ?? ""}
        compteClient={ligneClient?.compteNumero ?? "411100"}
        residuel={residuel}
        journaux={journaux}
        comptesTresorerie={comptesTresorerie}
      />
    </Shell>
  );
}
