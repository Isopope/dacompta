"use client";
import type { NatureDef } from "@/lib/syscohada/referentiel";

export default function TabNatures({ natures }: { natures: NatureDef[] }) {
  return (
    <>
      <p className="muted">Mapping racine → nature, déjà conforme SYSCOHADA révisé — rien à reparamétrer.</p>
      <table>
        <thead><tr><th>Racine</th><th>Nature</th><th>Famille</th><th>Report N+1</th></tr></thead>
        <tbody>
          {natures.map((n) => (
            <tr key={n.racine}>
              <td className="mono">{n.racine}</td>
              <td>{n.libelle}</td>
              <td><span className="badge">{n.famille}</span></td>
              <td>{n.reportNplus1 ? "Oui — soldes reportés" : <span className="muted">Non — remis à zéro</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
