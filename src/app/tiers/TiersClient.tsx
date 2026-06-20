"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/DataTable";
import { creerTiers } from "@/server/tiers";

// Type local représentant un tiers affiché dans la liste
type T = { id: string; code: string; nom: string; type: string };

/**
 * Composant client pour la page Tiers.
 * Reçoit la liste des tiers et le dossierId depuis la page serveur parente.
 * Affiche un formulaire de création et un tableau listant les tiers du dossier.
 */
export function TiersClient({ tiers, dossierId }: { tiers: T[]; dossierId: string }) {
  const router = useRouter();
  // Champs du formulaire de création
  const [code, setCode] = useState(""); const [nom, setNom] = useState(""); const [type, setType] = useState("CLIENT");
  // Message d'erreur éventuel retourné par la server action
  const [erreur, setErreur] = useState<string | null>(null);

  /** Soumet le formulaire : appelle la server action creerTiers puis rafraîchit la page. */
  async function ajouter() {
    setErreur(null);
    try { await creerTiers({ dossierId, code, nom, type: type as "CLIENT" | "FOURNISSEUR" | "AUTRE" }); }
    catch (e) { setErreur(e instanceof Error ? e.message : "Erreur"); return; }
    setCode(""); setNom(""); router.refresh();
  }

  return (
    <div>
      {/* Formulaire de création d'un nouveau tiers */}
      <div className="panel" style={{ padding: 12, marginBottom: 16, display: "flex", gap: 8, alignItems: "end" }}>
        <label className="field">Code&nbsp;<input className="input" value={code} onChange={(e) => setCode(e.target.value)} /></label>
        <label className="field">Nom&nbsp;<input className="input" value={nom} onChange={(e) => setNom(e.target.value)} /></label>
        <label className="field">Type&nbsp;
          <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="CLIENT">Client</option><option value="FOURNISSEUR">Fournisseur</option><option value="AUTRE">Autre</option>
          </select>
        </label>
        <button className="btn primary" onClick={ajouter} disabled={!code || !nom}>+ Ajouter</button>
        {/* Affichage de l'erreur si la création échoue */}
        {erreur && <span className="badge warn">{erreur}</span>}
      </div>
      {/* Tableau de liste des tiers avec recherche textuelle */}
      <DataTable lignes={tiers} cleLigne={(t) => t.id} rechercheTexte videLabel="Aucun tiers."
        colonnes={[
          { cle: "code", titre: "Code", rendu: (t) => t.code },
          { cle: "nom", titre: "Nom", rendu: (t) => t.nom },
          { cle: "type", titre: "Type", rendu: (t) => t.type },
        ]} />
    </div>
  );
}
