"use client";
// Composant primitif d'édition des lignes de facture (HT + taxe).
// Chaque ligne porte : compte produit, libellé, montant HT, code taxe.
import { useRef } from "react";

/** Représente une ligne de saisie hors taxe. */
export interface LigneHT {
  compteNumero: string;
  libelleLigne: string;
  montantHT: number;
  taxeCode: string;
  /** Clé interne UI uniquement — jamais envoyée au serveur. Stabilise le `key` React lors des suppressions. */
  _key?: string;
}

/**
 * Éditeur tabulaire de lignes HT pour une facture.
 * - Permet d'ajouter, modifier et retirer des lignes.
 * - Délègue les changements d'état au parent via `onChange`.
 */
export function LineEditor({
  comptes,
  taxes,
  lignes,
  onChange,
}: {
  comptes: { numero: string; intitule: string }[];
  taxes: { code: string; nom: string; taux: number }[];
  lignes: LigneHT[];
  onChange: (l: LigneHT[]) => void;
}) {
  // Compteur stable pour générer des clés internes uniques (évite Date.now/Math.random).
  const cle = useRef(0);

  /** Applique un patch partiel sur la ligne à l'index i. */
  const maj = (i: number, patch: Partial<LigneHT>) =>
    onChange(lignes.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  /** Ajoute une nouvelle ligne avec les valeurs par défaut et une clé stable. */
  const ajouter = () =>
    onChange([
      ...lignes,
      {
        compteNumero: comptes[0]?.numero ?? "",
        libelleLigne: "",
        montantHT: 0,
        taxeCode: taxes[0]?.code ?? "",
        _key: `cle-${cle.current++}`,
      },
    ]);

  /** Supprime la ligne à l'index i. */
  const retirer = (i: number) => onChange(lignes.filter((_, j) => j !== i));

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: 6 }}>Compte</th>
            <th style={{ textAlign: "left", padding: 6 }}>Libellé</th>
            <th style={{ textAlign: "right", padding: 6 }}>Montant HT</th>
            <th style={{ textAlign: "left", padding: 6 }}>Taxe</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((l, i) => (
            <tr key={l._key ?? i}>
              {/* Sélection du compte produit/charge */}
              <td style={{ padding: 6 }}>
                <select
                  className="input"
                  value={l.compteNumero}
                  onChange={(e) => maj(i, { compteNumero: e.target.value })}
                >
                  {comptes.map((c) => (
                    <option key={c.numero} value={c.numero}>
                      {c.numero} — {c.intitule}
                    </option>
                  ))}
                </select>
              </td>
              {/* Libellé libre de la ligne */}
              <td style={{ padding: 6 }}>
                <input
                  className="input"
                  value={l.libelleLigne}
                  onChange={(e) => maj(i, { libelleLigne: e.target.value })}
                />
              </td>
              {/* Montant hors taxe */}
              <td style={{ padding: 6, textAlign: "right" }}>
                <input
                  className="input mono"
                  type="number"
                  value={l.montantHT}
                  onChange={(e) => maj(i, { montantHT: Number(e.target.value) })}
                />
              </td>
              {/* Sélection de la taxe applicable */}
              <td style={{ padding: 6 }}>
                <select
                  className="input"
                  value={l.taxeCode}
                  onChange={(e) => maj(i, { taxeCode: e.target.value })}
                >
                  <option value="">— sans taxe —</option>
                  {taxes.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.nom}
                    </option>
                  ))}
                </select>
              </td>
              {/* Bouton suppression ligne */}
              <td style={{ padding: 6 }}>
                <button className="btn" onClick={() => retirer(i)} aria-label="Retirer">
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Bouton d'ajout de ligne */}
      <button className="btn" onClick={ajouter} style={{ marginTop: 8 }}>
        + Ajouter une ligne
      </button>
    </div>
  );
}
