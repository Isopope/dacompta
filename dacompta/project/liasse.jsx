/* global React, Win, Card, Chip, Btn, Mark, Note, Annot, Kpi */
// Flux « Liasse fiscale & retenues » — backlog #2
// IBS (impôt sur les bénéfices) annuel + retenues à la source (ITS / IRPP) par salarié.
// Stade Fiscal & Clôture — prolonge Révision & Clôture + Journal de Paie.
// Cas fil rouge : LES ASSOCIÉS SA (Lomé, Togo) — exercice 2020.

const { useState: useLState } = React;

const fmt = (n) => n.toLocaleString("fr-FR");

// réintégrations / déductions : [libellé, montant, sens('+'|'-'), note]
const RETRAIT = [
  ["Amendes & pénalités", 350000, "+", "non déductibles (art. 92 CGI)"],
  ["Charges somptuaires", 600000, "+", "véhicule de tourisme"],
  ["Provisions non déductibles", 250000, "+", "provision pour risque non justifiée"],
  ["Reprise de provision taxée", 200000, "-", "déjà imposée l'an passé"],
];
const RESULTAT_COMPTA = 18500000;
const reint = RETRAIT.filter(r => r[2] === "+").reduce((s, r) => s + r[1], 0);
const dedu = RETRAIT.filter(r => r[2] === "-").reduce((s, r) => s + r[1], 0);
const RESULTAT_FISCAL = RESULTAT_COMPTA + reint - dedu;
const TAUX_IS = 0.27;            // Togo — sociétés
const IS_THEO = Math.round(RESULTAT_FISCAL * TAUX_IS);
const CA = 240000000;
const IMF = Math.round(CA * 0.01); // minimum forfaitaire 1% du CA
const IS_DU = Math.max(IS_THEO, IMF);
const ACOMPTES = 3800000;
const SOLDE_IS = IS_DU - ACOMPTES;

// salariés : [nom, poste, brut, its]
const SALARIES = [
  ["A. MENSAH", "Directeur", 1200000, 312000],
  ["K. ADJOVI", "Comptable", 650000, 118000],
  ["F. DOSSEH", "Chauffeur", 320000, 28000],
  ["P. AGBOKA", "Magasinier", 280000, 21000],
];
const TOT_BRUT = SALARIES.reduce((s, e) => s + e[2], 0);
const TOT_ITS = SALARIES.reduce((s, e) => s + e[3], 0);

/* ============================== ÉTAPES ============================== */

// 1 — Point de départ : d'où viennent les chiffres
function LStep1() {
  const src = [
    ["⛗", "Résultat comptable de l'exercice", fmt(RESULTAT_COMPTA) + " FCFA", "issu de la balance après inventaire", "DaCompta - Flux Révision & Clôture.html", "Révision & Clôture"],
    ["GR", "Masse salariale & retenues", fmt(TOT_BRUT) + " FCFA brut", "agrégée depuis le journal de paie", "DaCompta - Flux Journal de Paie.html", "Journal de Paie"],
    ["%", "TVA & acomptes déjà versés", fmt(ACOMPTES) + " FCFA", "acomptes IS payés dans l'exercice", "DaCompta - Flux Régularisation TVA.html", "Régularisation TVA"],
  ];
  return (
    <div className="col g16">
      <div>
        <h2 style={{ margin: 0 }}>Point de départ — tout est déjà dans DaCompta</h2>
        <div className="muted">Aucune ressaisie : la liasse part des chiffres produits par les flux courants. On vérifie, on n'invente pas.</div>
      </div>
      <div className="col g10">
        {src.map((s, i) => (
          <a key={i} href={s[4]} className="card srccard flex center g12" style={{ padding: "13px 15px", textDecoration: "none", color: "inherit" }}>
            <span className="icon-sq">{s[0]}</span>
            <div className="col" style={{ lineHeight: 1.2, flex: 1 }}>
              <span className="b">{s[1]}</span>
              <span className="muted small">{s[3]} · <span className="chip fill small">{s[5]} ↗</span></span>
            </div>
            <span className="mono b">{s[2]}</span>
          </a>
        ))}
      </div>
      <Annot>Le comptable passait des heures sur Excel à recoller ces sources. Ici elles sont reliées, datées, traçables.</Annot>
    </div>
  );
}

