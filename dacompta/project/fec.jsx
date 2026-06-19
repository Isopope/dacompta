/* global React, Win, Card, Chip, Btn, Mark, Note, Annot */
// Flux « Export FEC par pays » — backlog #3
// Fichier des Écritures Comptables : sélection → contrôles → aperçu → export format admin.
// Stade Restitution — extension du module États & documents.
// Cas fil rouge : LES ASSOCIÉS SA (Lomé, Togo).

const { useState: useFecState } = React;

// formats FEC par administration
const FEC_FMT = {
  Togo: { admin: "DGI Togo", ext: ".txt", sep: "Tabulation", enc: "UTF-8", note: "format aligné FEC, adoption progressive OHADA" },
  "Côte d'Ivoire": { admin: "DGI Côte d'Ivoire", ext: ".txt", sep: "Pipe |", enc: "UTF-8", note: "contrôle fiscal informatisé" },
  Cameroun: { admin: "DGI Cameroun", ext: ".csv", sep: "Point-virgule", enc: "UTF-8", note: "télédéclaration DGE" },
  Sénégal: { admin: "DGID Sénégal", ext: ".txt", sep: "Tabulation", enc: "UTF-8", note: "format CGI sénégalais" },
};

// colonnes FEC normalisées
const FEC_COLS = ["JournalCode", "EcritureNum", "EcritureDate", "CompteNum", "CompteLib", "PieceRef", "Debit", "Credit"];
// lignes d'exemple (vente boutique + achat)
const FEC_ROWS = [
  ["VTE", "EC0001", "20200312", "5211", "Banque Wave", "TIC-0312", "100000", "0"],
  ["VTE", "EC0001", "20200312", "5711", "Caisse espèces", "TIC-0312", "150000", "0"],
  ["VTE", "EC0001", "20200312", "7011", "Ventes marchandises", "TIC-0312", "0", "211864"],
  ["VTE", "EC0001", "20200312", "4431", "TVA collectée", "TIC-0312", "0", "38136"],
  ["ACH", "EC0042", "20200318", "6011", "Achats marchandises", "FA-118", "420000", "0"],
  ["ACH", "EC0042", "20200318", "4452", "TVA déductible", "FA-118", "75600", "0"],
  ["ACH", "EC0042", "20200318", "4011", "Fournisseur SODIM", "FA-118", "0", "495600"],
];

// contrôles de conformité
const CHECKS = [
  ["Équilibre débit = crédit", "ok", "toutes les écritures équilibrées"],
  ["Séquence chronologique", "ok", "numéros continus, sans trou ni doublon"],
  ["Comptes valides (plan SYSCOHADA)", "ok", "712 comptes reconnus"],
  ["Champs obligatoires renseignés", "ok", "date, journal, pièce, libellé"],
  ["Écritures non validées", "warn", "2 brouillards à valider avant export"],
  ["Caractères & encodage", "ok", "UTF-8, séparateurs échappés"],
];

/* ============================== ÉTAPES ============================== */

// 1 — Sélection exercice + administration
function FStep1({ pays, setPays }) {
  const f = FEC_FMT[pays];
  return (
    <div className="col g16">
      <div>
        <h2 style={{ margin: 0 }}>Que veut le contrôle fiscal ?</h2>
        <div className="muted">Le FEC reprend toutes les écritures de l'exercice dans un format imposé par l'administration. DaCompta connaît le format de chaque pays.</div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Card title="Exercice à exporter">
          <div className="flex center g10">
            <span className="chip accent">Exercice 2020</span>
            <span className="muted small">01/01 → 31/12/2020 · clôturé</span>
          </div>
          <div className="flex wrap g8 mt12">
            <Chip kind="fill">Tous journaux</Chip>
            <Chip kind="fill">~1 240 écritures</Chip>
            <Chip kind="ai">✦ période ajustable</Chip>
          </div>
        </Card>
        <Card title="Administration / format" right={<Chip kind="ai">✦ par pays</Chip>}>
          <div className="flex wrap g8" style={{ marginBottom: 10 }}>
            {Object.keys(FEC_FMT).map((k) => (
              <span key={k} className={"chip" + (k === pays ? " accent" : "")} style={{ cursor: "pointer" }} onClick={() => setPays(k)}>{k}</span>
            ))}
          </div>
          <table className="tbl">
            <tbody>
              <tr><td className="muted small">Destinataire</td><td className="b">{f.admin}</td></tr>
              <tr><td className="muted small">Fichier</td><td className="mono">FEC_LesAssociesSA_2020{f.ext}</td></tr>
              <tr><td className="muted small">Séparateur</td><td>{f.sep} · {f.enc}</td></tr>
            </tbody>
          </table>
          <Annot style={{ marginTop: 8 }}>{f.note}</Annot>
        </Card>
      </div>
    </div>
  );
}

