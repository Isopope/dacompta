"use client";
import { useState, type ReactNode } from "react";

export interface Colonne<T> { cle: string; titre: string; rendu: (row: T) => ReactNode; }

export function DataTable<T>({ colonnes, lignes, cleLigne, onLigneClick, rechercheTexte, videLabel = "Aucun élément." }: {
  colonnes: Colonne<T>[]; lignes: T[]; cleLigne: (row: T) => string;
  onLigneClick?: (row: T) => void; rechercheTexte?: boolean; videLabel?: string;
}) {
  const [q, setQ] = useState("");
  const filtrees = rechercheTexte && q
    ? lignes.filter((r) => colonnes.some((c) => String(c.rendu(r) ?? "").toLowerCase?.().includes?.(q.toLowerCase())))
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
            {filtrees.length === 0 ? (
              <tr><td colSpan={colonnes.length} className="muted" style={{ padding: 16 }}>{videLabel}</td></tr>
            ) : filtrees.map((r) => (
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
