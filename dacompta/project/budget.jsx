/* global React, Win, Card, Chip, Btn, Mark, Note, Annot, Ln */
// Flux « Budget de fonctionnement » — postes budgétaires & écarts (réadaptation Sage 100 vidéo 07)

const { useState: useBState } = React;
const bfmt = (n) => n.toLocaleString("fr-FR");

// [code, libellé, sens P/C, prévision, réalisé, compteLié]
const POSTES = [
  ["706100", "Recette de transport", "P", 60000000, 38500000, "706"],
  ["701100", "Recette de vente", "P", 18000000, 9200000, "701"],
  ["601100", "Achat de marchandises", "C", 9500000, 5100000, "601"],
  ["624200", "Charge de réparation", "C", 2430000, 1980000, "624"],
  ["605300", "Achat de carburant", "C", 16000000, 12400000, "605"],
  ["605600", "Achat de lubrifiant", "C", 4760000, 2300000, "605"],
  ["605200", "Électricité", "C", 1230000, 690000, "605"],
  ["605100", "Eau", "C", 840000, 410000, "605"],
  ["607500", "Fourniture de bureau", "C", 290000, 150000, "605"],
  ["625200", "Assurance", "C", 4000000, 4000000, "625"],
  ["621000", "Frais de communication", "C", 544000, 300000, "628"],
  ["638400", "Frais de mission", "C", 1100000, 540000, "638"],
  ["660000", "Charge de personnel", "C", 21867000, 12800000, "661"],
  ["671200", "Charge financière", "C", 700000, 350000, "671"],
  ["631000", "Frais bancaires", "C", 78000, 44000, "631"],
];

// barre de consommation colorée (mi-exercice ≈ 58 %)
function ConsoBar({ prev, real }) {
  const pct = prev ? Math.min(100, Math.round((real / prev) * 100)) : 0;
  const col = pct >= 95 ? "var(--danger)" : pct >= 80 ? "#d98a00" : "var(--accent)";
  return (
    <div className="flex center g8">
      <div style={{ flex: 1, height: 9, background: "var(--fill-2)", borderRadius: 6, overflow: "hidden", minWidth: 60 }}>
        <div style={{ width: pct + "%", height: "100%", background: col }} />
      </div>
      <span className="mono small" style={{ color: col, minWidth: 34, textAlign: "right" }}>{pct}%</span>
    </div>
  );
}

