/* global React, Win, Card, Chip, Btn, Mark, Note, Annot, Ln */
// Flux « Journal des Achats » — saisie ACH Janvier 2020 + échéances auto + ventilation analytique (Sage vidéo 09)

const { useState: useAState } = React;
const afmt = (n) => n.toLocaleString("fr-FR");

// pièces détaillées (1 à 5) — lignes [compte, tiers, libellé, débit, crédit]
const PIECES_DET = [
  {
    j: 2, n: 1, ech: "02/03/2020", term: "60 j",
    lines: [
      ["245100", "", "Achat de 2 bus", 18000000, 0],
      ["445100", "", "TVA récup. / immo", 3240000, 0],
      ["481200", "4812JAP", "FR Invest. Frères Japon", 0, 21240000],
    ],
  },
  {
    j: 3, n: 2, ech: "03/03/2020", term: "60 j",
    lines: [
      ["245100", "", "Achat d'un bus", 20000000, 0],
      ["445100", "", "TVA récup. / immo", 3600000, 0],
      ["481200", "4812JAP", "FR Invest. Frères Japon", 0, 23600000],
    ],
  },
  {
    j: 5, n: 3, ech: "05/03/2020", term: "60 j", exo: true,
    ana: [["BUSA", 900000], ["BUSB", 900000], ["BUSC", 1300000]],
    lines: [
      ["625200", "", "Assurance matériel de transport", 3100000, 0],
      ["401100", "401INSA", "Sté d'Assurance", 0, 3100000],
    ],
  },
  {
    j: 6, n: 4, ech: "comptant", term: "comptant",
    ana: [["BUSA", 103820], ["BUSB", 93500]],
    lines: [
      ["605310", "", "Achat de carburant", 197320, 0],
      ["445200", "", "TVA récup. / achats", 35518, 0],
      ["401100", "4011SNP", "Sté Nat. Pétrole", 0, 232838],
    ],
  },
  {
    j: 8, n: 5, ech: "08/03/2020", term: "60 j",
    ana: [["DIV", 120000]],
    lines: [
      ["605500", "", "Achat de fournitures de bureau", 120000, 0],
      ["445200", "", "TVA récup. / achats", 21600, 0],
      ["401100", "4011BUR", "Bureau Plus SARL", 0, 141600],
    ],
  },
];

// solde progressif par fournisseur — chaque facture alourdit la dette du tiers (compte 40x/481 au crédit)
const SUPP_BALS = (() => {
  const acc = {};
  return PIECES_DET.map((p) => {
    const sup = p.lines.find((l) => l[1] && l[4] > 0);
    if (!sup) return null;
    acc[sup[1]] = (acc[sup[1]] || 0) + sup[4];
    return { tier: sup[1], bal: acc[sup[1]], first: acc[sup[1]] === sup[4] };
  });
})();

// récap pièces 6 → 15 [jour, fournisseur, libellé, axe, échéance, ttc]
const PIECES_REC = [
  [10, "Sté Nat. Pétrole", "Carburant", "BUSA/B/C", "comptant", 322146],
  [12, "FR Invest. Bureau Plus", "Matériel informatique", "—", "12/03", 374060],
  [16, "Telecom SA", "Frais de téléphone", "DIV", "16/03", 31860],
  [17, "Sté Nat. Pétrole", "Carburant", "BUSA/B/C", "comptant", 676146],
  [21, "Sté Nat. d'Eau", "Eau", "DIV", "21/03", 88476],
  [25, "Fournisseur Électricité", "Électricité", "DIV", "25/03", 140385],
  [29, "Tout Propre SARL", "Produits d'entretien", "DIV", "29/03", 115640],
  [29, "Auto Plus", "Petit matériel & outillage", "DIV", "29/03", 153400],
  [29, "Les Frères Japon", "Achat de marchandises", "DIV", "29/03", 2572400],
];

const BROUILLARD_TOTAL = 48214438;

