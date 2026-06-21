"use client";

import { useEffect, useState } from "react";
import { getOpenLines, createLettrage, type OpenLineDTO, type LettrageDTO } from "@/server/lettrage";

// Since we don't have a utility, we'll define a simple format function

const fmt = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function LettrageClient(props: {
  dossierId: string;
  comptes: { numero: string; intitule: string }[];
  journaux: { id: string; code: string; libelle: string }[];
}) {
  const [openLines, setOpenLines] = useState<OpenLineDTO[]>([]);
  const [selectedDebit, setSelectedDebit] = useState<OpenLineDTO | null>(null);
  const [selectedCredit, setSelectedCredit] = useState<OpenLineDTO | null>(null);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Map for quick lookup of intitule from compte numero (optional, we already have intitule in DTO)
  const compteIntituleMap = new Map<string, string>();
  props.comptes.forEach((c) => compteIntituleMap.set(c.numero, c.intitule));
  const journalLibelleMap = new Map<string, string>();
  props.journaux.forEach((j) => journalLibelleMap.set(j.code, j.libelle));

  useEffect(() => {
    loadOpenLines();
  }, [props.dossierId]);

  async function loadOpenLines() {
    setLoading(true);
    try {
      const lines = await getOpenLines(props.dossierId);
      setOpenLines(lines);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors du chargement des lignes ouvertes");
    } finally {
      setLoading(false);
    }
  }

  function selectDebit(line: OpenLineDTO) {
    setSelectedDebit(line);
    // If same line selected for credit, clear credit to avoid same line both sides
    if (selectedCredit && selectedCredit.id === line.id) {
      setSelectedCredit(null);
    }
  }

  function selectCredit(line: OpenLineDTO) {
    setSelectedCredit(line);
    if (selectedDebit && selectedDebit.id === line.id) {
      setSelectedDebit(null);
    }
  }

  function clearSelection() {
    setSelectedDebit(null);
    setSelectedCredit(null);
    setAmount("");
    setError(null);
    setSuccess(null);
  }

  async function handleLettrage() {
    if (!selectedDebit || !selectedCredit) {
      setError("Veuillez sélectionner une ligne débit et une ligne crédit.");
      return;
    }
    if (selectedDebit.id === selectedCredit.id) {
      setError("Vous ne pouvez pas lettrer une ligne avec elle-même.");
      return;
    }
    if (selectedDebit.compteNumero !== selectedCredit.compteNumero) {
      setError("Les lignes doivent appartenir au même compte de tiers.");
      return;
    }
    const amountNum = parseFloat(amount.replace(/\s/g, "").replace(",", "."));
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Veuillez saisir un montant valide supérieur à zéro.");
      return;
    }
    const maxLettrable = Math.min(selectedDebit.amountResidual, selectedCredit.amountResidual);
    if (amountNum > maxLettrable) {
      setError(
        `Montant trop élevé. Maximum lettrable : ${fmt(maxLettrable)}`
      );
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const lettrage: LettrageDTO = await createLettrage(
        props.dossierId,
        selectedDebit.id,
        selectedCredit.id,
        amountNum,
        { auto: false }
      );
      setSuccess(`Lettrage créé avec succès (ID: ${lettrage.id}).`);
      // Refresh open lines
      await loadOpenLines();
      // Clear selection
      clearSelection();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors du lettrage.");
    } finally {
      setLoading(false);
    }
  }

  if (loading && !openLines.length) {
    return <p className="muted">Chargement…</p>;
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 20, alignItems: "start", marginTop: 20 }}>
      {/* Colonne gauche : liste des lignes ouvertes */}
      <aside style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden" }}>
        <div className="row" style={{ padding: 12, borderBottom: "1px solid var(--line)" }}>
          <b>Lignes ouvertes (amountResidual &gt; 0)</b>
          <div className="grow" />
          <button
            className="btn"
            onClick={loadOpenLines}
            style={{ padding: "4px 8px", fontSize: "12px" }}
          >
            Rafraîchir
          </button>
        </div>
        <div style={{ maxHeight: "60vh", overflow: "auto" }}>
          {openLines.length === 0 ? (
            <div className="muted" style={{ padding: 16 }}>Aucune ligne ouverte.</div>
          ) : (
            <>
              {openLines.map((line) => {
                const isDebitSelected = selectedDebit?.id === line.id;
                const isCreditSelected = selectedCredit?.id === line.id;
                const isSelected = isDebitSelected || isCreditSelected;
                const bgcolor = isSelected ? "#f1f5f4" : "transparent";
                return (
                  <div
                    key={line.id}
                    onClick={() => {
                      // Determine if line is débit or crédit based on sens
                      if (line.sens === 1) {
                        selectDebit(line);
                      } else {
                        selectCredit(line);
                      }
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "10px 12px",
                      borderBottom: "1px solid var(--line)",
                      background: bgcolor,
                      cursor: "pointer",
                    }}
                  >
                    <div className="row" style={{ justifyContent: "space-between" }}>
                      <span className="muted">#{line.pieceNumero}</span>
                      <span className="badge" style={{ background: line.sens === 1 ? "#dcfce7" : "#fee2e2", color: line.sens === 1 ? "#166534" : "#991b1b" }}>
                        {line.sens === 1 ? "Débit" : "Crédit"}
                      </span>
                    </div>
                    <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                      {line.journalCode} · {line.compteNumero} · {line.intituleCompte}
                    </div>
                    <div className="row" style={{ justifyContent: "space-between", marginTop: 4 }}>
                      <span className="muted">Référence : {line.libelleLigne}</span>
                      <span className="mono">
                        Débit: {fmt(line.debit)} &nbsp;|&nbsp; Crédit: {fmt(line.credit)}
                      </span>
                    </div>
                    <div className="row" style={{ justifyContent: "space-between", fontSize: 12 }}>
                      <span className="muted">Résiduel :</span>
                      <span className="mono">{fmt(line.amountResidual)}</span>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </aside>

      {/* Colonne droite : détail et formulaire */}
      <section>
        {selectedDebit || selectedCredit ? (
          <>
            <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <h2>Sélection</h2>
              {selectedDebit && (
                <div style={{ marginBottom: 8 }}>
                  <b>Ligne débit sélectionnée</b>
                  <div className="muted">
                    Pièce #{selectedDebit.pieceNumero} · {selectedDebit.journalCode} · {selectedDebit.compteNumero} · {selectedDebit.intituleCompte}
                  </div>
                  <div className="row" style={{ marginTop: 4 }}>
                    <span className="muted">Libellé :</span> {selectedDebit.libelleLigne}
                  </div>
                  <div className="row">
                    <span className="muted">Montant :</span>
                    <span className="mono">Débit {fmt(selectedDebit.debit)} &nbsp;|&nbsp; Crédit {fmt(selectedDebit.credit)}</span>
                  </div>
                  <div className="row">
                    <span className="muted">Résiduel :</span>
                    <span className="mono">{fmt(selectedDebit.amountResidual)}</span>
                  </div>
                </div>
              )}
              {selectedCredit && (
                <div style={{ marginBottom: 8 }}>
                  <b>Ligne crédit sélectionnée</b>
                  <div className="muted">
                    Pièce #{selectedCredit.pieceNumero} · {selectedCredit.journalCode} · {selectedCredit.compteNumero} · {selectedCredit.intituleCompte}
                  </div>
                  <div className="row" style={{ marginTop: 4 }}>
                    <span className="muted">Libellé :</span> {selectedCredit.libelleLigne}
                  </div>
                  <div className="row">
                    <span className="muted">Montant :</span>
                    <span className="mono">Débit {fmt(selectedCredit.debit)} &nbsp;|&nbsp; Crédit {fmt(selectedCredit.credit)}</span>
                  </div>
                  <div className="row">
                    <span className="muted">Résiduel :</span>
                    <span className="mono">{fmt(selectedCredit.amountResidual)}</span>
                  </div>
                </div>
              )}
            </div>

            {(selectedDebit && selectedCredit && selectedDebit.compteNumero === selectedCredit.compteNumero) ? (
              <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 8, padding: 16 }}>
                <h2>Lettrage</h2>
                <div className="row" style={{ marginBottom: 8 }}>
                  <span className="muted">Compte :</span> {selectedDebit.compteNumero} ({selectedDebit.intituleCompte})
                </div>
                <div className="row" style={{ marginBottom: 8 }}>
                  <span className="muted">Montant maximum lettrable :</span>
                  <span className="mono">{fmt(Math.min(selectedDebit.amountResidual, selectedCredit.amountResidual))}</span>
                </div>
                <div className="row" style={{ marginBottom: 12 }}>
                  <label htmlFor="amount" className="muted">
                    Montant à lettrer :
                  </label>
                  <input
                    id="amount"
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Ex: 1234,56"
                    className="input"
                    style={{ width: "100%", padding: "8px 12px" }}
                  />
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <button
                    className="btn primary"
                    onClick={handleLettrage}
                    disabled={loading}
                  >
                    {loading ? "Lettrage en cours…" : "Lettrer"}
                  </button>
                  <button
                    className="btn"
                    onClick={clearSelection}
                  >
                    Annuler
                  </button>
                </div>
                {error && (
                  <div className="muted" style={{ color: "#b3391f", marginTop: 8 }}>{error}</div>
                )}
                {success && (
                  <div className="muted" style={{ color: "#166534", marginTop: 8 }}>{success}</div>
                )}
              </div>
            ) : (
              <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 8, padding: 16, textAlign: "center" }}>
                <p className="muted">
                  Sélectionnez une ligne débit et une ligne crédit du même compte pour activer le lettrage.
                </p>
              </div>
            )}
          </>
        ) : (
          <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 8, padding: 40, textAlign: "center" }}>
            <p className="muted">Aucune ligne sélectionnée.</p>
          </div>
        )}
      </section>
    </div>
  );
}