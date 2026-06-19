/* global React, Win, Card, Chip, Btn, Mark, Note, Annot, Ln */
// Flux « Journal de Banque » — BIMA 521100, contrepartie auto, emprunt 2 lignes, CCA (Sage vidéo 12)

const bqfmt = (n) => n.toLocaleString("fr-FR");

// pièces : {j, lines:[[compte, libellé, sens D/C, montant]], vir?, cca?}
const PIECES_BQ = [
  { j: 2, lines: [["4812JAP", "Rglt partiel sur achat de bus", "D", 21240000]] },
  { j: 5, lines: [["401INSA", "Rglt sur assurance des véhicules", "D", 3100000]] },
  { j: 22, vir: true, lines: [["585000", "Versement d'espèces (depuis caisse)", "C", 1300000]] },
  { j: 30, lines: [["631100", "Agios du mois", "D", 24500]] },
  { j: 30, cca: true, lines: [["4011NOT", "Paiement de 6 mois de loyer", "D", 600000]] },
  { j: 30, lines: [["162000", "Remboursement emprunt (capital)", "D", 700000], ["671200", "Intérêts des emprunts", "D", 125000]] },
];
const BQ_TOT = 26840500;
const BQ_OPEN = 15000000;
const BQ_BALS = (() => { let b = BQ_OPEN; return PIECES_BQ.map(p => { const sumD = p.lines.reduce((s,l) => s + (l[2]==="D"?l[3]:0),0); const sumC = p.lines.reduce((s,l) => s + (l[2]==="C"?l[3]:0),0); b += sumC - sumD; return b; }); })();

function BanqueWorkspace() {
  return (
    <div className="main" style={{ padding: 18 }}>
      <div className="flex center g10">
        <span className="b" style={{ fontSize: "1.15em" }}>Journal BQLA · Janvier 2020</span>
        <Chip kind="accent">521100 — Banque BIMA</Chip>
        <div className="grow" />
        <span className="chip ai" style={{ fontSize: ".75em" }}>✦ contrepartie automatique</span>
      </div>
      <Annot style={{ marginTop: 6 }}>On ne tape que le tiers / compte concerné — la banque 521100 se génère seule (fusionnée s'il y a plusieurs lignes)</Annot>

      <Card style={{ padding: 0, marginTop: 12 }}>
        <table className="tbl">
          <thead><tr><th>J</th><th>Compte / Tiers</th><th>Libellé</th><th className="num">Débit</th><th className="num">Crédit</th><th className="num">Solde banque</th></tr></thead>
          <tbody>
            {PIECES_BQ.map((p, i) => {
              const sumD = p.lines.reduce((s, l) => s + (l[2] === "D" ? l[3] : 0), 0);
              const sumC = p.lines.reduce((s, l) => s + (l[2] === "C" ? l[3] : 0), 0);
              const bankD = sumC > sumD ? sumC - sumD : 0; // banque débit si encaissement
              const bankC = sumD > sumC ? sumD - sumC : 0;
              return (
                <React.Fragment key={i}>
                  {p.lines.map((l, k) => (
                    <tr key={k} style={k === 0 ? { borderTop: "2px solid var(--line)" } : null}>
                      <td className="mono small">{k === 0 ? p.j : ""}</td>
                      <td className="mono b">{l[0]}{p.vir && k === 0 ? <span className="muted small"> · virement</span> : ""}</td>
                      <td>{l[1]}
                        {p.cca && k === 0 ? <span className="chip ai" style={{ fontSize: ".64em", marginLeft: 6 }}>✦ payé d'avance</span> : ""}
                        {p.lines.length > 1 && k === p.lines.length - 1 ? <span className="chip fill" style={{ fontSize: ".62em", marginLeft: 6 }}>capital + intérêts</span> : ""}
                      </td>
                      <td className="num mono">{l[2] === "D" ? bqfmt(l[3]) : ""}</td>
                      <td className="num mono">{l[2] === "C" ? bqfmt(l[3]) : ""}</td>
                    {k === 0 && p.lines.length === 1 ? <td></td> : k === 0 && p.lines.length > 1 ? <td></td> : <td></td>}
                    </tr>
                  ))}
                  <tr style={{ background: "var(--mark)" }}>
                    <td></td>
                    <td className="mono b">521100 <span className="chip ai" style={{ fontSize: ".64em" }}>✦ auto{p.lines.length > 1 ? " · fusionnée" : ""}</span></td>
                    <td className="muted small">Banque BIMA — contrepartie</td>
                    <td className="num mono">{bankD ? bqfmt(bankD) : ""}</td>
                    <td className="num mono">{bankC ? bqfmt(bankC) : ""}</td>
                    <td className="num mono" style={{ color: BQ_BALS[i] < 0 ? "var(--danger)" : "var(--accent)", fontWeight: 700 }}>{bqfmt(BQ_BALS[i])}</td>
                  </tr></td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* pièce justificative */}
      <div className="flex center g10" style={{ marginTop: 12 }}>
        <PieceSlot name="FA-BIMA-0130.pdf" type="Relevé bancaire · 48 Ko" ocr />
        <PieceSlot empty />
      </div>
      <Annot style={{ marginTop: 6 }}>Relevé, avis de débit, bordereau : la pièce bancaire est rattachée à l'écriture pour le rapprochement et l'audit</Annot>

      {/* alerte IA : charge constatée d'avance */}
      <div className="card" style={{ marginTop: 12, padding: 12, borderColor: "var(--mark-edge)", background: "var(--mark)" }}>
        <div className="flex center g10">
          <span className="chip ai">✦ Régularisation détectée</span>
          <span className="small">Le <b>loyer de 6 mois</b> (600 000) couvre des mois à venir. DaCompta propose l'écriture de <Mark>charges constatées d'avance (476)</Mark> pour ne rattacher que la quote-part de janvier — conforme SYSCOHADA.</span>
          <div className="grow" />
          <span className="btn primary sm">Voir l'abonnement</span>
        </div>
      </div>

      {/* brouillard */}
      <div className="card" style={{ marginTop: 12, padding: "12px 16px", borderColor: "var(--accent)", background: "var(--accent-soft)" }}>
        <div className="flex center g16 wrap">
          <span className="chip accent">⚖ Brouillard équilibré</span>
          <div className="col"><span className="muted small">Total Débit</span><span className="b mono" style={{ fontSize: "1.2em" }}>{bqfmt(BQ_TOT)}</span></div>
          <span className="muted">=</span>
          <div className="col"><span className="muted small">Total Crédit</span><span className="b mono" style={{ fontSize: "1.2em" }}>{bqfmt(BQ_TOT)}</span></div>
          <div className="grow" />
          <span className="muted small">solde 0,00 · rapprochement bancaire activé sur ce journal</span>
        </div>
      </div>
      <div className="annotation annot small" style={{ marginTop: 8 }}>Total de contrôle de la période (toutes pièces) · le journal BIMA est coché « rapprochement » pour les pointages à venir</div>
    </div>
  );
}

Object.assign(window, { BanqueWorkspace });
