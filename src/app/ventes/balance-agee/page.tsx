// src/app/ventes/balance-agee/page.tsx
// Page serveur : balance âgée clients — ventile les créances ouvertes par
// tranche d'ancienneté (0-30 j, 31-60 j, 61-90 j, +90 j) pour chaque tiers.
import { Shell } from "@/components/Shell";
import { getDossierIdCookie } from "@/lib/dossier-context";
import { getBalanceAgee } from "@/server/auxiliaire";

export default async function Page() {
  // Récupère l'identifiant du dossier depuis le cookie de session
  const dossierId = await getDossierIdCookie();
  // Charge les lignes de balance âgée ; tableau vide si aucun dossier actif
  const lignes = dossierId ? await getBalanceAgee(dossierId) : [];

  return (
    <Shell
      module="ventes"
      breadcrumb={[
        { label: "Ventes", href: "/ventes/factures" },
        { label: "Balance âgée" },
      ]}
    >
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {/* Colonne identification du tiers */}
              <th style={{ textAlign: "left", padding: 8 }}>Tiers</th>
              {/* Colonnes par tranche d'ancienneté */}
              <th style={{ textAlign: "right", padding: 8 }}>0–30 j</th>
              <th style={{ textAlign: "right", padding: 8 }}>31–60 j</th>
              <th style={{ textAlign: "right", padding: 8 }}>61–90 j</th>
              <th style={{ textAlign: "right", padding: 8 }}>+90 j</th>
              {/* Colonne total */}
              <th style={{ textAlign: "right", padding: 8 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {lignes.length === 0 ? (
              /* Message affiché quand il n'y a aucun encours */
              <tr>
                <td colSpan={6} className="muted" style={{ padding: 16 }}>
                  Aucun encours.
                </td>
              </tr>
            ) : (
              lignes.map((l) => (
                <tr key={l.tiersId}>
                  {/* Code et nom du tiers */}
                  <td style={{ padding: 8 }}>
                    {l.tiersCode} — {l.tiersNom}
                  </td>
                  {/* Montants par tranche, formatés en locale française */}
                  <td style={{ padding: 8, textAlign: "right" }} className="mono">
                    {l.b0_30.toLocaleString("fr-FR")}
                  </td>
                  <td style={{ padding: 8, textAlign: "right" }} className="mono">
                    {l.b31_60.toLocaleString("fr-FR")}
                  </td>
                  <td style={{ padding: 8, textAlign: "right" }} className="mono">
                    {l.b61_90.toLocaleString("fr-FR")}
                  </td>
                  <td style={{ padding: 8, textAlign: "right" }} className="mono">
                    {l.b90plus.toLocaleString("fr-FR")}
                  </td>
                  {/* Total en gras */}
                  <td style={{ padding: 8, textAlign: "right" }} className="mono">
                    <strong>{l.total.toLocaleString("fr-FR")}</strong>
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
