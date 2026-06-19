/* global React, Win, Card, Chip, Btn, Mark, Note, Annot, Ln */
// Flux « Journal de Paie » — engagement des salaires, tiers Salarié 422000 (Sage vidéo 13)

const pfmt = (n) => n.toLocaleString("fr-FR");

const CHARGES = [
  ["661100", "Appointements et salaires", 860000],
  ["663100", "Indemnité de logement", 140500],
  ["663400", "Indemnité de transport", 75000],
  ["664100", "Charges sociales patronales", 247365],
];
const RETENUES = [
  ["431100", "Caisse de retraite (part sal. + patr.)", 301140],
  ["447100", "Impôt général sur le revenu (IGR)", 56795],
];
const SALARIES = [
  ["422BAR", "Bari", 232100],
  ["422DES", "Despot", 154800],
  ["422DOU", "Dougla", 154800],
  ["422HOL", "Hola", 103200],
  ["422MAM", "Mama", 103200],
  ["422ABO", "Abou", 85570],
  ["422ELI", "Elina", 91160],
];
const PAIE_TOTAL = 1322865;

function PaieWorkspace() {
  return (
    <div className="main" style={{ padding: 18 }}>
      <div className="flex center g10">
        <span className="b" style={{ fontSize: "1.15em" }}>Journal PAI · pièce n°1</span>
        <Chip kind="fill">30/01/2020</Chip>
        <Chip kind="fill">Salaire du mois de janvier</Chip>
        <div className="grow" />
        <span className="chip ai" style={{ fontSize: ".75em" }}>✦ généré depuis le livre de paie</span>
      </div>
      <Annot style={{ marginTop: 6 }}>La paie est une écriture d'engagement : on constate la dette (le décaissement se fera via la banque)</Annot>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 12 }}>
        {/* DÉBIT — charges */}
        <Card style={{ padding: 0 }}>
          <div className="flex center g8" style={{ padding: "8px 12px", borderBottom: "2px solid var(--line)" }}><span className="chip fill">DÉBIT</span><span className="b">Ce que le personnel coûte</span></div>
          <table className="tbl">
            <tbody>
              {CHARGES.map((c, i) => (
                <tr key={i}><td className="mono b">{c[0]}</td><td>{c[1]}</td><td className="num mono">{pfmt(c[2])}</td></tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* CRÉDIT — retenues + nets */}
        <Card style={{ padding: 0 }}>
          <div className="flex center g8" style={{ padding: "8px 12px", borderBottom: "2px solid var(--line)" }}><span className="chip fill">CRÉDIT</span><span className="b">Ce qu'on doit reverser</span></div>
          <table className="tbl">
            <tbody>
              {RETENUES.map((r, i) => (
                <tr key={i}><td className="mono b">{r[0]}</td><td>{r[1]}</td><td className="num mono">{pfmt(r[2])}</td></tr>
              ))}
              <tr><td colSpan="3" className="muted small" style={{ paddingTop: 8 }}>Salaires nets — un tiers <b>Salarié</b> par employé (collectif <span className="mono">422000</span>)</td></tr>
              {SALARIES.map((s, i) => (
                <tr key={i} style={{ background: "var(--mark)" }}>
                  <td className="mono b">{s[0]}</td>
                  <td>{s[1]} <span className="chip ai" style={{ fontSize: ".62em" }}>✦ à la volée</span></td>
                  <td className="num mono">{pfmt(s[2])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {/* pièce justificative */}
      <div className="flex center g10" style={{ marginTop: 12 }}>
        <PieceSlot name="BUL-PAIE-JAN2020.pdf" type="Livre de paie · 120 Ko" ocr />
        <PieceSlot empty />
      </div>
      <Annot style={{ marginTop: 6 }}>Le livre de paie et les bulletins individuels sont rattachés à l'écriture d'engagement — piste d'audit complète</Annot>

      {/* équilibre */}
      <div className="card" style={{ marginTop: 12, padding: "12px 16px", borderColor: "var(--accent)", background: "var(--accent-soft)" }}>
        <div className="flex center g16 wrap">
          <span className="chip accent">⚖ Pièce équilibrée</span>
          <div className="col"><span className="muted small">Total Débit</span><span className="b mono" style={{ fontSize: "1.2em" }}>{pfmt(PAIE_TOTAL)}</span></div>
          <span className="muted">=</span>
          <div className="col"><span className="muted small">Total Crédit</span><span className="b mono" style={{ fontSize: "1.2em" }}>{pfmt(PAIE_TOTAL)}</span></div>
          <div className="grow" />
          <span className="muted small">solde 0,00 · partie double respectée</span>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12, padding: 12 }}>
        <div className="flex center g10">
          <span className="chip ai">✦ Suite automatique</span>
          <span className="small">Chaque salarié devient une <b>dette nominative</b> (422xxx) : DaCompta génère ensuite les <Mark>règlements individuels</Mark> (virement bancaire / Mobile Money) et solde le tiers au paiement.</span>
        </div>
      </div>
      <div className="annotation annot small" style={{ marginTop: 8 }}>Total de contrôle = 1 322 865 (les nets par salarié sont illustratifs — la source ne les réconcilie pas exactement)</div>
    </div>
  );
}

Object.assign(window, { PaieWorkspace });
