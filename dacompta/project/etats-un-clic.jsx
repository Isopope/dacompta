/* global React, Win, Card, Chip, Btn, Mark, Note, Annot */
// Flux « États financiers en un clic » — feature stade Restitution
// Les écritures → bilan, CR, TAFIRE, balance, GL, journaux · export PDF/Excel format SYSCOHADA.
// Cas fil rouge : LES ASSOCIÉS SA (Lomé, Togo) — exercice 2020.

const { useState: useEtState } = React;
const ef = (n) => n.toLocaleString("fr-FR");

const ETATS_LIST = [
  ["▥", "Bilan", "situation patrimoniale", "bilan"],
  ["▤", "Compte de résultat", "performance de l'exercice", "resultat"],
  ["≈", "TAFIRE", "flux de ressources & emplois", "tafire"],
  ["≡", "Balance", "tous comptes, soldes N/N-1", "balance"],
  ["▦", "Grand livre", "détail des mouvements", "gl"],
  ["✎", "Notes annexes", "détail & règles", "annexes"],
];

// extrait de bilan condensé : [poste, N, N-1]
const BILAN = [
  ["Actif immobilisé", 24500000, 21000000],
  ["Actif circulant", 18200000, 15400000],
  ["Trésorerie-actif", 6300000, 4800000],
];
const BILAN_P = [
  ["Capitaux propres", 31860000, 25000000],
  ["Dettes financières", 9000000, 11200000],
  ["Passif circulant", 8140000, 5000000],
];

/* ============================== ÉTAPES ============================== */

// 1 — Source unique
function EtStep1() {
  return (
    <div className="col g16">
      <div>
        <h2 style={{ margin: 0 }}>Rien à fabriquer — tout vient des écritures</h2>
        <div className="muted">Pas de retraitement de fin d'année : les états se déduisent du grand livre, en temps réel.</div>
      </div>
      <Card fill className="flex center g12" style={{ padding: "14px 16px" }}>
        <span className="icon-sq" style={{ width: 38, height: 38 }}>▦</span>
        <div className="col" style={{ lineHeight: 1.2, flex: 1 }}>
          <span className="b">Grand livre — exercice 2020</span>
          <span className="muted small">~1 240 écritures · équilibré · clôturé</span>
        </div>
        <span className="chip accent">source unique</span>
      </Card>
      <div className="stepper" style={{ marginTop: 4 }}>
        <div className="step done"><span className="b">✓</span> Écritures</div><span className="step-line" />
        <div className="step done"><span className="b">✓</span> Balance</div><span className="step-line" />
        <div className="step active"><span className="b">3</span> États financiers</div>
      </div>
      <Annot>Le « retraitement de fin d'année » disparaît : c'est lui qui faisait soupirer les comptables.</Annot>
    </div>
  );
}

// 2 — Choisir l'état
function EtStep2({ sel, setSel }) {
  return (
    <div className="col g16">
      <div>
        <h2 style={{ margin: 0 }}>Choisissez l'état — il est déjà prêt</h2>
        <div className="muted">Format conforme au modèle officiel SYSCOHADA. Un clic, pas un assemblage.</div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        {ETATS_LIST.map((e, i) => (
          <div key={i} className={"card etatcard" + (e[3] === sel ? " on" : "")} onClick={() => setSel(e[3])}>
            <div className="flex center g8"><span className="icon-sq">{e[0]}</span><span className="b">{e[1]}</span></div>
            <span className="muted small">{e[2]}</span>
          </div>
        ))}
      </div>
      <div className="flex wrap g8">
        <Chip kind="ai">✦ généré instantanément</Chip>
        <Chip kind="fill">N / N-1 comparés</Chip>
        <Chip kind="fill">modèle officiel</Chip>
      </div>
    </div>
  );
}

