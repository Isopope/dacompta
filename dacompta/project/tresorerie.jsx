/* global React, Win, Card, Chip, Btn, Mark, Note, Annot, Kpi, Bars */
// Flux « IA Trésorerie » — prévision de cash, alerte découvert, pilotage BFR
// Pilier 2 IA. Cas fil rouge : LES ASSOCIÉS SA (Lomé, Togo).

const { useState: useTrState } = React;
const trf = (n) => n.toLocaleString("fr-FR");

// prévision cash 6 semaines : [semaine, encaissements, décaissements, solde projeté]
const PREV = [
  ["S1 (actuel)", 3200000, 2800000, 15400000],
  ["S2", 2900000, 4100000, 14200000],
  ["S3", 3500000, 3200000, 14500000],
  ["S4 — Paie", 3100000, 6800000, 10800000],
  ["S5", 2800000, 2500000, 11100000],
  ["S6 — Acompte IS", 3000000, 5250000, 8850000],
];
const SEUIL_ALERTE = 10000000;

// alertes trésorerie
const ALERTES = [
  ["⚡", "Paie S4 — tension prévisible", "Le décaissement paie + charges sociales (6,8 M) fait passer le solde sous " + trf(SEUIL_ALERTE) + ". Anticiper un encaissement ou décaler un fournisseur.", "haute"],
  ["⚡", "Acompte IS S6 — creux de trésorerie", "L'acompte trimestriel IS (4,3 M) + charges courantes ramènent le solde à 8,85 M. Vérifier le placement DAT et les créances à relancer.", "haute"],
  ["⇄", "Créances > 30 j non encaissées", "3 factures clients (total 1 420 000 FCFA) sont échues depuis > 30 jours — relance automatique recommandée.", "moyenne"],
  ["↘", "BFR en hausse de 12 % sur 3 mois", "Le besoin en fonds de roulement augmente : stocks + créances progressent plus vite que les dettes fournisseurs.", "basse"],
];

const PRIO = { haute: { color: "var(--danger)", bg: "color-mix(in srgb, var(--danger) 12%, white)" }, moyenne: { color: "#a8810a", bg: "var(--mark)" }, basse: { color: "var(--ink-3)", bg: "var(--fill)" } };

/* ============================== ÉTAPES ============================== */

function TrStep1() {
  const soldeActuel = PREV[0][3];
  const soldeMin = Math.min(...PREV.map(p => p[3]));
  return (
    <div className="col g16">
      <div>
        <h2 style={{ margin: 0 }}>Trésorerie — situation et projection</h2>
        <div className="muted">DaCompta projette le cash sur 6 semaines à partir des écritures, des échéances fournisseurs et des encaissements attendus.</div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <Kpi v={trf(soldeActuel)} k="Solde actuel (banque + caisse)" />
        <Kpi v={trf(soldeMin)} k="Solde minimum projeté" trend={soldeMin < SEUIL_ALERTE ? "⚠ sous le seuil" : "✓ au-dessus du seuil"} />
        <Kpi v={trf(SEUIL_ALERTE)} k="Seuil d'alerte paramétré" />
        <Kpi v="2" k="Alertes actives" trend="semaines S4 et S6" />
      </div>
      <Annot>Le seuil d'alerte est configurable par dossier — ici 10 M FCFA, le minimum pour couvrir la paie + charges.</Annot>
    </div>
  );
}

