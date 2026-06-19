/* global React, Win, Card, Chip, Btn, Mark, Note, Annot, Kpi */
// Flux « IA Conseil » — recommandations, optimisation fiscale, alertes réglementaires
// Pilier 2 IA. Cas fil rouge : LES ASSOCIÉS SA (Lomé, Togo).

const { useState: useCsState } = React;
const csf = (n) => n.toLocaleString("fr-FR");

// recommandations actives : [catégorie, icône, titre, détail, impact, action, priorité]
const RECOS = [
  ["Fiscal", "⚡", "Acompte IS sous-estimé", "L'acompte trimestriel IS versé (950 000) est inférieur de 22 % au quart du résultat fiscal projeté. Risque de pénalité de retard.", "Pénalité évitée ~250 000 FCFA", "Ajuster l'acompte Q2", "haute"],
  ["Fiscal", "%", "TVA déductible non récupérée", "3 factures d'immobilisation (FA-002, FA-003, FA-017) éligibles à la TVA déductible sur immo n'ont pas été imputées sur 445100.", "TVA à récupérer : 1 240 000 FCFA", "Reclasser en 445100", "haute"],
  ["Réglementaire", "⏲", "Échéance DSF dans 45 jours", "La liasse statistique et fiscale (DSF) du Togo doit être déposée avant le 30 avril. 2 états ne sont pas encore finalisés.", "Conformité DGI", "Finaliser TAFIRE + annexes", "moyenne"],
  ["Optimisation", "↘", "Amortissement accéléré possible", "Le bus C (245100-BUSC) est éligible à l'amortissement dégressif fiscal (art. 18 CGI Togo). Économie d'IS sur 3 ans.", "Économie IS ~680 000 FCFA", "Basculer en dégressif", "moyenne"],
  ["Trésorerie", "⇄", "Excédent de trésorerie non placé", "Le solde banque BIMA dépasse 12 M FCFA depuis 30 jours sans placement. Coût d'opportunité à taux directeur BCEAO.", "Rendement potentiel ~180 000 FCFA/an", "Placer en DAT", "basse"],
  ["Social", "GR", "Contrat CDD bientôt à requalifier", "Le CDD de F. Dosseh (chauffeur) atteint 23 mois — le seuil OHADA de 24 mois déclenche la requalification en CDI.", "Risque social", "Renouveler ou passer en CDI", "moyenne"],
];

const PRIO = { haute: { color: "var(--danger)", bg: "color-mix(in srgb, var(--danger) 12%, white)" }, moyenne: { color: "#a8810a", bg: "var(--mark)" }, basse: { color: "var(--ink-3)", bg: "var(--fill)" } };
const CAT_ICO = { Fiscal: "%", Réglementaire: "§", Optimisation: "↘", Trésorerie: "⇄", Social: "GR" };

/* ============================== ÉTAPES ============================== */

function CsStep1() {
  return (
    <div className="col g16">
      <div>
        <h2 style={{ margin: 0 }}>L'IA lit vos comptes comme un expert-comptable</h2>
        <div className="muted">DaCompta analyse en permanence les écritures, les échéances et le contexte fiscal du pays pour produire des recommandations concrètes.</div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <Kpi v="6" k="recommandations actives" trend="2 hautes · 3 moyennes · 1 basse" />
        <Kpi v="~2,3M" k="impact financier total" trend="économies, pénalités évitées, rendement" />
        <Kpi v="3" k="catégories concernées" trend="fiscal · réglementaire · optimisation" />
      </div>
      <Annot>Le comptable ne fouille plus dans la loi : DaCompta remonte les sujets qui comptent, au bon moment.</Annot>
    </div>
  );
}