// 2 — Résultat fiscal (réintégrations / déductions)
function LStep2() {
  return (
    <div className="col g16">
      <div>
        <h2 style={{ margin: 0 }}>Du résultat comptable au résultat fiscal</h2>
        <div className="muted">DaCompta propose les retraitements usuels ; le comptable garde la main sur chaque ligne.</div>
      </div>
      <Card>
        <table className="tbl">
          <thead><tr><th>Retraitement extra-comptable</th><th>Sens</th><th className="num">Montant</th><th>Justification</th></tr></thead>
          <tbody>
            <tr><td className="b">Résultat comptable</td><td></td><td className="num mono b">{fmt(RESULTAT_COMPTA)}</td><td className="muted small">base de départ</td></tr>
            {RETRAIT.map((r, i) => (
              <tr key={i}>
                <td>{r[0]}</td>
                <td><span className={"chip small " + (r[2] === "+" ? "warn" : "accent")}>{r[2] === "+" ? "réintégr." : "déduction"}</span></td>
                <td className="num mono">{r[2]}{fmt(r[1])}</td>
                <td className="muted small">{r[3]}</td>
              </tr>
            ))}
            <tr style={{ borderTop: "2px solid var(--line)" }}>
              <td className="b">Résultat fiscal</td><td></td>
              <td className="num mono b" style={{ color: "var(--accent)" }}>{fmt(RESULTAT_FISCAL)}</td>
              <td className="muted small">assiette de l'IBS</td>
            </tr>
          </tbody>
        </table>
      </Card>
      <div className="flex wrap g8">
        <Chip kind="warn">+ {fmt(reint)} réintégrations</Chip>
        <Chip kind="accent">− {fmt(dedu)} déductions</Chip>
        <Chip kind="ai">✦ retraitements suggérés — modifiables</Chip>
      </div>
    </div>
  );
}