function TrStep2() {
  return (
    <div className="col g16">
      <div>
        <h2 style={{ margin: 0 }}>Projection semaine par semaine</h2>
        <div className="muted">Chaque ligne est calculée à partir des échéances réelles (fournisseurs, paie, IS) et des encaissements prévus (clients, ventes).</div>
      </div>
      <Card style={{ padding: 0 }}>
        <table className="tbl">
          <thead><tr><th>Période</th><th className="num">Encaissements</th><th className="num">Décaissements</th><th className="num">Solde projeté</th></tr></thead>
          <tbody>
            {PREV.map((p, i) => (
              <tr key={i} style={{ background: p[3] < SEUIL_ALERTE ? "color-mix(in srgb, var(--danger) 8%, white)" : undefined }}>
                <td className="b">{p[0]}</td>
                <td className="num mono" style={{ color: "var(--accent)" }}>+{trf(p[1])}</td>
                <td className="num mono" style={{ color: "var(--danger)" }}>−{trf(p[2])}</td>
                <td className="num mono b" style={{ color: p[3] < SEUIL_ALERTE ? "var(--danger)" : "var(--accent)" }}>{trf(p[3])}{p[3] < SEUIL_ALERTE ? " ⚠" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Bars data={PREV.map(p => p[3])} h={80} />
      <Annot>Les semaines S4 (paie) et S6 (acompte IS) passent sous le seuil — signalées en rouge automatiquement.</Annot>
    </div>
  );
}

function TrStep3() {
  return (
    <div className="col g16">
      <div>
        <h2 style={{ margin: 0 }}>Alertes & actions recommandées</h2>
        <div className="muted">Chaque alerte est liée à un chiffre réel et propose une action concrète.</div>
      </div>
      <div className="col g10">
        {ALERTES.map((a, i) => (
          <div key={i} className="card flex g12" style={{ padding: "13px 15px", alignItems: "flex-start", borderColor: PRIO[a[3]].color, background: PRIO[a[3]].bg }}>
            <span className="icon-sq">{a[0]}</span>
            <div className="col" style={{ flex: 1, lineHeight: 1.3 }}>
              <span className="b">{a[1]}</span>
              <span className="muted small" style={{ marginTop: 2 }}>{a[2]}</span>
            </div>
            <span style={{ fontSize: ".78em", padding: "2px 9px", borderRadius: "200px", background: PRIO[a[3]].bg, border: "1.5px solid " + PRIO[a[3]].color, color: PRIO[a[3]].color }}>{a[3]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrStep4() {
  return (
    <div className="col g16">
      <div className="flex center g12">
        <span className="icon-sq" style={{ width: 40, height: 40, fontSize: "1.3em", background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" }}>✓</span>
        <div>
          <h2 style={{ margin: 0 }}>Pilotage BFR & décisions</h2>
          <div className="annotation annot">le dirigeant voit venir — pas de mauvaise surprise</div>
        </div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Card title="BFR du mois">
          <div className="col g8">
            <div className="flex between"><span>Créances clients</span><span className="mono b">4 820 000</span></div>
            <div className="flex between"><span>+ Stocks</span><span className="mono b">6 200 000</span></div>
            <div className="flex between"><span>− Dettes fournisseurs</span><span className="mono">−5 340 000</span></div>
            <div className="flex between" style={{ borderTop: "2px solid var(--line)", paddingTop: 6 }}><span className="b">BFR</span><span className="mono b" style={{ color: "var(--accent)" }}>5 680 000</span></div>
          </div>
          <Annot style={{ marginTop: 8 }}>BFR en hausse de 12 % → surveiller les stocks et relancer les clients</Annot>
        </Card>
        <Card title="Actions à prendre">
          <div className="col g8">
            <div className="flex center g10"><Btn kind="primary" sm>Relancer 3 clients</Btn><span className="small muted">1 420 000 FCFA échues</span></div>
            <div className="flex center g10"><Btn sm>Décaler fournisseur SODIM</Btn><span className="small muted">495 600 FCFA · échéance souple</span></div>
            <div className="flex center g10"><Btn sm>Débloquer le DAT</Btn><span className="small muted">placement arrivant à terme S5</span></div>
          </div>
        </Card>
      </div>
      <Card fill className="flex center g10" style={{ padding: "12px 14px" }}>
        <span className="chip ai">✦ prédictif</span>
        <span className="small">La projection s'affine avec l'historique : plus DaCompta a de données, plus les prévisions sont justes.</span>
        <div className="grow" />
        <a className="btn sm primary" href="DaCompta - Flux Journal de Banque.html">Journal de Banque ↗</a>
      </Card>
    </div>
  );
}

const TRESO_STEPS = [
  { label: "Situation & projection", comp: TrStep1, note: "Concurrents : solde figé. Ici : projection 6 semaines avec seuil d'alerte." },
  { label: "Cash semaine/semaine", comp: TrStep2, note: "Concurrents : relevé de banque. Ici : prévision dynamique, échéances réelles." },
  { label: "Alertes", comp: TrStep3, note: "Concurrents : découvert constaté trop tard. Ici : alerte anticipée avec action." },
  { label: "Pilotage BFR", comp: TrStep4, note: "Concurrents : BFR calculé en fin d'année. Ici : BFR vivant, actions concrètes." },
];

Object.assign(window, { TRESO_STEPS });
