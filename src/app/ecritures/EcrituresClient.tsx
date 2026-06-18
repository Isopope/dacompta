"use client";
import { useMemo, useState } from "react";
import { listerPiecesUI, validerPieceUI, annulerPieceUI, type PieceDTO } from "./actions";
import PieceForm from "./PieceForm";

export interface JournalLite { id: string; code: string; libelle: string; }
export interface CompteLite { numero: string; intitule: string; }

type Statut = PieceDTO["statut"];

const STATUT_STYLE: Record<Statut, { fond: string; texte: string; label: string }> = {
  BROUILLON: { fond: "#fef3c7", texte: "#92400e", label: "Brouillon" },
  VALIDEE: { fond: "#dcfce7", texte: "#166534", label: "Validée" },
  ANNULEE: { fond: "#fee2e2", texte: "#991b1b", label: "Annulée" },
};

function StatutBadge({ statut }: { statut: Statut }) {
  const s = STATUT_STYLE[statut];
  return (
    <span className="badge" style={{ background: s.fond, color: s.texte }}>{s.label}</span>
  );
}

const fmt = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function EcrituresClient(props: {
  dossierId: string;
  journaux: JournalLite[];
  piecesInitiales: PieceDTO[];
  comptes: CompteLite[];
}) {
  const [pieces, setPieces] = useState<PieceDTO[]>(props.piecesInitiales);
  const [filtre, setFiltre] = useState<Statut | "TOUS">("BROUILLON");
  const [selectionId, setSelectionId] = useState<string | null>(null);
  const [creation, setCreation] = useState(false);

  const journauxById = useMemo(
    () => Object.fromEntries(props.journaux.map((j) => [j.id, j])),
    [props.journaux]
  );

  const piecesAffichees = useMemo(
    () => (filtre === "TOUS" ? pieces : pieces.filter((p) => p.statut === filtre)),
    [pieces, filtre]
  );

  const selection = pieces.find((p) => p.id === selectionId) ?? null;

  async function rafraichir(selId: string | null = selectionId) {
    const liste = await listerPiecesUI(props.dossierId, {});
    setPieces(liste);
    setSelectionId(selId);
  }

  async function onCree(nouvelle: PieceDTO) {
    await rafraichir(nouvelle.id);
    setCreation(false);
    setFiltre("BROUILLON");
  }

  async function valider(id: string) {
    await validerPieceUI(id);
    await rafraichir(id);
  }

  async function annuler(id: string) {
    await annulerPieceUI(id);
    await rafraichir(id);
  }

  function ouvrirCreation() {
    setCreation(true);
    setSelectionId(null);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20, alignItems: "start", marginTop: 20 }}>
      {/* Colonne gauche : inbox des pièces */}
      <aside style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden" }}>
        <div className="row" style={{ padding: 12, borderBottom: "1px solid var(--line)" }}>
          <b>Pièces</b>
          <div className="grow" />
          <button className="btn primary" onClick={ouvrirCreation}>＋ Nouvelle</button>
        </div>
        <div className="row" style={{ padding: "10px 12px", gap: 6, flexWrap: "wrap" }}>
          {(["BROUILLON", "VALIDEE", "ANNULEE", "TOUS"] as const).map((f) => (
            <button
              key={f}
              className={"chip" + (filtre === f ? " active" : "")}
              onClick={() => setFiltre(f)}
            >
              {f === "TOUS" ? "Toutes" : STATUT_STYLE[f].label}
            </button>
          ))}
        </div>
        <div style={{ maxHeight: "60vh", overflow: "auto" }}>
          {piecesAffichees.map((p) => {
            const j = journauxById[p.journalId];
            const actif = !creation && p.id === selectionId;
            return (
              <button
                key={p.id}
                onClick={() => { setCreation(false); setSelectionId(p.id); }}
                style={{
                  display: "block", width: "100%", textAlign: "left", cursor: "pointer",
                  padding: "10px 12px", border: "none", borderBottom: "1px solid var(--line)",
                  background: actif ? "#f1f5f4" : "#fff",
                }}
              >
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <b className="mono">{p.numeroPiece}</b>
                  <StatutBadge statut={p.statut} />
                </div>
                <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                  {j ? `${j.code}` : "—"} · {p.fournisseur || "sans tiers"} · {fmt(p.montantTTC)} {""}
                </div>
              </button>
            );
          })}
          {piecesAffichees.length === 0 && (
            <div className="muted" style={{ padding: 16 }}>Aucune pièce.</div>
          )}
        </div>
      </aside>

      {/* Colonne droite : détail ou formulaire */}
      <section>
        {creation ? (
          <PieceForm
            dossierId={props.dossierId}
            journaux={props.journaux}
            comptes={props.comptes}
            onCree={onCree}
            onAnnuler={() => setCreation(false)}
          />
        ) : selection ? (
          <DetailPiece
            piece={selection}
            journal={journauxById[selection.journalId] ?? null}
            onValider={() => valider(selection.id)}
            onAnnuler={() => annuler(selection.id)}
          />
        ) : (
          <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 8, padding: 40, textAlign: "center" }}>
            <p className="muted">Sélectionnez une pièce à gauche, ou créez-en une nouvelle.</p>
            <button className="btn primary" onClick={ouvrirCreation}>＋ Nouvelle pièce</button>
          </div>
        )}
      </section>
    </div>
  );
}

function DetailPiece(props: {
  piece: PieceDTO;
  journal: JournalLite | null;
  onValider: () => void;
  onAnnuler: () => void;
}) {
  const { piece, journal } = props;
  const totalDebit = piece.lignes.reduce((s, l) => s + l.debit, 0);
  const totalCredit = piece.lignes.reduce((s, l) => s + l.credit, 0);

  return (
    <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 8, padding: 20 }}>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 4 }}>
        <h2 style={{ margin: 0 }} className="mono">{piece.numeroPiece}</h2>
        <StatutBadge statut={piece.statut} />
      </div>
      <p className="muted" style={{ marginTop: 0 }}>
        {journal ? `${journal.code} · ${journal.libelle}` : "—"} · {new Date(piece.datePiece).toLocaleDateString("fr-FR")}
        {piece.fournisseur ? ` · ${piece.fournisseur}` : ""}
      </p>

      <table style={{ marginTop: 12 }}>
        <thead>
          <tr><th>Compte</th><th>Libellé</th><th>Section</th><th style={{ textAlign: "right" }}>Débit</th><th style={{ textAlign: "right" }}>Crédit</th></tr>
        </thead>
        <tbody>
          {piece.lignes.map((l) => (
            <tr key={l.id}>
              <td className="mono">{l.compteNumero}</td>
              <td>{l.libelleLigne}</td>
              <td>{l.sectionAnalytique || <span className="muted">—</span>}</td>
              <td className="mono" style={{ textAlign: "right" }}>{l.debit ? fmt(l.debit) : ""}</td>
              <td className="mono" style={{ textAlign: "right" }}>{l.credit ? fmt(l.credit) : ""}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ fontWeight: 600 }}>
            <td colSpan={3} style={{ textAlign: "right" }}>Totaux</td>
            <td className="mono" style={{ textAlign: "right" }}>{fmt(totalDebit)}</td>
            <td className="mono" style={{ textAlign: "right" }}>{fmt(totalCredit)}</td>
          </tr>
        </tfoot>
      </table>

      {piece.statut === "BROUILLON" && (
        <div className="row" style={{ marginTop: 16 }}>
          <button className="btn primary" onClick={props.onValider}>✓ Valider</button>
          <button className="btn" onClick={props.onAnnuler}>Annuler la pièce</button>
        </div>
      )}
    </div>
  );
}