// 3 — Calcul de l'IBS + écriture
function LStep3() {
  const isMin = IS_DU === IMF;
  return (
    <div className="col g16">
      <div>
        <h2 style={{ margin: 0 }}>Calcul de l'IBS & écriture d'impôt</h2>
        <div className="muted">Taux du pays, minimum forfaitaire comparé, acomptes déduits — le solde et l'écriture sont générés.</div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "1.15fr .85fr" }}>
        <Card title="Liquidation de l'impôt">
          <table className="tbl">
            <tbody>
              <tr><td>Résultat fiscal</td><td className="num mono">{fmt(RESULTAT_FISCAL)}</td></tr>
              <tr><td>IS théorique <span className="muted small">(× 27 % — Togo)</span></td><td className="num mono">{fmt(IS_THEO)}</td></tr>
              <tr><td>Minimum forfaitaire (IMF) <span className="muted small">1 % du CA</span></td><td className="num mono">{fmt(IMF)}</td></tr>
              <tr><td className="b">IBS dû <span className="muted small">(le plus élevé)</span></td><td className="num mono b" style={{ color: "var(--accent)" }}>{fmt(IS_DU)}</td></tr>
              <tr><td>− Acomptes déjà versés</td><td className="num mono">−{fmt(ACOMPTES)}</td></tr>
              <tr style={{ borderTop: "2px solid var(--line)" }}><td className="b">Solde à payer</td><td className="num mono b">{fmt(SOLDE_IS)}</td></tr>
            </tbody>
          </table>
          {isMin && <Annot style={{ marginTop: 8 }}>Ici c'est le minimum forfaitaire qui s'applique — DaCompta le signale.</Annot>}
        </Card>
        <Card title="Écriture générée" right={<Chip kind="ai">✦ auto</Chip>}>
          <table className="tbl">
            <thead><tr><th>Compte</th><th className="num">Débit</th><th className="num">Crédit</th></tr></thead>
            <tbody>
              <tr><td className="mono small">891 — Impôt s/ bénéfices</td><td className="num mono small">{fmt(IS_DU)}</td><td></td></tr>
              <tr><td className="mono small">441 — État, impôt s/ bénéf.</td><td></td><td className="num mono small">{fmt(IS_DU)}</td></tr>
            </tbody>
          </table>
          <div className="docslot" style={{ marginTop: 10, padding: 12 }}>
            <div className="flex center g8"><span className="chip">JOD</span><span className="small b">Journal des OD fiscales</span></div>
            <span className="muted small">Passée à la clôture · solde {fmt(SOLDE_IS)} reporté en dette 441.</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

// 4 — Retenues à la source par salarié
function LStep4() {
  return (
    <div className="col g16">
      <div>
        <h2 style={{ margin: 0 }}>Retenues à la source — par salarié</h2>
        <div className="muted">ITS / IRPP calculés au barème, ventilés par employé, prêts au reversement mensuel à la DGI.</div>
      </div>
      <Card>
        <table className="tbl">
          <thead><tr><th>Salarié</th><th>Poste</th><th className="num">Brut</th><th className="num">ITS retenu</th><th className="num">Net</th></tr></thead>
          <tbody>
            {SALARIES.map((e, i) => (
              <tr key={i}>
                <td className="b">{e[0]}</td>
                <td className="muted small">{e[1]}</td>
                <td className="num mono">{fmt(e[2])}</td>
                <td className="num mono" style={{ color: "var(--accent)" }}>{fmt(e[3])}</td>
                <td className="num mono">{fmt(e[2] - e[3])}</td>
              </tr>
            ))}
            <tr style={{ borderTop: "2px solid var(--line)" }}>
              <td className="b" colSpan={2}>Total à reverser</td>
              <td className="num mono b">{fmt(TOT_BRUT)}</td>
              <td className="num mono b" style={{ color: "var(--accent)" }}>{fmt(TOT_ITS)}</td>
              <td className="num mono">{fmt(TOT_BRUT - TOT_ITS)}</td>
            </tr>
          </tbody>
        </table>
      </Card>
      <div className="flex wrap g8 center">
        <Chip kind="fill">447 — État, impôts retenus à la source</Chip>
        <Chip kind="fill">Reversement le 15 du mois suivant</Chip>
        <Chip kind="ai">✦ barème ITS Togo appliqué</Chip>
      </div>
      <Annot>Chaque salarié a son détail — fini le tableur ITS recalculé à la main tous les mois.</Annot>
    </div>
  );
}

// 5 — Liasse & télédéclaration
function LStep5() {
  const decl = [
    ["Déclaration IBS annuelle", "Solde " + fmt(SOLDE_IS) + " FCFA", "format DGI"],
    ["Bordereau ITS / retenues", fmt(TOT_ITS) + " FCFA", "mensuel"],
    ["Liasse DSF", "Bilan · Résultat · TAFIRE · annexes", "dépôt annuel"],
  ];
  return (
    <div className="col g16">
      <div className="flex center g12">
        <span className="icon-sq" style={{ width: 40, height: 40, fontSize: "1.3em", background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" }}>✓</span>
        <div>
          <h2 style={{ margin: 0 }}>Liasse prête — exports au format de l'administration</h2>
          <div className="annotation annot">IBS, retenues et DSF cohérents entre eux, sans double saisie</div>
        </div>
      </div>
      <div className="col g10">
        {decl.map((d, i) => (
          <div key={i} className="card flex center g12" style={{ padding: "12px 15px" }}>
            <span className="icon-sq">▤</span>
            <div className="col" style={{ lineHeight: 1.2, flex: 1 }}>
              <span className="b">{d[0]}</span>
              <span className="muted small">{d[1]}</span>
            </div>
            <span className="chip fill small">{d[2]}</span>
            <Btn sm>↧ Exporter</Btn>
          </div>
        ))}
      </div>
      <Card fill className="flex center g10" style={{ padding: "12px 14px" }}>
        <span className="chip ai">✦ cohérence</span>
        <span className="small">Le solde IBS et les retenues alimentent le bilan via le module États — un seul jeu de chiffres, partout.</span>
        <div className="grow" />
        <a className="btn sm primary" href="DaCompta - Module Etats et documents.html">États & documents ↗</a>
      </Card>
    </div>
  );
}

const LIASSE_STEPS = [
  { label: "Point de départ", comp: LStep1,
    note: "Concurrents : on recolle résultat, paie et acomptes à la main sur Excel. Ici : sources reliées et traçables." },
  { label: "Résultat fiscal", comp: LStep2,
    note: "Concurrents : retraitements oubliés ou faux. Ici : réintégrations / déductions suggérées et justifiées." },
  { label: "Calcul IBS", comp: LStep3,
    note: "Concurrents : IMF et acomptes gérés de tête. Ici : minimum forfaitaire comparé, écriture générée." },
  { label: "Retenues ITS / IRPP", comp: LStep4,
    note: "Concurrents : un tableur ITS recalculé chaque mois. Ici : barème par salarié, prêt au reversement." },
  { label: "Liasse & dépôt", comp: LStep5,
    note: "Concurrents : ressaisie sur le portail fiscal. Ici : exports au format DGI, cohérents avec la DSF." },
];

Object.assign(window, { LIASSE_STEPS });
