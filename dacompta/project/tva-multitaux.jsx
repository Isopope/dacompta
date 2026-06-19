/* global React, Win, Card, Chip, Btn, Mark, Note, Annot */
// Flux « TVA multi-taux & cas particuliers » — feature stade Saisie/Fiscal
// Ventilation 4431 par taux + régimes (marge, autoliquidation, exonéré).
// Enrichit le flux Régularisation TVA. Cas fil rouge : LES ASSOCIÉS SA (Lomé).

const { useState: useTvState } = React;
const tf = (n) => n.toLocaleString("fr-FR");

const REGIMES = [
  ["Taux normal", "18 %", "ventes standard", "accent"],
  ["Taux réduit", "selon pays", "produits de première nécessité", "fill"],
  ["Exonéré", "0 %", "export, secteurs exemptés", "fill"],
  ["Autoliquidation", "reverse", "import de services / prestataire étranger", "warn"],
  ["TVA sur marge", "sur marge", "biens d'occasion", "warn"],
];

// facture mixte : [libellé, HT, taux, tva]
const MIXTE = [
  ["Pièces détachées (taxé)", 800000, "18 %", 144000],
  ["Pièces exportées (exonéré)", 300000, "0 %", 0],
  ["Service de pose (taxé)", 200000, "18 %", 36000],
];

/* ============================== ÉTAPES ============================== */

// 1 — Régimes
function TvStep1({ reg, setReg }) {
  return (
    <div className="col g16">
      <div>
        <h2 style={{ margin: 0 }}>Une seule TVA ? Rarement.</h2>
        <div className="muted">Un dossier réel mélange les taux et les régimes. DaCompta les gère par ligne, pas par dossier.</div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(2,1fr)" }}>
        {REGIMES.map((r, i) => (
          <div key={i} className={"card regcard" + (i === reg ? " on" : "")} onClick={() => setReg(i)}>
            <div className="flex center g8"><span className={"chip small " + r[3]}>{r[1]}</span><span className="b">{r[0]}</span>{i === reg && <><div className="grow" /><span className="chip accent">✓</span></>}</div>
            <span className="muted small">{r[2]}</span>
          </div>
        ))}
      </div>
      <Annot>Le régime se choisit à la ligne de facture — le compte 4431 se ventile tout seul derrière.</Annot>
    </div>
  );
}

// 2 — Ventilation 4431 par taux
function TvStep2() {
  const totHT = MIXTE.reduce((s, m) => s + m[1], 0);
  const totTVA = MIXTE.reduce((s, m) => s + m[3], 0);
  return (
    <div className="col g16">
      <div>
        <h2 style={{ margin: 0 }}>Facture mixte → 4431 ventilé par taux</h2>
        <div className="muted">Une même facture, plusieurs régimes. La TVA collectée est éclatée par taux pour la déclaration.</div>
      </div>
      <Card>
        <table className="tbl">
          <thead><tr><th>Ligne de facture</th><th className="num">Base HT</th><th>Taux</th><th className="num">TVA</th></tr></thead>
          <tbody>
            {MIXTE.map((m, i) => (
              <tr key={i}><td className="b">{m[0]}</td><td className="num mono">{tf(m[1])}</td><td><span className={"chip small " + (m[2] === "0 %" ? "fill" : "accent")}>{m[2]}</span></td><td className="num mono">{m[3] ? tf(m[3]) : "—"}</td></tr>
            ))}
            <tr style={{ borderTop: "2px solid var(--line)" }}><td className="b">Total facture</td><td className="num mono b">{tf(totHT)}</td><td></td><td className="num mono b" style={{ color: "var(--accent)" }}>{tf(totTVA)}</td></tr>
          </tbody>
        </table>
      </Card>
      <div className="flex wrap g8">
        <Chip kind="accent">4431.18 — TVA 18 % : {tf(totTVA)}</Chip>
        <Chip kind="fill">4431.00 — exonéré : 0</Chip>
        <Chip kind="ai">✦ sous-comptes par taux</Chip>
      </div>
    </div>
  );
}

// 3 — Cas particulier : autoliquidation
function TvStep3() {
  return (
    <div className="col g16">
      <div>
        <h2 style={{ margin: 0 }}>Cas particulier — autoliquidation à l'import</h2>
        <div className="muted">Prestation d'un fournisseur étranger : l'entreprise collecte ET déduit la TVA. DaCompta passe les deux côtés.</div>
      </div>
      <Card title="Service importé · 1 000 000 HT (18 %)" right={<Chip kind="warn">autoliquidation</Chip>}>
        <table className="tbl">
          <thead><tr><th>Compte</th><th>Libellé</th><th className="num">Débit</th><th className="num">Crédit</th></tr></thead>
          <tbody>
            <tr><td className="mono small">6271</td><td className="small">Frais de prestation</td><td className="num mono small">1 000 000</td><td></td></tr>
            <tr><td className="mono small">4452</td><td className="small">TVA déductible</td><td className="num mono small">180 000</td><td></td></tr>
            <tr><td className="mono small">4011</td><td className="small">Fournisseur étranger</td><td></td><td className="num mono small">1 000 000</td></tr>
            <tr><td className="mono small">4431</td><td className="small">TVA collectée (autoliq.)</td><td></td><td className="num mono small">180 000</td></tr>
          </tbody>
        </table>
        <Annot style={{ marginTop: 8 }}>Effet neutre en trésorerie : la TVA collectée et déduite s'annulent — mais elle doit figurer dans la déclaration.</Annot>
      </Card>
    </div>
  );
}

// 4 — Déclaration mensuelle pré-remplie
function TvStep4() {
  return (
    <div className="col g16">
      <div className="flex center g12">
        <span className="icon-sq" style={{ width: 40, height: 40, fontSize: "1.3em", background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" }}>✓</span>
        <div>
          <h2 style={{ margin: 0 }}>Déclaration TVA pré-remplie</h2>
          <div className="annotation annot">par taux et par régime, prête à télédéclarer</div>
        </div>
      </div>
      <Card>
        <table className="tbl">
          <tbody>
            <tr><td>TVA collectée (tous taux)</td><td className="num mono">360 000</td></tr>
            <tr><td>TVA déductible</td><td className="num mono">255 600</td></tr>
            <tr style={{ borderTop: "2px solid var(--line)" }}><td className="b">TVA à décaisser</td><td className="num mono b" style={{ color: "var(--accent)" }}>104 400</td></tr>
          </tbody>
        </table>
      </Card>
      <Card fill className="flex center g10" style={{ padding: "12px 14px" }}>
        <span className="chip ai">✦ continuité</span>
        <span className="small">La ventilation par taux alimente directement la liquidation mensuelle.</span>
        <div className="grow" />
        <a className="btn sm primary" href="DaCompta - Flux Régularisation TVA.html">Régularisation TVA ↗</a>
      </Card>
    </div>
  );
}

const TVA_STEPS = [
  { label: "Régimes de TVA", comp: TvStep1, note: "Concurrents : un taux par dossier. Ici : régime choisi à la ligne." },
  { label: "Ventilation 4431", comp: TvStep2, note: "Concurrents : 4431 global, déclaration fausse. Ici : sous-comptes par taux." },
  { label: "Autoliquidation", comp: TvStep3, note: "Concurrents : cas oublié ou mal passé. Ici : collecte + déduction automatiques." },
  { label: "Déclaration", comp: TvStep4, note: "Concurrents : recalcul manuel. Ici : déclaration pré-remplie par taux." },
];

Object.assign(window, { TVA_STEPS });