function AnaModal({ piece, onClose }) {
  if (!piece) return null;
  const tot = piece.ana.reduce((s, a) => s + a[1], 0);
  return (
    <div className="drawer-wrap open" style={{ pointerEvents: "auto" }}>
      <div className="drawer-scrim" style={{ opacity: 1 }} onClick={onClose} />
      <div className="ana-modal">
        <div className="flex center g8"><span className="chip ai">✦ Saisie analytique</span><div className="grow" /><span className="muted" style={{ cursor: "pointer" }} onClick={onClose}>✕</span></div>
        <Note style={{ marginTop: 8 }}>S'ouvre toute seule sur une charge ventilable</Note>
        <Card style={{ padding: 0, marginTop: 10 }}>
          <table className="tbl">
            <thead><tr><th>Section</th><th className="num">Montant</th><th className="num">%</th></tr></thead>
            <tbody>
              {piece.ana.map((a, i) => (
                <tr key={i}>
                  <td className="b">{a[0] === "DIV" ? "Diverses" : "Bus " + a[0].slice(-1)}</td>
                  <td className="num mono">{afmt(a[1])}</td>
                  <td className="num mono muted">{Math.round((a[1] / tot) * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex between center" style={{ padding: "8px 10px", borderTop: "2px solid var(--line)" }}>
            <span className="b">Total ventilé</span><span className="mono b">{afmt(tot)} <span className="chip accent" style={{ fontSize: ".7em" }}>100%</span></span>
          </div>
        </Card>
        <div className="flex g8 mt12"><span className="btn primary" style={{ flex: 1, justifyContent: "center" }} onClick={onClose}>Fermer</span></div>
      </div>
    </div>
  );
}

function AchatsWorkspace() {
  const [ana, setAna] = useAState(null);

  return (
    <div className="main" style={{ padding: 18 }}>
      <div className="flex center g10">
        <span className="b" style={{ fontSize: "1.15em" }}>Journal ACH · Janvier 2020</span>
        <Chip kind="fill">15 pièces</Chip>
        <div className="grow" />
        <span className="chip ai" style={{ fontSize: ".75em" }}>✦ échéances calculées auto</span>
        <span className="chip ai" style={{ fontSize: ".75em" }}>✦ solde fournisseur en continu</span>
      </div>

      {/* grille détaillée pièces 1-5 */}
      <Card style={{ padding: 0, marginTop: 12 }}>
        <table className="tbl">
          <thead><tr><th>J</th><th>Pièce</th><th>Compte</th><th>N° Tiers</th><th>Libellé</th><th>Échéance</th><th className="num">Débit</th><th className="num">Crédit</th><th className="num">Solde fourn.</th><th></th></tr></thead>
          <tbody>
            {PIECES_DET.map((p, pi) => p.lines.map((l, k) => {
              const isSup = l[1] && l[4] > 0;
              const sb = isSup ? SUPP_BALS[pi] : null;
              return (
              <tr key={p.n + "-" + k} style={k === 0 ? { borderTop: "2px solid var(--line)" } : null}>
                <td className="mono small">{k === 0 ? p.j : ""}</td>
                <td className="mono small">{k === 0 ? "n°" + p.n : ""}</td>
                <td className="mono b">{l[0]}</td>
                <td className="mono small">{l[1] && <span className="chip ai" style={{ fontSize: ".66em" }}>✦ {l[1]}</span>}</td>
                <td>{l[2]}{k === 0 && p.ana && <span className="chip fill" style={{ fontSize: ".64em", marginLeft: 6, cursor: "pointer" }} onClick={() => setAna(p)}>⊞ analytique</span>}{k === 0 && p.exo && <span className="chip" style={{ fontSize: ".64em", marginLeft: 6 }}>exonéré</span>}</td>
                <td className="small">{k === 0 ? (p.term === "comptant" ? <Chip kind="fill">comptant</Chip> : <span className="mono">{p.ech}</span>) : ""}</td>
                <td className="num mono">{l[3] ? afmt(l[3]) : ""}</td>
                <td className="num mono">{l[4] ? afmt(l[4]) : ""}</td>
                <td className="num mono" style={isSup ? { color: "var(--accent)", fontWeight: 700 } : null}>{isSup ? afmt(sb.bal) : ""}{isSup && !sb.first && <span className="chip ai" style={{ fontSize: ".58em", marginLeft: 5 }}>✦ cumulé</span>}</td>
                <td className="right muted small">{k === 0 && p.ana ? <span style={{ cursor: "pointer" }} onClick={() => setAna(p)}>⊞</span> : "✎"}</td>
              </tr>
              );
            }))}
          </tbody>
        </table>
      </Card>
      {/* pièce justificative */}
      <div className="flex center g10" style={{ marginTop: 12 }}>
        <PieceSlot name="FA-SNP-0604.pdf" type="Facture fournisseur · 85 Ko" ocr />
        <PieceSlot empty />
      </div>
      <Annot style={{ marginTop: 6 }}>Chaque facture d'achat est rattachée à sa pièce — OCR pré-remplit montant, fournisseur et TVA</Annot>

      <Annot style={{ marginTop: 8 }}>Échéance = date + délai de la fiche tiers (60 j) — calculée toute seule ; carburant = comptant</Annot>

      <div className="card" style={{ marginTop: 12, padding: 12 }}>
        <div className="flex center g10">
          <span className="chip accent">⇲ Solde fournisseur</span>
          <span className="small">À chaque facture, DaCompta met à jour le <b>solde du tiers</b> ligne par ligne — la dette grimpe au crédit du compte 40x/481. Les deux factures de <b>Frères Japon</b> (4812JAP) s'additionnent en continu : <Mark>21 240 000 → 44 840 000</Mark>, sans éditer la balance des tiers. Ce même solde alimente directement le <b>grand livre fournisseur</b> et la <b>balance âgée</b>.</span>
        </div>
      </div>

      {/* récap pièces 6-15 */}
      <Card style={{ padding: 0, marginTop: 12 }}>
        <div className="flex center g8" style={{ padding: "8px 12px", borderBottom: "2px solid var(--line)" }}><span className="b">Pièces 6 → 15</span><span className="muted small">tiers & sections créés à la volée (DIV pour les charges globales)</span></div>
        <table className="tbl">
          <thead><tr><th>J</th><th>Fournisseur</th><th>Libellé</th><th>Analytique</th><th>Échéance</th><th className="num">TTC</th></tr></thead>
          <tbody>
            {PIECES_REC.map((r, i) => (
              <tr key={i}>
                <td className="mono small">{r[0]}</td>
                <td>{r[1]}</td>
                <td className="muted">{r[2]}</td>
                <td>{r[3] === "—" ? <span className="muted small">—</span> : <span className="chip fill" style={{ fontSize: ".68em" }}>{r[3]}</span>}</td>
                <td className="small">{r[4] === "comptant" ? <Chip kind="fill">comptant</Chip> : <span className="mono">{r[4]}</span>}</td>
                <td className="num mono">{afmt(r[5])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* brouillard de contrôle */}
      <div className="card" style={{ marginTop: 12, padding: "12px 16px", borderColor: "var(--accent)", background: "var(--accent-soft)" }}>
        <div className="flex center g16 wrap">
          <span className="chip accent">⚖ Brouillard équilibré</span>
          <div className="col"><span className="muted small">Total Débit</span><span className="b mono" style={{ fontSize: "1.2em" }}>{afmt(BROUILLARD_TOTAL)}</span></div>
          <span className="muted">=</span>
          <div className="col"><span className="muted small">Total Crédit</span><span className="b mono" style={{ fontSize: "1.2em" }}>{afmt(BROUILLARD_TOTAL)}</span></div>
          <div className="grow" />
          <span className="muted small">contrôle en continu — pas besoin d'éditer un brouillard pour le vérifier</span>
        </div>
      </div>

      <AnaModal piece={ana} onClose={() => setAna(null)} />
    </div>
  );
}

Object.assign(window, { AchatsWorkspace });
