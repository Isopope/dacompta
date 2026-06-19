/* global React, Win, Card, Chip, Btn, Mark, Note, Annot, Ln */
// Flux « Régularisation de la TVA » — liquidation auto + écriture JOD (Sage vidéo 14)

const { useState: useTState } = React;
const tfmt = (n) => n.toLocaleString("fr-FR");

const FACTUREE = [
  ["443100", "TVA sur ventes", 580322],
  ["443200", "TVA sur prestations", 837702],
];
const RECUP = [
  ["445100", "TVA sur immobilisations", 6840000],
  ["445200", "TVA sur achats", 780892],
  ["445400", "TVA sur services", 4860],
];
const TOT_FAC = 1418024;
const TOT_REC = 7625752;
const CREDIT_TVA = 6207728; // récup > facturée → crédit de TVA

function TvaWorkspace() {
  const [done, setDone] = useTState(false);

  return (
    <div className="main" style={{ padding: 18 }}>
      <div className="flex center g10">
        <span className="b" style={{ fontSize: "1.15em" }}>Position TVA · Janvier 2020</span>
        <div className="grow" />
        <span className="chip ai" style={{ fontSize: ".75em" }}>✦ calculée automatiquement</span>
      </div>
      <Annot style={{ marginTop: 6 }}>Plus besoin d'éditer la balance et de relever les soldes à la main — DaCompta liquide la TVA tout seul</Annot>

      {/* position */}
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1.1fr", marginTop: 12 }}>
        <Card>
          <div className="card-h"><span className="t">TVA collectée</span><div className="grow" /><Chip kind="fill">443</Chip></div>
          {FACTUREE.map((r, i) => <div key={i} className="flex between small"><span className="muted mono">{r[0]} {r[1]}</span><span className="mono">{tfmt(r[2])}</span></div>)}
          <div className="flex between b mt8" style={{ borderTop: "1.5px dashed var(--fill-2)", paddingTop: 6 }}><span>Total dû à l'État</span><span className="mono">{tfmt(TOT_FAC)}</span></div>
        </Card>
        <Card>
          <div className="card-h"><span className="t">TVA déductible</span><div className="grow" /><Chip kind="fill">445</Chip></div>
          {RECUP.map((r, i) => <div key={i} className="flex between small"><span className="muted mono">{r[0]} {r[1]}</span><span className="mono">{tfmt(r[2])}</span></div>)}
          <div className="flex between b mt8" style={{ borderTop: "1.5px dashed var(--fill-2)", paddingTop: 6 }}><span>Total créance</span><span className="mono">{tfmt(TOT_REC)}</span></div>
        </Card>
        <Card style={{ borderColor: "var(--accent)", background: "var(--accent-soft)" }}>
          <div className="card-h"><span className="t">Résultat de la liquidation</span></div>
          <div className="small muted mono">{tfmt(TOT_FAC)} − {tfmt(TOT_REC)}</div>
          <div className="v b mono" style={{ fontSize: "1.7em", marginTop: 4 }}>{tfmt(CREDIT_TVA)}</div>
          <div className="mt8"><Chip kind="accent">Crédit de TVA</Chip></div>
          <div className="small mt8"><Mark>Rien à payer ce mois-ci</Mark> — l'État vous doit cette somme, reportable sur le mois suivant.</div>
        </Card>
      </div>

      {/* écriture de liquidation */}
      <Card style={{ padding: 0, marginTop: 14 }}>
        <div className="flex center g8" style={{ padding: "8px 12px", borderBottom: "2px solid var(--line)" }}>
          <span className="b">Écriture de liquidation</span><Chip kind="fill">JOD · 31/01</Chip>
          <span className="muted small">on solde chaque compte dans le sens opposé</span>
          <div className="grow" /><span className="chip ai" style={{ fontSize: ".7em" }}>✦ pré-générée</span>
        </div>
        <table className="tbl">
          <thead><tr><th>Compte</th><th>Libellé</th><th className="num">Débit</th><th className="num">Crédit</th></tr></thead>
          <tbody>
            {FACTUREE.map((r, i) => <tr key={"f" + i}><td className="mono b">{r[0]}</td><td>{r[1]} <span className="muted small">(soldé)</span></td><td className="num mono">{tfmt(r[2])}</td><td></td></tr>)}
            {RECUP.map((r, i) => <tr key={"r" + i}><td className="mono b">{r[0]}</td><td>{r[1]} <span className="muted small">(soldé)</span></td><td></td><td className="num mono">{tfmt(r[2])}</td></tr>)}
            <tr style={{ background: "var(--mark)" }}>
              <td className="mono b">444900</td>
              <td>État, crédit de TVA <span className="chip ai" style={{ fontSize: ".64em" }}>✦ équilibre</span></td>
              <td className="num mono">{tfmt(CREDIT_TVA)}</td><td></td>
            </tr>
          </tbody>
        </table>
        <div className="flex between center" style={{ padding: "8px 12px", borderTop: "2px solid var(--line)" }}>
          <span className="chip accent">⚖ Équilibrée · {tfmt(TOT_REC)} = {tfmt(TOT_REC)}</span>
          {!done
            ? <span className="btn primary" style={{ cursor: "pointer" }} onClick={() => setDone(true)}>Comptabiliser la régularisation</span>
            : <span className="chip accent">✓ Comptabilisée</span>}
        </div>
      </Card>

      {done && (
        <div className="card" style={{ marginTop: 12, padding: 12, borderColor: "var(--accent)", background: "var(--accent-soft)" }}>
          <div className="flex center g10">
            <span className="chip accent">✓ Après régularisation</span>
            <span className="small">Comptes 443 / 445 <b>remis à zéro</b> pour février. Seul <b className="mono">444900</b> reste ouvert (créance <b>{tfmt(CREDIT_TVA)}</b>). <Mark>Déclaration TVA prête à télétransmettre.</Mark></span>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { TvaWorkspace });
