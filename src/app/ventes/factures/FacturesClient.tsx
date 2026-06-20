// Composant client pour la liste des factures — DataTable + navigation vers le détail
"use client";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/DataTable";
import { Badge } from "@/components/Badge";
import { badgeEtatPaiement } from "@/lib/ui/facture-ui";
import type { FactureListItem } from "@/server/factures";

export function FacturesClient({ factures }: { factures: FactureListItem[] }) {
  const router = useRouter();
  return (
    <DataTable
      rechercheTexte
      lignes={factures}
      cleLigne={(f) => f.id}
      onLigneClick={(f) => router.push(`/ventes/factures/${f.id}`)}
      videLabel="Aucune facture. Créez-en une avec « + Nouvelle facture »."
      colonnes={[
        { cle: "num", titre: "Numéro", rendu: (f) => f.numeroPiece },
        { cle: "date", titre: "Date", rendu: (f) => f.datePiece.slice(0, 10) },
        { cle: "tiers", titre: "Client", rendu: (f) => f.tiersNom ?? "—" },
        { cle: "ttc", titre: "Total TTC", rendu: (f) => f.montantTTC.toLocaleString("fr-FR") },
        {
          cle: "etat",
          titre: "Paiement",
          // valeurRecherche fournie pour que la recherche texte couvre les états de paiement
          valeurRecherche: (f) => badgeEtatPaiement(f.etatPaiement).label,
          rendu: (f) => {
            const b = badgeEtatPaiement(f.etatPaiement);
            return <Badge label={b.label} variant={b.variant} />;
          },
        },
        { cle: "statut", titre: "Statut", rendu: (f) => f.statut },
      ]}
    />
  );
}
