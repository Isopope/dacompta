// src/app/MesDossiers.tsx
"use client";
// Table portefeuille « Mes dossiers » : compteurs par dossier + bouton « Ouvrir »
// qui bascule le dossier courant (cookie) puis rafraîchit la page.
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { choisirDossier } from "@/server/dossiers";
import type { ResumeDossier } from "@/server/portefeuille";

export function MesDossiers({
  dossiers,
  courantId,
}: {
  dossiers: ResumeDossier[];
  courantId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function ouvrir(id: string) {
    startTransition(async () => {
      await choisirDossier(id);
      router.refresh();
    });
  }

  return (
    <section style={{ marginTop: 32 }} aria-labelledby="mes-dossiers-titre">
      <h2 id="mes-dossiers-titre" style={{ fontSize: 16, marginBottom: 8 }}>Mes dossiers</h2>
      {dossiers.length === 0 ? (
        <p className="muted">Aucun dossier. Créez-en un pour commencer.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 8 }}>Société</th>
                <th style={{ textAlign: "right", padding: 8 }}>Brouillons</th>
                <th style={{ textAlign: "right", padding: 8 }}>À lettrer</th>
                <th style={{ textAlign: "right", padding: 8 }}>TVA due</th>
                <th style={{ padding: 8 }} aria-label="Actions"></th>
              </tr>
            </thead>
            <tbody>
              {dossiers.map((d) => (
                <tr key={d.id} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={{ padding: 8 }}>
                    {d.nom}
                    {d.id === courantId && <span className="chip" style={{ marginLeft: 8 }}>courant</span>}
                  </td>
                  <td style={{ padding: 8, textAlign: "right" }} className="mono">{d.nbBrouillons}</td>
                  <td style={{ padding: 8, textAlign: "right" }} className="mono">{d.nbALettrer}</td>
                  <td style={{ padding: 8, textAlign: "right" }} className="mono">{d.tvaDue.toLocaleString("fr-FR")}</td>
                  <td style={{ padding: 8, textAlign: "right" }}>
                    <button type="button" onClick={() => ouvrir(d.id)} disabled={pending || d.id === courantId}>
                      Ouvrir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
