// Page serveur — formulaire de création d'une nouvelle facture client.
// Charge tiers, taxes et comptes produits (classe 7) depuis la base.
import { Shell } from "@/components/Shell";
import { getDossierIdCookie } from "@/lib/dossier-context";
import { prisma } from "@/lib/db";
import { listerTiers } from "@/server/tiers";
import { listerTaxes } from "@/server/taxes";
import { NouvelleFactureClient } from "./NouvelleFactureClient";

export default async function Page() {
  // Lecture du dossier courant depuis le cookie
  const dossierId = await getDossierIdCookie();

  // Si aucun dossier n'est sélectionné, affichage d'une coquille vide
  if (!dossierId) {
    return (
      <Shell module="ventes" breadcrumb={[{ label: "Ventes" }]}>
        <div />
      </Shell>
    );
  }

  // Chargement parallèle : tiers clients, taxes de vente, comptes produits, journal de vente
  const [tiers, taxes, comptesProduits, journalVente] = await Promise.all([
    listerTiers(dossierId, { type: "CLIENT" }),
    listerTaxes(dossierId, { usage: "sale" }),
    prisma.compte.findMany({
      where: { dossierId, classeNum: 7, statut: "ACTIF" },
      select: { numero: true, intitule: true },
      orderBy: { numero: "asc" },
    }),
    prisma.journal.findFirst({
      where: { dossierId, type: "sale" },
      select: { id: true },
    }),
  ]);

  return (
    <Shell
      module="ventes"
      breadcrumb={[
        { label: "Ventes", href: "/ventes/factures" },
        { label: "Factures clients", href: "/ventes/factures" },
        { label: "Nouvelle" },
      ]}
    >
      <NouvelleFactureClient
        dossierId={dossierId}
        journalVenteId={journalVente?.id ?? null}
        tiers={tiers.map((t) => ({ id: t.id, nom: t.nom }))}
        taxes={taxes.map((t) => ({ code: t.code, nom: t.nom, taux: Number(t.taux) }))}
        comptes={comptesProduits}
        compteClient="411100"
      />
    </Shell>
  );
}