// 3 — Aperçu (bilan)
function EtStep3() {
  const tA = BILAN.reduce((s, b) => s + b[1], 0);
  const tA1 = BILAN.reduce((s, b) => s + b[2], 0);
  const tP = BILAN_P.reduce((s, b) => s + b[1], 0);
  const tP1 = BILAN_P.reduce((s, b) => s + b[2], 0);
  return (
    <div className="col g16">
      <div>
        <h2 style={{ margin: 0 }}>Aperçu — Bilan SYSCOHADA</h2>
        <div className="muted">Exemple sur Les Associés SA. Actif = Passif, contrôlé automatiquement.</div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Card title="ACTIF">
          <table className="tbl">
            <thead><tr><th>Poste</th><th className="num">N</th><th className="num">N-1</th></tr></thead>
            <tbody>
              {BILAN.map((b, i) => <tr key={i}><td>{b[0]}</td><td className="num mono">{ef(b[1])}</td><td className="num mono muted">{ef(b[2])}</td></tr>)}
              <tr style={{ borderTop: "2px solid var(--line)" }}><td className="b">Total actif</td><td className="num mono b">{ef(tA)}</td><td className="num mono muted">{ef(tA1)}</td></tr>
            </tbody>
          </table>
        </Card>
        <Card title="PASSIF">
          <table className="tbl">
            <thead><tr><th>Poste</th><th className="num">N</th><th className="num">N-1</th></tr></thead>
            <tbody>
              {BILAN_P.map((b, i) => <tr key={i}><td>{b[0]}</td><td className="num mono">{ef(b[1])}</td><td className="num mono muted">{ef(b[2])}</td></tr>)}
              <tr style={{ borderTop: "2px solid var(--line)" }}><td className="b">Total passif</td><td className="num mono b">{ef(tP)}</td><td className="num mono muted">{ef(tP1)}</td></tr>
            </tbody>
          </table>
        </Card>
      </div>
      <div className="flex center g8"><Chip kind="accent">✓ Actif = Passif ({ef(tA)})</Chip><span className="annotation annot small">équilibre vérifié à la génération</span></div>
    </div>
  );
}

// 4 — Export
function EtStep4() {
  return (
    <div className="col g16">
      <div className="flex center g12">
        <span className="icon-sq" style={{ width: 40, height: 40, fontSize: "1.3em", background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" }}>✓</span>
        <div>
          <h2 style={{ margin: 0 }}>Exporté au format officiel</h2>
          <div className="annotation annot">PDF pour le dépôt, Excel pour retravailler</div>
        </div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Card className="flex center g10" style={{ padding: "13px 15px" }}>
          <span className="icon-sq" style={{ width: 34, height: 34 }}>▤</span>
          <div className="col" style={{ flex: 1, lineHeight: 1.2 }}><span className="b">PDF — modèle SYSCOHADA</span><span className="muted small">prêt pour la liasse DSF</span></div>
          <Btn sm kind="primary">↧ PDF</Btn>
        </Card>
        <Card className="flex center g10" style={{ padding: "13px 15px" }}>
          <span className="icon-sq" style={{ width: 34, height: 34 }}>▦</span>
          <div className="col" style={{ flex: 1, lineHeight: 1.2 }}><span className="b">Excel — détaillé</span><span className="muted small">retraitable, formules conservées</span></div>
          <Btn sm>↧ Excel</Btn>
        </Card>
      </div>
      <Card fill className="flex center g10" style={{ padding: "12px 14px" }}>
        <span className="chip ai">✦ cohérence</span>
        <span className="small">Mêmes chiffres que la liasse fiscale et le FEC — un seul jeu de données partout.</span>
        <div className="grow" />
        <a className="btn sm primary" href="DaCompta - Module Etats et documents.html">Module États & documents ↗</a>
      </Card>
    </div>
  );
}

const ETATS_STEPS = [
  { label: "Source : écritures", comp: EtStep1, note: "Concurrents : retraitement manuel de fin d'année. Ici : déduit du grand livre, en continu." },
  { label: "Choisir l'état", comp: EtStep2, note: "Concurrents : états assemblés à la main. Ici : un clic, modèle officiel." },
  { label: "Aperçu", comp: EtStep3, note: "Concurrents : équilibre vérifié après coup. Ici : Actif = Passif contrôlé à la génération." },
  { label: "Export", comp: EtStep4, note: "Concurrents : mise en forme refaite. Ici : PDF + Excel au format SYSCOHADA." },
];

Object.assign(window, { ETATS_STEPS });
