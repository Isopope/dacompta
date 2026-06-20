// Page serveur : liste de tous les paiements du dossier.
// Filtre optionnel par tiers via searchParams (?tiers=<tiersId>).
import { Shell } from "@/components/Shell";
import { getDossierIdCookie } from "@/lib/dossier-context";
import { listerPaiements } from "@/server/factures";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tiers?: string }>;
}) {
  const { tiers } = await searchParams;
  const dossierId = await getDossierIdCookie();

  // Liste vide si aucun dossier sélectionné, sinon filtre optionnel par tiers.
  const paiements = dossierId
    ? await listerPaiements(dossierId, { tiersId: tiers || undefined })
    : [];

  return (
    <Shell
      module="ventes"
      breadcrumb={[{ label: "Ventes", href: "/ventes/factures" }, { label: "Paiements" }]}
    >
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: 8 }}>Pièce</th>
              <th style={{ textAlign: "left", padding: 8 }}>Date</th>
              <th style={{ textAlign: "left", padding: 8 }}>Tiers</th>
              <th style={{ textAlign: "right", padding: 8 }}>Montant</th>
            </tr>
          </thead>
          <tbody>
            {paiements.length === 0 ? (
              /* Ligne vide si aucun paiement enregistré */
              <tr>
                <td colSpan={4} className="muted" style={{ padding: 16 }}>
                  Aucun paiement.
                </td>
              </tr>
            ) : (
              paiements.map((p) => (
                <tr key={p.id}>
                  <td style={{ padding: 8 }}>{p.numeroPiece}</td>
                  <td style={{ padding: 8 }}>{p.date.slice(0, 10)}</td>
                  <td style={{ padding: 8 }}>{p.tiersNom ?? "—"}</td>
                  <td style={{ padding: 8, textAlign: "right" }} className="mono">
                    {p.montant.toLocaleString("fr-FR")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
