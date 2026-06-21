"use client";
// Sélecteur de dossier côté client — appelle la server action puis rafraîchit la page
import Link from "next/link";
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
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <select
        className="input"
        value={courantId ?? ""}
        onChange={async (e) => {
          try {
            await choisirDossier(e.target.value);
            router.refresh();
          } catch (err) {
            console.error("Échec du changement de dossier :", err);
          }
        }}
        style={{ flex: 1 }}
      >
        {!courantId && <option value="">— choisir un dossier —</option>}
        {dossiers.map((d) => (
          <option key={d.id} value={d.id}>
            {d.nom}
          </option>
        ))}
      </select>
      <Link href="/dossiers/nouveau" className="chip" title="Nouveau dossier">＋</Link>
    </div>
  );
}
