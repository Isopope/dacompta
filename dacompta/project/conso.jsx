/* global React, Win, Card, Chip, Btn, Mark, Note, Annot */
// Flux « Consolidation multi-entités » — backlog #4
// Groupe multi-pays OHADA : périmètre → monnaie de présentation → agrégation & éliminations → états consolidés.
// Stade Restitution (niveau groupe). Cas fil rouge : LES ASSOCIÉS HOLDING (Lomé).

const { useState: useCoState } = React;
const cf = (n) => n.toLocaleString("fr-FR");

// entités : [nom, pays, devise, %, méthode, résultat net (devise locale)]
const ENTITES = [
  ["Les Associés SA", "Togo", "XOF", 100, "Intégration globale", 18500000],
  ["Associés CI", "Côte d'Ivoire", "XOF", 80, "Intégration globale", 9200000],
  ["Associés Cameroun", "Cameroun", "XAF", 60, "Intégration globale", 6000000],
  ["Participations SARL", "Togo", "XOF", 30, "Mise en équivalence", 2000000],
];

// éliminations intra-groupe
const ELIM = [
  ["Marge sur ventes internes", -3000000, "TG → CI · stock non écoulé"],
  ["Dividendes internes", -1200000, "remontés à la holding"],
  ["Créances / dettes réciproques", 0, "neutralisées au bilan"],
];

// calculs
const integ = ENTITES.filter(e => e[4].startsWith("Intégration"));
const cumulRN = integ.reduce((s, e) => s + e[5], 0); // 100% des intégrées
const totalElim = ELIM.reduce((s, e) => s + e[1], 0);
const miseEq = Math.round(2000000 * 0.30); // quote-part 30%
const resultatEnsemble = cumulRN + totalElim + miseEq;
const minoritaires =
  Math.round(9200000 * 0.20) + // CI 20%
  Math.round(6000000 * 0.40);  // CM 40%
const resultatGroupe = resultatEnsemble - minoritaires;
const TAUX_XAF = 1.000; // parité XOF/XAF actuelle

/* ============================== ÉTAPES ============================== */

