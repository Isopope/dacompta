"use client";
// Sélecteur de dossier côté client — appelle la server action puis rafraîchit la page
import { useRouter } from "next/navigation";
import { choisirDossier } from "@/server/dossiers";

export function DossierSwitcher({
  dossiers,
  courantId,
}: {
  dossiers: { id: string; nom: string }[];
  courantId: string | null;
}) {
  const router = useRouter();
  return (
    <select
      className="input"
      value={courantId ?? ""}
      onChange={async (e) => {
        await choisirDossier(e.target.value);
        router.refresh();
      }}
    >
      {!courantId && <option value="">— choisir un dossier —</option>}
      {dossiers.map((d) => (
        <option key={d.id} value={d.id}>
          {d.nom}
        </option>
      ))}
    </select>
  );
}
