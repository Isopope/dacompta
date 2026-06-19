/* global React, Win, Card, Chip, Btn, Mark, Note, Annot, Kpi */
// Flux « IA Anomalies » — détection automatique des incohérences comptables
// Doublons, comptes mal imputés, écritures sans pièce, montants inhabituels.
// Pilier 2 IA. Cas fil rouge : LES ASSOCIÉS SA (Lomé, Togo).

const { useState: useAnState } = React;
const anf = (n) => n.toLocaleString("fr-FR");

// anomalies détectées : [sévérité, type, description, journal, montant, action, statut]
const ANOMALIES = [
  ["haute", "Sans pièce", "Écriture OD du 15/01 sans pièce justificative rattachée", "JOD", 450000, "Joindre la pièce ou justifier", "ouverte"],
  ["haute", "Doublon", "Facture FA-118 (SODIM) saisie deux fois — même montant, même date", "ACH", 495600, "Supprimer le doublon", "ouverte"],
  ["moyenne", "Imputation", "Charge 605300 (carburant) imputée en classe 2 (immo) — probable erreur de compte", "ACH", 322146, "Reclasser en 605300", "ouverte"],
  ["moyenne", "Montant", "Écriture caisse du 19/01 : 1 115 000 FCFA — 3× la moyenne des encaissements", "CAI", 1115000, "Vérifier le justificatif", "corrigée"],
  ["basse", "Lettrage", "Compte 411DIV (clients divers) non lettré depuis 45 jours — solde 412 000", "VTE", 412000, "Lettrer ou relancer", "ouverte"],
  ["basse", "Sans pièce", "Écriture d'abonnement CCA du 30/01 sans scan du contrat", "BQ", 600000, "Joindre le contrat de bail", "ouverte"],
];

const SEV = { haute: { color: "var(--danger)", bg: "color-mix(in srgb, var(--danger) 12%, white)", label: "Haute" }, moyenne: { color: "#a8810a", bg: "var(--mark)", label: "Moyenne" }, basse: { color: "var(--ink-3)", bg: "var(--fill)", label: "Basse" } };

/* ============================== ÉTAPES ============================== */

// 1 — Le scan tourne en continu
function AnStep1() {
  return (
    <div className="col g16">
      <div>
        <h2 style={{ margin: 0 }}>L'IA scanne en continu — pas en fin d'exercice</h2>
        <div className="muted">Chaque écriture est vérifiée au moment de la saisie et en arrière-plan. Les anomalies remontent avant qu'elles ne se cumulent.</div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <Kpi v="1 240" k="écritures scannées" trend="exercice 2020 — 100 %" />
        <Kpi v="6" k="anomalies détectées" trend="4 ouvertes · 1 corrigée · 1 ignorée" />
        <Kpi v="99,5 %" k="taux de conformité" trend="objectif cabinet : > 99 %" />
      </div>
      <Card fill className="flex center g10" style={{ padding: "12px 14px" }}>
        <span className="chip ai">✦ temps réel</span>
        <span className="small">Pas de « batch » de fin d'année : une anomalie détectée le 15 janvier est signalée le 15 janvier — pas en décembre.</span>
      </Card>
      <Annot>Fini le stress de la révision de clôture : les incohérences sont traitées au fil de l'eau.</Annot>
    </div>
  );
}