// 2 — Contrôles de conformité
function FStep2() {
  const okCount = CHECKS.filter(c => c[0 + 1] === "ok").length;
  return (
    <div className="col g16">
      <div>
        <h2 style={{ margin: 0 }}>Contrôles de conformité — avant d'exporter</h2>
        <div className="muted">DaCompta valide le fichier comme le ferait le vérificateur. Un FEC rejeté, c'est un contrôle qui dérape.</div>
      </div>
      <div className="col g8">
        {CHECKS.map((c, i) => (
          <div key={i} className="card flex center g12" style={{ padding: "11px 14px", borderColor: c[1] === "warn" ? "var(--danger)" : undefined }}>
            <span className="icon-sq" style={{ background: c[1] === "ok" ? "var(--accent)" : "var(--danger)", color: "#fff", borderColor: c[1] === "ok" ? "var(--accent)" : "var(--danger)" }}>{c[1] === "ok" ? "✓" : "!"}</span>
            <div className="col" style={{ lineHeight: 1.2, flex: 1 }}>
              <span className="b">{c[0]}</span>
              <span className="muted small">{c[2]}</span>
            </div>
            {c[1] === "ok" ? <span className="chip accent small">conforme</span> : <Btn sm>Corriger ↗</Btn>}
          </div>
        ))}
      </div>
      <div className="flex center g10">
        <Chip kind="accent">{okCount}/{CHECKS.length} contrôles passés</Chip>
        <span className="annotation annot small">Le seul point ouvert : 2 brouillards à valider — bloqué tant que ce n'est pas réglé.</span>
      </div>
    </div>
  );
}

// 3 — Aperçu du fichier
function FStep3({ pays }) {
  return (
    <div className="col g16">
      <div>
        <h2 style={{ margin: 0 }}>Aperçu du fichier généré</h2>
        <div className="muted">Une ligne par mouvement, colonnes normalisées. Exactement ce que l'administration lira.</div>
      </div>
      <Card style={{ overflowX: "auto" }}>
        <table className="tbl" style={{ fontSize: ".82em", minWidth: 640 }}>
          <thead><tr>{FEC_COLS.map((c, i) => <th key={i} className={i >= 6 ? "num" : ""}>{c}</th>)}</tr></thead>
          <tbody>
            {FEC_ROWS.map((r, i) => (
              <tr key={i}>
                {r.map((v, j) => <td key={j} className={"mono small" + (j >= 6 ? " num" : "")}>{v}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div className="flex center g10 wrap">
        <Chip kind="fill">{FEC_COLS.length} colonnes normalisées</Chip>
        <Chip kind="fill">2 écritures · 7 lignes affichées</Chip>
        <span className="annotation annot small">Vente boutique + achat fournisseur — extrait du fil rouge Les Associés SA.</span>
      </div>
    </div>
  );
}

// 4 — Export & traçabilité
function FStep4({ pays }) {
  const f = FEC_FMT[pays];
  return (
    <div className="col g16">
      <div className="flex center g12">
        <span className="icon-sq" style={{ width: 40, height: 40, fontSize: "1.3em", background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" }}>✓</span>
        <div>
          <h2 style={{ margin: 0 }}>FEC prêt pour {f.admin}</h2>
          <div className="annotation annot">généré, horodaté, archivé — opposable en cas de contrôle</div>
        </div>
      </div>
      <Card>
        <div className="flex center g12">
          <span className="icon-sq" style={{ width: 38, height: 38 }}>⛓</span>
          <div className="col" style={{ lineHeight: 1.2, flex: 1 }}>
            <span className="b mono">FEC_LesAssociesSA_2020{f.ext}</span>
            <span className="muted small">~1 240 lignes · {f.sep} · {f.enc} · 312 Ko</span>
          </div>
          <Btn kind="primary">↧ Télécharger</Btn>
        </div>
      </Card>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Card fill className="flex center g10" style={{ padding: "12px 14px" }}>
          <span className="chip">⏲ horodatage</span>
          <span className="small">Date de génération + empreinte (hash) conservées dans le journal d'export.</span>
        </Card>
        <Card fill className="flex center g10" style={{ padding: "12px 14px" }}>
          <span className="chip ai">✦ cohérence</span>
          <span className="small">Mêmes écritures que le bilan et la DSF — un FEC qui correspond aux états déposés.</span>
        </Card>
      </div>
      <div className="flex center g10" style={{ justifyContent: "center" }}>
        <a className="btn sm primary" href="DaCompta - Module Etats et documents.html">Module États & documents ↗</a>
      </div>
    </div>
  );
}

const FEC_STEPS = [
  { label: "Sélection & format", comp: FStep1,
    note: "Concurrents : aucun export FEC, ou un format unique inadapté. Ici : format reconnu par pays." },
  { label: "Contrôles", comp: FStep2,
    note: "Concurrents : on découvre les erreurs au rejet du fichier. Ici : contrôles avant export, comme le vérificateur." },
  { label: "Aperçu fichier", comp: FStep3,
    note: "Concurrents : fichier opaque. Ici : aperçu lisible, colonne par colonne." },
  { label: "Export & traçabilité", comp: FStep4,
    note: "Concurrents : fichier non daté, non archivé. Ici : horodaté, archivé, cohérent avec la DSF." },
];

Object.assign(window, { FEC_STEPS });