function CsStep2({ sel, setSel }) {
  return (
    <div className="col g16">
      <div>
        <h2 style={{ margin: 0 }}>Recommandations — par priorité</h2>
        <div className="muted">Chaque recommandation est liée à un chiffre du dossier et à une règle du pays. Cliquez pour le détail.</div>
      </div>
      <div className="col g10">
        {RECOS.map((r, i) => (
          <div key={i} className="card flex g12" onClick={() => setSel(i)} style={{ padding: "13px 15px", cursor: "pointer", alignItems: "flex-start", borderColor: i === sel ? "var(--accent)" : undefined, background: i === sel ? "var(--accent-soft)" : undefined }}>
            <span className="icon-sq">{r[1]}</span>
            <div className="col" style={{ flex: 1, lineHeight: 1.25 }}>
              <div className="flex center g8"><span className="chip fill small">{r[0]}</span><span className="b">{r[2]}</span></div>
              <span className="muted small" style={{ marginTop: 2 }}>{r[3]}</span>
            </div>
            <span style={{ fontSize: ".78em", padding: "2px 9px", borderRadius: "200px", background: PRIO[r[6]].bg, border: "1.5px solid " + PRIO[r[6]].color, color: PRIO[r[6]].color }}>{r[6]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CsStep3({ sel }) {
  const r = RECOS[sel] || RECOS[0];
  return (
    <div className="col g16">
      <div>
        <h2 style={{ margin: 0 }}>{r[2]}</h2>
        <div className="muted">{r[0]} · priorité {r[6]}</div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Card title="Le constat">
          <p style={{ margin: 0, lineHeight: 1.5 }}>{r[3]}</p>
          <div className="flex center g8 mt12"><span className="chip accent">{r[4]}</span></div>
        </Card>
        <Card title="Action recommandée" right={<Chip kind="ai">✦ conseil IA</Chip>}>
          <p style={{ margin: 0, lineHeight: 1.5, fontFamily: "var(--note-font)", fontSize: "1.2em", color: "var(--accent)" }}>→ {r[5]}</p>
          <div className="flex g10 mt12">
            <Btn kind="primary">✓ Appliquer</Btn>
            <Btn>Reporter</Btn>
            <Btn kind="ghost">Ignorer</Btn>
          </div>
        </Card>
      </div>
    </div>
  );
}

function CsStep4() {
  return (
    <div className="col g16">
      <div className="flex center g12">
        <span className="icon-sq" style={{ width: 40, height: 40, fontSize: "1.3em", background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" }}>✓</span>
        <div>
          <h2 style={{ margin: 0 }}>Suivi des recommandations</h2>
          <div className="annotation annot">chaque conseil est tracé — appliqué, reporté ou justifié</div>
        </div>
      </div>
      <Card>
        <table className="tbl">
          <thead><tr><th>Recommandation</th><th>Impact</th><th>Statut</th></tr></thead>
          <tbody>
            {RECOS.map((r, i) => (
              <tr key={i}><td className="b">{r[2]}</td><td className="small">{r[4]}</td><td>{i === 3 ? <span className="chip accent small">✓ appliquée</span> : i === 4 ? <span className="chip fill small">reportée</span> : <span className="chip warn small">en attente</span>}</td></tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card fill className="flex center g10" style={{ padding: "12px 14px" }}>
        <span className="chip ai">✦ proactif</span>
        <span className="small">Les recommandations évoluent avec l'exercice : en fin de trimestre l'IA insiste sur les acomptes, en fin d'année sur la clôture et la DSF.</span>
      </Card>
    </div>
  );
}

const CONSEIL_STEPS = [
  { label: "Vue d'ensemble", comp: CsStep1, note: "Concurrents : aucun conseil. Ici : recommandations chiffrées, contextualisées par pays." },
  { label: "Recommandations", comp: CsStep2, note: "Concurrents : le comptable cherche seul. Ici : 6 sujets classés par priorité." },
  { label: "Détail & action", comp: CsStep3, note: "Concurrents : constat sans action. Ici : action concrète proposée, un clic." },
  { label: "Suivi", comp: CsStep4, note: "Concurrents : pas de mémoire. Ici : chaque conseil tracé — appliqué, reporté, justifié." },
];

Object.assign(window, { CONSEIL_STEPS });