// 2 — Types d'anomalies
function AnStep2() {
  const types = [
    ["📎", "Sans pièce justificative", "Écriture sans document rattaché — non conforme SYSCOHADA", "haute"],
    ["⊘", "Doublon", "Même montant, même date, même tiers — probable double saisie", "haute"],
    ["↯", "Mauvaise imputation", "Compte de la mauvaise classe (charge en immo, etc.)", "moyenne"],
    ["⚡", "Montant inhabituel", "Écriture > 3× la moyenne du journal — à justifier", "moyenne"],
    ["⇄", "Lettrage en retard", "Compte de tiers non lettré depuis > 30 jours", "basse"],
    ["⏲", "Échéance dépassée", "Facture fournisseur échue non réglée", "basse"],
  ];
  return (
    <div className="col g16">
      <div>
        <h2 style={{ margin: 0 }}>Ce que l'IA sait détecter</h2>
        <div className="muted">Six familles d'anomalies, classées par sévérité. Chacune a une action corrective proposée.</div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        {types.map((t, i) => (
          <div key={i} className="card flex g12" style={{ padding: "13px 15px", alignItems: "flex-start", borderColor: SEV[t[3]].color, background: SEV[t[3]].bg }}>
            <span className="icon-sq" style={{ fontSize: "1.1em" }}>{t[0]}</span>
            <div className="col" style={{ flex: 1, lineHeight: 1.2 }}>
              <span className="b">{t[1]}</span>
              <span className="muted small" style={{ marginTop: 2 }}>{t[2]}</span>
            </div>
            <span style={{ fontSize: ".78em", padding: "2px 9px", borderRadius: "200px", background: SEV[t[3]].bg, border: "1.5px solid " + SEV[t[3]].color, color: SEV[t[3]].color }}>{SEV[t[3]].label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 3 — Tableau de bord
function AnStep3({ sel, setSel }) {
  return (
    <div className="col g16">
      <div>
        <h2 style={{ margin: 0 }}>Tableau de bord des anomalies — exercice 2020</h2>
        <div className="muted">Chaque ligne est cliquable. L'IA propose une action ; le comptable tranche.</div>
      </div>
      <Card style={{ padding: 0 }}>
        <table className="tbl">
          <thead><tr><th>Sévérité</th><th>Type</th><th>Description</th><th>Journal</th><th className="num">Montant</th><th>Statut</th></tr></thead>
          <tbody>
            {ANOMALIES.map((a, i) => (
              <tr key={i} onClick={() => setSel(i)} style={{ cursor: "pointer", background: i === sel ? "var(--accent-soft)" : a[6] === "corrigée" ? "var(--fill)" : undefined, opacity: a[6] === "corrigée" ? 0.6 : 1 }}>
                <td><span style={{ fontSize: ".78em", padding: "2px 9px", borderRadius: "200px", background: SEV[a[0]].bg, border: "1.5px solid " + SEV[a[0]].color, color: SEV[a[0]].color }}>{SEV[a[0]].label}</span></td>
                <td className="b">{a[1]}</td>
                <td className="small">{a[2]}</td>
                <td><span className="chip fill small">{a[3]}</span></td>
                <td className="num mono">{anf(a[4])}</td>
                <td>{a[6] === "corrigée" ? <span className="chip accent small">✓ corrigée</span> : <span className="chip warn small">ouverte</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// 4 — Correction assistée
function AnStep4({ sel }) {
  const a = ANOMALIES[sel] || ANOMALIES[0];
  return (
    <div className="col g16">
      <div>
        <h2 style={{ margin: 0 }}>Correction assistée — {a[1]}</h2>
        <div className="muted">{a[2]}</div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Card title="L'anomalie" style={{ borderColor: SEV[a[0]].color }}>
          <div className="col g8">
            <div className="flex between"><span className="muted">Journal</span><span className="chip fill">{a[3]}</span></div>
            <div className="flex between"><span className="muted">Montant</span><span className="mono b">{anf(a[4])} FCFA</span></div>
            <div className="flex between"><span className="muted">Sévérité</span><span style={{ color: SEV[a[0]].color }} className="b">{SEV[a[0]].label}</span></div>
          </div>
        </Card>
        <Card title="Action proposée" right={<Chip kind="ai">✦ suggestion IA</Chip>}>
          <p style={{ margin: 0, lineHeight: 1.5 }}>{a[5]}</p>
          <div className="flex g10 mt12">
            <Btn kind="primary">✓ Appliquer</Btn>
            <Btn>Ignorer (justifier)</Btn>
          </div>
        </Card>
      </div>
      <Card fill className="flex center g10" style={{ padding: "12px 14px" }}>
        <span className="chip ai">✦ apprentissage</span>
        <span className="small">Chaque correction ou ignoré entraîne le modèle : les faux positifs diminuent exercice après exercice.</span>
      </Card>
    </div>
  );
}

const ANOM_STEPS = [
  { label: "Scan continu", comp: AnStep1, note: "Concurrents : anomalies découvertes à la clôture. Ici : détectées en temps réel." },
  { label: "Types d'anomalies", comp: AnStep2, note: "Concurrents : contrôle manuel. Ici : 6 familles classées par sévérité." },
  { label: "Tableau de bord", comp: AnStep3, note: "Concurrents : listing Excel en fin d'année. Ici : tableau vivant, cliquable." },
  { label: "Correction assistée", comp: AnStep4, note: "Concurrents : correction aveugle. Ici : action proposée par l'IA, le comptable tranche." },
];

Object.assign(window, { ANOM_STEPS });
