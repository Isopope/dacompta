"use client";
import { useMemo, useState } from "react";
import { creerPieceUI, type PieceDTO } from "./actions";
import type { JournalLite, CompteLite } from "./EcrituresClient";

interface LigneSaisie {
  compteNumero: string;
  libelleLigne: string;
  debit: string;
  credit: string;
  sectionAnalytique: string;
}

const ligneVide = (): LigneSaisie => ({ compteNumero: "", libelleLigne: "", debit: "", credit: "", sectionAnalytique: "" });

const num = (s: string) => {
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const fmt = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function aujourdhui() {
  return new Date().toISOString().slice(0, 10);
}

export default function PieceForm(props: {
  dossierId: string;
  journaux: JournalLite[];
  comptes: CompteLite[];
  onCree: (piece: PieceDTO) => void | Promise<void>;
  onAnnuler: () => void;
}) {
  const [journalId, setJournalId] = useState(props.journaux[0]?.id ?? "");
  const [numeroPiece, setNumeroPiece] = useState("");
  const [fournisseur, setFournisseur] = useState("");
  const [datePiece, setDatePiece] = useState(aujourdhui());
  const [lignes, setLignes] = useState<LigneSaisie[]>([ligneVide(), ligneVide()]);
  const [openRow, setOpenRow] = useState<number | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const totalDebit = useMemo(() => lignes.reduce((s, l) => s + num(l.debit), 0), [lignes]);
  const totalCredit = useMemo(() => lignes.reduce((s, l) => s + num(l.credit), 0), [lignes]);
  const ecart = totalDebit - totalCredit;
  const equilibre = Math.abs(ecart) < 0.005 && totalDebit > 0;

  const lignesValides = lignes.filter((l) => l.compteNumero.trim() && (num(l.debit) > 0 || num(l.credit) > 0));
  const peutCreer = !!journalId && !!numeroPiece.trim() && equilibre && lignesValides.length >= 2 && !enCours;

  function majLigne(i: number, patch: Partial<LigneSaisie>) {
    setLignes((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function ajouterLigne() { setLignes((ls) => [...ls, ligneVide()]); }
  function supprimerLigne(i: number) {
    setLignes((ls) => (ls.length <= 1 ? ls : ls.filter((_, idx) => idx !== i)));
  }

  function suggestions(texte: string): CompteLite[] {
    const t = texte.trim().toLowerCase();
    const base = t
      ? props.comptes.filter((c) => c.numero.includes(t) || c.intitule.toLowerCase().includes(t))
      : props.comptes;
    return base.slice(0, 8);
  }

  async function creer() {
    setErreur(null);
    setEnCours(true);
    try {
      const piece = await creerPieceUI({
        dossierId: props.dossierId,
        journalId,
        numeroPiece: numeroPiece.trim(),
        datePiece: new Date(datePiece),
        fournisseur: fournisseur.trim() || undefined,
        lignes: lignesValides.map((l) => ({
          compteNumero: l.compteNumero.trim(),
          libelleLigne: l.libelleLigne.trim() || l.compteNumero.trim(),
          debit: num(l.debit),
          credit: num(l.credit),
          sectionAnalytique: l.sectionAnalytique.trim() || undefined,
        })),
      });
      // reset
      setNumeroPiece("");
      setFournisseur("");
      setLignes([ligneVide(), ligneVide()]);
      await props.onCree(piece);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur lors de la création.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 8, padding: 20 }}>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Nouvelle pièce</h2>
        <button className="btn" onClick={props.onAnnuler}>✕ Fermer</button>
      </div>

      {/* En-tête : journal + numéro + fournisseur + date */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div className="field" style={{ margin: 0 }}>
          <label>Journal</label>
          <select className="input" value={journalId} onChange={(e) => setJournalId(e.target.value)}>
            {props.journaux.map((j) => (
              <option key={j.id} value={j.id}>{j.code} — {j.libelle}</option>
            ))}
          </select>
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label>N° de pièce</label>
          <input className="input mono" placeholder="ex. ACH-001" value={numeroPiece} onChange={(e) => setNumeroPiece(e.target.value)} />
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label>Fournisseur / Tiers</label>
          <input className="input" value={fournisseur} onChange={(e) => setFournisseur(e.target.value)} />
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label>Date</label>
          <input className="input" type="date" value={datePiece} onChange={(e) => setDatePiece(e.target.value)} />
        </div>
      </div>

      {/* Table des lignes */}
      <table>
        <thead>
          <tr>
            <th style={{ width: 200 }}>Compte</th>
            <th>Libellé</th>
            <th style={{ width: 120 }}>Section</th>
            <th style={{ width: 110, textAlign: "right" }}>Débit</th>
            <th style={{ width: 110, textAlign: "right" }}>Crédit</th>
            <th style={{ width: 36 }} />
          </tr>
        </thead>
        <tbody>
          {lignes.map((l, i) => (
            <tr key={i}>
              <td style={{ position: "relative" }}>
                <input
                  className="input mono"
                  placeholder="n° ou intitulé"
                  value={l.compteNumero}
                  onChange={(e) => { majLigne(i, { compteNumero: e.target.value }); setOpenRow(i); }}
                  onFocus={() => setOpenRow(i)}
                  onBlur={() => setTimeout(() => setOpenRow((r) => (r === i ? null : r)), 150)}
                />
                {openRow === i && suggestions(l.compteNumero).length > 0 && (
                  <div style={{
                    position: "absolute", zIndex: 10, top: "100%", left: 0, right: 0,
                    background: "#fff", border: "1px solid var(--line)", borderRadius: 8,
                    boxShadow: "0 6px 18px rgba(0,0,0,.12)", maxHeight: 220, overflow: "auto",
                  }}>
                    {suggestions(l.compteNumero).map((c) => (
                      <button
                        key={c.numero}
                        onMouseDown={(e) => { e.preventDefault(); majLigne(i, { compteNumero: c.numero, libelleLigne: l.libelleLigne || c.intitule }); setOpenRow(null); }}
                        style={{ display: "block", width: "100%", textAlign: "left", border: "none", background: "#fff", cursor: "pointer", padding: "8px 10px", fontSize: 13 }}
                      >
                        <b className="mono">{c.numero}</b> <span className="muted">{c.intitule}</span>
                      </button>
                    ))}
                  </div>
                )}
              </td>
              <td>
                <input className="input" value={l.libelleLigne} onChange={(e) => majLigne(i, { libelleLigne: e.target.value })} />
              </td>
              <td>
                <input className="input" placeholder="—" value={l.sectionAnalytique} onChange={(e) => majLigne(i, { sectionAnalytique: e.target.value })} />
              </td>
              <td>
                <input className="input mono" style={{ textAlign: "right" }} inputMode="decimal" value={l.debit}
                  onChange={(e) => majLigne(i, { debit: e.target.value, credit: e.target.value ? "" : l.credit })} />
              </td>
              <td>
                <input className="input mono" style={{ textAlign: "right" }} inputMode="decimal" value={l.credit}
                  onChange={(e) => majLigne(i, { credit: e.target.value, debit: e.target.value ? "" : l.debit })} />
              </td>
              <td style={{ textAlign: "center" }}>
                <button className="btn" style={{ padding: "4px 8px" }} onClick={() => supprimerLigne(i)} title="Supprimer la ligne">✕</button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ fontWeight: 600 }}>
            <td colSpan={3} style={{ textAlign: "right" }}>Totaux</td>
            <td className="mono" style={{ textAlign: "right" }}>{fmt(totalDebit)}</td>
            <td className="mono" style={{ textAlign: "right" }}>{fmt(totalCredit)}</td>
            <td />
          </tr>
        </tfoot>
      </table>

      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn" onClick={ajouterLigne}>＋ Ajouter une ligne</button>
        <div className="grow" />
        {equilibre ? (
          <span className="badge" style={{ background: "#dcfce7", color: "#166534" }}>● Équilibrée</span>
        ) : (
          <span className="badge warn">● Déséquilibre : {fmt(ecart)}</span>
        )}
      </div>

      {erreur && <div className="badge warn" style={{ display: "block", marginTop: 12, padding: "8px 12px" }}>{erreur}</div>}

      <div className="row" style={{ marginTop: 16 }}>
        <button className="btn primary" disabled={!peutCreer} onClick={creer}>
          {enCours ? "Création…" : "Créer la pièce"}
        </button>
        <button className="btn" onClick={props.onAnnuler}>Annuler</button>
      </div>
    </div>
  );
}
