"use client";
import { useState, type ReactNode } from "react";

export interface Colonne<T> {
  cle: string;
  titre: string;
  rendu: (row: T) => ReactNode;
  /** Valeur textuelle utilisée pour la recherche ; obligatoire quand rendu() retourne du JSX. */
  valeurRecherche?: (row: T) => string;
}

export function DataTable<T>({ colonnes, lignes, cleLigne, onLigneClick, rechercheTexte, videLabel = "Aucun élément." }: {
  colonnes: Colonne<T>[]; lignes: T[]; cleLigne: (row: T) => string;
  onLigneClick?: (row: T) => void; rechercheTexte?: boolean; videLabel?: string;
}) {
  const [q, setQ] = useState("");

  // Filtre client : utilise valeurRecherche si fournie, sinon fallback String(rendu)
  const qLower = q.toLowerCase();
  const filtrees = rechercheTexte && q
    ? lignes.filter((r) =>
        colonnes.some((c) =>
          (c.valeurRecherche?.(r) ?? String(c.rendu(r) ?? "")).toLowerCase().includes(qLower)
        )
      )
    : lignes;

  return (
    <div>
      {rechercheTexte && (
        <input className="input" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 12 }} />
      )}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>{colonnes.map((c) => <th key={c.cle} style={{ textAlign: "left", borderBottom: "1px solid var(--line)", padding: 8 }}>{c.titre}</th>)}</tr>
          </thead>
          <tbody>
            {/* État vide : colSpan sur toutes les colonnes */}
            {filtrees.length === 0 ? (
              <tr><td colSpan={colonnes.length} className="muted" style={{ padding: 16 }}>{videLabel}</td></tr>
            ) : filtrees.map((r) => (
              /* Ligne cliquable si handler fourni */
              <tr key={cleLigne(r)} onClick={() => onLigneClick?.(r)} style={{ cursor: onLigneClick ? "pointer" : "default" }}>
                {colonnes.map((c) => <td key={c.cle} style={{ borderBottom: "1px solid var(--line)", padding: 8 }}>{c.rendu(r)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
