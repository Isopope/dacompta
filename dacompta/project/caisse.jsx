/* global React, Win, Card, Chip, Btn, Mark, Note, Annot, Ln */
// Flux « Journal de Caisse » — contrepartie auto 571100 + solde débiteur (Sage vidéo 11)

const { useState: useCState } = React;
const cfmt = (n) => n.toLocaleString("fr-FR");

// {jour, compte/tiers, libellé, sens du compte saisi (D/C), montant, [vir]}
const PIECES_CAI = [
  [6, "411DIV", "Vente de tickets", "C", 1310980],
  [6, "4011SNP", "Achat de carburant", "D", 232838],
  [8, "4011BUR", "Fournitures de bureau", "D", 141600],
  [8, "4011FJA", "Règlement pièces détachées", "D", 2950236],
  [10, "4011SNP", "Achat de gasoil", "D", 322146],
  [19, "411FILS", "Règlement pour solde", "C", 1115000],
  [20, "411DIV", "Vente de tickets", "C", 1099052],
  [30, "585000", "Versement à la banque", "D", 1300000, true],
];
// totaux de contrôle de la période (source — incluent des pièces non détaillées)
const CAI_TOT = { d: 7608038, c: 1145052, solde: 6462986 };
const CAI_OPEN = 8000000;
const CAI_BALS = (() => { let b = CAI_OPEN; return PIECES_CAI.map(p => { b += (p[3] === "C" ? p[4] : -p[4]); return b; }); })();

function CaisseWorkspace() {
  return (
    <div className="main" style={{ padding: 18 }}>
      <div className="flex center g10">
        <span className="b" style={{ fontSize: "1.15em" }}>Journal CAI · Janvier 2020</span>
        <Chip kind="accent">571100 — Caisse siège</Chip>
        <div className="grow" />
        <span className="chip ai" style={{ fontSize: ".75em" }}>✦ contrepartie automatique</span>
      </div>
      <Annot style={{ marginTop: 6 }}>En trésorerie : on ne tape qu'une seule ligne par opération — la caisse 571100 se génère toute seule</Annot>

      <Card style={{ padding: 0, marginTop: 12 }}>
        <table className="tbl">
          <thead><tr><th>J</th><th>Compte / Tiers</th><th>Libellé</th><th className="num">Débit</th><th className="num">Crédit</th><th className="num">Solde caisse</th></tr></thead>
          <tbody>
            {PIECES_CAI.map((p, i) => {
              const typedD = p[3] === "D" ? p[4] : 0;
              const typedC = p[3] === "C" ? p[4] : 0;
              return (
                <React.Fragment key={i}>
                  <tr style={{ borderTop: "2px solid var(--line)" }}>
                    <td className="mono small">{p[0]}</td>
                    <td className="mono b">{p[1]}{!p[5] && <span className="muted small"> ▸</span>}{p[5] && <span className="muted small"> · virement</span>}</td>
                    <td>{p[2]}</td>
                    <td className="num mono">{typedD ? cfmt(typedD) : ""}</td>
                    <td className="num mono">{typedC ? cfmt(typedC) : ""}</td>
                    <td className="num mono" style={{ color: CAI_BALS[i] < 0 ? "var(--danger)" : "var(--accent)", fontWeight: 700 }}>{cfmt(CAI_BALS[i])}</td>
                  </tr>
                  <tr style={{ background: "var(--mark)" }}>
                    <td></td>
                    <td className="mono b">571100 <span className="chip ai" style={{ fontSize: ".64em" }}>✦ auto</span></td>
                    <td className="muted small">Caisse — contrepartie</td>
                    <td className="num mono">{typedC ? cfmt(typedC) : ""}</td>
                    <td className="num mono">{typedD ? cfmt(typedD) : ""}</td>
                    <td></td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* pièce justificative */}
      <div className="flex center g10" style={{ marginTop: 12 }}>
        <PieceSlot name="TIC-0106.pdf" type="Ticket de caisse · 12 Ko" ocr />
        <PieceSlot empty />
      </div>
      <Annot style={{ marginTop: 6 }}>Chaque opération de caisse reçoit sa pièce (ticket, reçu, photo) — rattachée à l'écriture, consultable depuis le grand livre</Annot>

      {/* solde de caisse */}
      <div className="grid" style={{ gridTemplateColumns: "repeat(3,1fr)", marginTop: 12 }}>
        <div className="card kpi"><div className="v mono" style={{ color: "var(--accent)" }}>{cfmt(CAI_TOT.d)}</div><div className="k">Entrées (débit caisse)</div></div>
        <div className="card kpi"><div className="v mono">{cfmt(CAI_TOT.c)}</div><div className="k">Sorties (crédit caisse)</div></div>
        <div className="card kpi" style={{ borderColor: "var(--accent)", background: "var(--accent-soft)" }}><div className="v mono">{cfmt(CAI_TOT.solde)}</div><div className="k">Solde débiteur ✓</div></div>
      </div>

      <div className="card" style={{ marginTop: 12, padding: 12 }}>
        <div className="flex center g10">
          <span className="chip accent">✓ Contrôle</span>
          <span className="small">Une caisse ne peut jamais être <b>créditrice</b> — on ne dépense pas plus d'espèces qu'on en détient. DaCompta <Mark>bloque et alerte</Mark> si le solde passe négatif, en temps réel. La colonne <b>Solde</b> rend l'anomalie visible <b>ligne par ligne</b>.</span>
        </div>
      </div>
      <div className="annotation annot small" style={{ marginTop: 8 }}>Totaux de période = toutes les pièces de caisse (certaines non détaillées ici) · contrôle 7 608 038 − 1 145 052 = 6 462 986</div>
    </div>
  );
}

Object.assign(window, { CaisseWorkspace });
