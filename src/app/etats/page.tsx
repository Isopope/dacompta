// Page États — Déclaration TVA (T1 placeholder)
// Agrège la TVA collectée et déductible depuis les écritures du dossier courant.
import { Shell } from "@/components/Shell";
import { getDossierIdCookie } from "@/lib/dossier-context";
import { getDeclarationTVA } from "@/server/taxes";

export default async function Page() {
  // Lecture du dossier courant depuis le cookie
  const dossierId = await getDossierIdCookie();
  // Si aucun dossier sélectionné, on renvoie des zéros (Shell affichera l'invite de sélection)
  const tva = dossierId
    ? await getDeclarationTVA(dossierId)
    : { collectee: 0, deductible: 0, netteDue: 0 };

  return (
    <Shell module="etats" breadcrumb={[{ label: "États" }, { label: "Déclaration TVA" }]}>
      <div className="panel" style={{ padding: 16, maxWidth: 420 }}>
        <h3>Déclaration de TVA</h3>
        {/* Montants formatés selon la locale française */}
        <p>
          TVA collectée :{" "}
          <strong className="mono">{tva.collectee.toLocaleString("fr-FR")}</strong>
        </p>
        <p>
          TVA déductible :{" "}
          <strong className="mono">{tva.deductible.toLocaleString("fr-FR")}</strong>
        </p>
        <p>
          TVA nette due :{" "}
          <strong className="mono">{tva.netteDue.toLocaleString("fr-FR")}</strong>
        </p>
      </div>
    </Shell>
  );
}