// 1 — Périmètre du groupe
function CnStep1() {
  return (
    <div className="col g16">
      <div>
        <h2 style={{ margin: 0 }}>Périmètre de consolidation</h2>
        <div className="muted">Les filiales sont déjà des dossiers DaCompta. On définit le taux de détention et la méthode — le reste suit.</div>
      </div>
      <Card>
        <table className="tbl">
          <thead><tr><th>Entité</th><th>Pays</th><th>Devise</th><th className="num">% détention</th><th>Méthode</th></tr></thead>
          <tbody>
            {ENTITES.map((e, i) => (
              <tr key={i}>
                <td className="b">{e[0]}</td>
                <td>{e[1]}</td>
                <td><span className={"chip small " + (e[2] === "XAF" ? "warn" : "fill")}>{e[2]}</span></td>
                <td className="num mono">{e[3]} %</td>
                <td><span className={"chip small " + (e[4].startsWith("Intégration") ? "accent" : "")}>{e[4]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div className="flex wrap g8">
        <Chip kind="accent">3 entités intégrées</Chip>
        <Chip kind="fill">1 mise en équivalence</Chip>
        <Chip kind="warn">1 entité en XAF à convertir</Chip>
        <Chip kind="ai">✦ méthode déduite du % — modifiable</Chip>
      </div>
      <Annot>Holding « Les Associés Holding » à Lomé — trois pays OHADA, deux zones monétaires.</Annot>
    </div>
  );
}

// 2 — Monnaie de présentation & conversion
function CnStep2() {
  return (
    <div className="col g16">
      <div>
        <h2 style={{ margin: 0 }}>Monnaie de présentation & conversion</h2>
        <div className="muted">On choisit la devise des comptes consolidés. Les entités d'une autre zone sont converties au taux de clôture.</div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Card title="Devise de présentation">
          <div className="sk" style={{ padding: "10px 14px", background: "var(--accent-soft)", borderColor: "var(--accent)" }}>
            <div className="b">FRANC CFA — XOF</div><div className="muted small">BCEAO · devise de la holding (Togo)</div>
          </div>
          <div className="flex center g8 mt12 wrap">
            <span className="chip">XAF</span><span className="chip">EUR</span><span className="chip">USD</span>
            <span className="muted small">autres choix possibles</span>
          </div>
        </Card>
        <Card title="Conversion des entités XAF" right={<Chip kind="warn">zone CEMAC</Chip>}>
          <table className="tbl">
            <tbody>
              <tr><td>Associés Cameroun</td><td className="num mono">{cf(6000000)} XAF</td></tr>
              <tr><td>Taux de clôture XAF → XOF</td><td className="num mono">{TAUX_XAF.toFixed(3)}</td></tr>
              <tr style={{ borderTop: "2px solid var(--line)" }}><td className="b">Converti</td><td className="num mono b">{cf(6000000)} XOF</td></tr>
            </tbody>
          </table>
          <Annot style={{ marginTop: 8 }}>XOF et XAF sont à parité (1,000) aujourd'hui — mais DaCompta les traite comme deux devises distinctes et gère l'écart de conversion si le taux décroche.</Annot>
        </Card>
      </div>
    </div>
  );
}

// 3 — Agrégation & éliminations
function CnStep3() {
  return (
    <div className="col g16">
      <div>
        <h2 style={{ margin: 0 }}>Agrégation & éliminations intra-groupe</h2>
        <div className="muted">On cumule les comptes, puis on neutralise les opérations internes — sinon le groupe se vend à lui-même.</div>
      </div>
      <Card title="Du cumul au résultat d'ensemble">
        <table className="tbl">
          <tbody>
            <tr><td className="b">Cumul des résultats (entités intégrées)</td><td className="num mono b">{cf(cumulRN)}</td></tr>
            {ELIM.map((e, i) => (
              <tr key={i}>
                <td>{e[0]} <span className="muted small">· {e[2]}</span></td>
                <td className="num mono">{e[1] === 0 ? "—" : cf(e[1])}</td>
              </tr>
            ))}
            <tr><td>Quote-part mise en équivalence <span className="muted small">· Participations SARL 30 %</span></td><td className="num mono">+{cf(miseEq)}</td></tr>
            <tr style={{ borderTop: "2px solid var(--line)" }}><td className="b">Résultat d'ensemble consolidé</td><td className="num mono b" style={{ color: "var(--accent)" }}>{cf(resultatEnsemble)}</td></tr>
          </tbody>
        </table>
      </Card>
      <div className="flex wrap g8">
        <Chip kind="warn">éliminations {cf(totalElim)}</Chip>
        <Chip kind="ai">✦ opérations internes détectées automatiquement</Chip>
      </div>
    </div>
  );
}

// 4 — États consolidés
function CnStep4() {
  return (
    <div className="col g16">
      <div className="flex center g12">
        <span className="icon-sq" style={{ width: 40, height: 40, fontSize: "1.3em", background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" }}>✓</span>
        <div>
          <h2 style={{ margin: 0 }}>Comptes consolidés du groupe</h2>
          <div className="annotation annot">part du groupe et part des minoritaires séparées</div>
        </div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Card title="Répartition du résultat">
          <table className="tbl">
            <tbody>
              <tr><td>Résultat d'ensemble</td><td className="num mono">{cf(resultatEnsemble)}</td></tr>
              <tr><td>− Intérêts minoritaires <span className="muted small">CI 20 % · CM 40 %</span></td><td className="num mono">−{cf(minoritaires)}</td></tr>
              <tr style={{ borderTop: "2px solid var(--line)" }}><td className="b">Résultat — part du groupe</td><td className="num mono b" style={{ color: "var(--accent)" }}>{cf(resultatGroupe)}</td></tr>
            </tbody>
          </table>
        </Card>
        <Card title="Livrables consolidés">
          <div className="col g8">
            {[["▥", "Bilan consolidé"], ["▤", "Compte de résultat consolidé"], ["≈", "Tableau des flux consolidé"], ["✎", "Annexe — périmètre & méthodes"]].map((d, i) => (
              <div key={i} className="flex center g10">
                <span className="icon-sq" style={{ width: 26, height: 26 }}>{d[0]}</span>
                <span className="small b" style={{ flex: 1 }}>{d[1]}</span>
                <span className="chip accent small">✓</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card fill className="flex center g10" style={{ padding: "12px 14px" }}>
        <span className="chip ai">✦ traçabilité</span>
        <span className="small">Chaque montant consolidé pointe vers l'écriture de la filiale d'origine — audit du groupe sans ressaisie.</span>
        <div className="grow" />
        <a className="btn sm primary" href="DaCompta - Module Etats et documents.html">États & documents ↗</a>
      </Card>
    </div>
  );
}

const CONSO_STEPS = [
  { label: "Périmètre", comp: CnStep1,
    note: "Concurrents : pas de notion de groupe. Ici : périmètre multi-pays, méthode par taux de détention." },
  { label: "Monnaie & conversion", comp: CnStep2,
    note: "Concurrents : XOF et XAF mélangés. Ici : devise de présentation choisie, conversion au taux de clôture." },
  { label: "Agrégation & éliminations", comp: CnStep3,
    note: "Concurrents : éliminations oubliées, groupe gonflé. Ici : opérations internes détectées et neutralisées." },
  { label: "États consolidés", comp: CnStep4,
    note: "Concurrents : consolidation refaite sur Excel. Ici : part du groupe / minoritaires, traçable jusqu'à la filiale." },
];

Object.assign(window, { CONSO_STEPS });