function NewPosteDrawer({ open, onClose }) {
  const [sens, setSens] = useBState("C");
  const [rep, setRep] = useBState("egale");
  return (
    <div className="drawer-wrap" style={{ pointerEvents: open ? "auto" : "none" }}>
      <div className="drawer-scrim" onClick={onClose} style={{ opacity: open ? 1 : 0 }} />
      <div className="drawer" style={{ transform: open ? "translateX(0)" : "translateX(102%)" }}>
        <div className="flex center g8"><span className="b" style={{ fontSize: "1.2em" }}>Nouveau poste budgétaire</span><div className="grow" /><span onClick={onClose} style={{ cursor: "pointer" }} className="muted">✕</span></div>

        <div className="col g6 mt12">
          <span className="small b">Sens</span>
          <div className="modeseg"><button className={sens === "P" ? "on" : ""} onClick={() => setSens("P")}>Produit (recette)</button><button className={sens === "C" ? "on" : ""} onClick={() => setSens("C")}>Charge (dépense)</button></div>
        </div>

        <div className="grid mt12" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="col g6"><span className="small b">Libellé</span><div className="sk" style={{ padding: "9px 11px", background: "var(--panel)" }}>Achat de carburant</div></div>
          <div className="col g6"><span className="small b">Prévision annuelle</span><div className="sk" style={{ padding: "9px 11px", background: "var(--panel)" }}><span className="mono">16 000 000</span></div></div>
        </div>

        <div className="card mt12" style={{ padding: 12 }}>
          <div className="flex center g8"><span className="small b">Compte lié</span><div className="grow" /><span className="chip ai" style={{ fontSize: ".7em" }}>✦ suggéré</span></div>
          <div className="mono b mt8">605 — Autres achats (carburant)</div>
          <span className="muted small">c'est ce lien qui alimente l'écart en temps réel</span>
        </div>

        <div className="col g6 mt12">
          <span className="small b">Répartition sur l'année</span>
          {[["egale", "Égale (÷ 12)", "même objectif chaque mois"], ["saison", "Saisonnalité", "pondère selon l'activité (haute/basse saison)"], ["manuel", "Manuelle", "mois par mois"]].map((o) => (
            <div key={o[0]} className="card flex center g10" style={{ padding: "8px 11px", cursor: "pointer", borderColor: rep === o[0] ? "var(--accent)" : undefined, background: rep === o[0] ? "var(--accent-soft)" : undefined }} onClick={() => setRep(o[0])}>
              <span className="icon-sq" style={{ width: 22, height: 22 }}>{rep === o[0] ? "●" : "○"}</span>
              <div className="col"><span className="small b">{o[1]}</span><span className="muted small">{o[2]}</span></div>
            </div>
          ))}
          {rep === "egale" && <div className="annotation annot small">≈ 1 333 333 / mois — l'équivalent du bouton « Répartir » de Sage</div>}
          {rep === "saison" && <div className="annotation annot small">✦ DaCompta propose une courbe selon l'historique — impossible dans Sage</div>}
        </div>

        <div className="flex g8 mt12"><span className="btn primary" style={{ flex: 1, justifyContent: "center" }}>Créer le poste</span><Btn>Annuler</Btn></div>
      </div>
    </div>
  );
}

function BudgetWorkspace({ onNew }) {
  const [showReal, setShowReal] = useBState(true);
  const [view, setView] = useBState("Tous");

  const prod = POSTES.filter((p) => p[2] === "P");
  const charge = POSTES.filter((p) => p[2] === "C");
  const totP = prod.reduce((s, p) => s + p[3], 0);
  const totC = charge.reduce((s, p) => s + p[3], 0);
  const rows = POSTES.filter((p) => view === "Tous" || (view === "Produits" ? p[2] === "P" : p[2] === "C"));

  return (
    <div className="main" style={{ padding: 18 }}>
      {/* synthèse */}
      <div className="grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="card kpi"><div className="v" style={{ color: "var(--accent)" }}>{bfmt(totP)}</div><div className="k">Produits prévus</div></div>
        <div className="card kpi"><div className="v">{bfmt(totC)}</div><div className="k">Charges prévues</div></div>
        <div className="card kpi"><div className="v">{bfmt(totP - totC)}</div><div className="k">Résultat prévisionnel</div></div>
      </div>

      {/* toolbar */}
      <div className="flex center g10" style={{ marginTop: 12 }}>
        <div className="modeseg">
          {["Tous", "Produits", "Charges"].map((v) => <button key={v} className={view === v ? "on" : ""} onClick={() => setView(v)}>{v}</button>)}
        </div>
        <div className="grow" />
        <span className="small muted">Réalisations</span>
        <div className="modeseg"><button className={!showReal ? "on" : ""} onClick={() => setShowReal(false)}>Début d'année</button><button className={showReal ? "on" : ""} onClick={() => setShowReal(true)}>En cours</button></div>
        <span className="btn primary" style={{ cursor: "pointer" }} onClick={onNew}>＋ Nouveau poste</span>
      </div>

      {/* table */}
      <Card style={{ padding: 0, marginTop: 12 }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Poste</th><th>Sens</th><th className="num">Prévision</th><th className="num">/ mois</th>
              {showReal && <th className="num">Réalisé</th>}
              {showReal && <th style={{ width: 150 }}>Consommé</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => (
              <tr key={i}>
                <td><span className="b">{p[1]}</span> <span className="muted small mono">· {p[0]} → {p[5]}</span></td>
                <td>{p[2] === "P" ? <Chip kind="accent">Produit</Chip> : <Chip kind="fill">Charge</Chip>}</td>
                <td className="num mono">{bfmt(p[3])}</td>
                <td className="num mono muted small">{bfmt(Math.round(p[3] / 12))}</td>
                {showReal && <td className="num mono">{bfmt(p[4])}</td>}
                {showReal && <td><ConsoBar prev={p[3]} real={p[4]} /></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {showReal ? (
        <div className="card" style={{ marginTop: 12, padding: 12, borderColor: "var(--mark-edge)", background: "var(--mark)" }}>
          <div className="flex center g10">
            <span className="chip ai">✦ Alerte écart</span>
            <span className="small"><b>Assurance</b> consommée à 100 % et <b>carburant</b> à 78 % à mi-exercice — rythme à surveiller. La colonne <Mark>Réalisé se remplit toute seule</Mark> à chaque écriture sur le compte lié.</span>
          </div>
        </div>
      ) : (
        <Annot style={{ marginTop: 12 }}>Au départ la colonne « Réalisé » est vide — elle se remplira automatiquement, écriture après écriture (essayez « En cours »)</Annot>
      )}
    </div>
  );
}

Object.assign(window, { BudgetWorkspace, NewPosteDrawer });
