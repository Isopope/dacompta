/* global React, Win, Card, Chip, Btn, Mark, Note, Annot */
// Flux « Configuration auto par pays » — backlog #1
// 17 pays OHADA → préchargement référentiel + fiscalité + calendrier + DSF
// Documente le stade A (Configuration) et ce qu'il alimente en aval.

const { useState: useCState } = React;

// [nom, code2, capitale, zone, devise label, devise code, tva, banque centrale]
const PAYS17 = [
  ["Bénin", "BJ", "Cotonou", "UEMOA", "FCFA", "XOF", "18 %", "BCEAO"],
  ["Burkina Faso", "BF", "Ouagadougou", "UEMOA", "FCFA", "XOF", "18 %", "BCEAO"],
  ["Cameroun", "CM", "Yaoundé", "CEMAC", "FCFA", "XAF", "19,25 %", "BEAC"],
  ["Centrafrique", "CF", "Bangui", "CEMAC", "FCFA", "XAF", "19 %", "BEAC"],
  ["Comores", "KM", "Moroni", "Autre", "Fr. comorien", "KMF", "10 %", "BCC"],
  ["Congo", "CG", "Brazzaville", "CEMAC", "FCFA", "XAF", "18,9 %", "BEAC"],
  ["Côte d'Ivoire", "CI", "Abidjan", "UEMOA", "FCFA", "XOF", "18 %", "BCEAO"],
  ["Gabon", "GA", "Libreville", "CEMAC", "FCFA", "XAF", "18 %", "BEAC"],
  ["Guinée", "GN", "Conakry", "Autre", "Fr. guinéen", "GNF", "18 %", "BCRG"],
  ["Guinée-Bissau", "GW", "Bissau", "UEMOA", "FCFA", "XOF", "10 %", "BCEAO"],
  ["Guinée Équat.", "GQ", "Malabo", "CEMAC", "FCFA", "XAF", "15 %", "BEAC"],
  ["Mali", "ML", "Bamako", "UEMOA", "FCFA", "XOF", "18 %", "BCEAO"],
  ["Niger", "NE", "Niamey", "UEMOA", "FCFA", "XOF", "19 %", "BCEAO"],
  ["RDC", "CD", "Kinshasa", "Autre", "Fr. congolais", "CDF", "16 %", "BCC"],
  ["Sénégal", "SN", "Dakar", "UEMOA", "FCFA", "XOF", "18 %", "BCEAO"],
  ["Tchad", "TD", "N'Djamena", "CEMAC", "FCFA", "XAF", "18 %", "BEAC"],
  ["Togo", "TG", "Lomé", "UEMOA", "FCFA", "XOF", "18 %", "BCEAO"],
];
const byName = (n) => PAYS17.find((p) => p[0] === n);

function zoneChipKind(zone) {
  return zone === "UEMOA" ? "accent" : zone === "CEMAC" ? "warn" : "fill";
}

/* small line item with a check */
function CfgRow({ ico, title, sub, tag }) {
  return (
    <div className="card flex center g10" style={{ padding: "11px 13px" }}>
      <span className="icon-sq">{ico}</span>
      <div className="col" style={{ lineHeight: 1.15 }}>
        <span className="b">{title}</span>
        <span className="muted small">{sub}</span>
      </div>
      <div className="grow" />
      {tag || <span className="chip accent">✓ chargé</span>}
    </div>
  );
}

/* ============================== ÉTAPES ============================== */

// 1 — Choisir le pays (17)
function CStep1({ sel, setSel }) {
  return (
    <div className="col g16">
      <div>
        <h2 style={{ margin: 0 }}>Choisissez le pays du dossier</h2>
        <div className="muted">Un seul clic. DaCompta connaît les 17 États OHADA — il en déduit tout le paramétrage comptable et fiscal.</div>
      </div>
      <div className="pays-grid">
        {PAYS17.map((p) => (
          <div key={p[0]} className={"card paystile" + (p[0] === sel ? " on" : "")} onClick={() => setSel(p[0])}>
            <span className="flagcode">{p[1]}</span>
            <div className="col" style={{ lineHeight: 1.1, flex: 1 }}>
              <span className="b">{p[0]}</span>
              <span className="muted small">{p[2]}</span>
            </div>
            <span className={"dotcur " + (p[5] === "XOF" ? "xof" : p[5] === "XAF" ? "xaf" : "oth")} title={p[5]} />
            {p[0] === sel && <span className="chip accent" style={{ padding: "0 7px" }}>✓</span>}
          </div>
        ))}
      </div>
      <div className="flex wrap g16 annotation">
        <span className="annot small"><span className="dotcur xof" /> Zone UEMOA · XOF (BCEAO)</span>
        <span className="annot small"><span className="dotcur xaf" /> Zone CEMAC · XAF (BEAC)</span>
        <span className="annot small"><span className="dotcur oth" /> Devise nationale</span>
      </div>
    </div>
  );
}

// 2 — Référentiel préchargé
function CStep2({ sel, frame }) {
  const c = byName(sel);
  const [ref, setRef] = useCState("syscohada");
  return (
    <div className="col g16">
      <div>
        <h2 style={{ margin: 0 }}>Référentiel & plan comptable préchargés</h2>
        <div className="muted">Selon le type d'entité, DaCompta charge le bon plan — tout reste éditable ensuite dans le flux Plan comptable.</div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className={"card refpick" + (ref === "syscohada" ? " on" : "")} onClick={() => setRef("syscohada")}>
          <div className="flex center g8"><span className="icon-sq">▦</span><span className="b">SYSCOHADA révisé</span>{ref === "syscohada" && <><div className="grow" /><span className="chip accent">●</span></>}</div>
          <span className="muted small">Entités à but lucratif (SA, SARL, SAS…). Plan en 9 classes, AUDCIF 2017.</span>
        </div>
        <div className={"card refpick" + (ref === "sycebnl" ? " on" : "")} onClick={() => setRef("sycebnl")}>
          <div className="flex center g8"><span className="icon-sq">♡</span><span className="b">SYCEBNL</span>{ref === "sycebnl" && <><div className="grow" /><span className="chip accent">●</span></>}</div>
          <span className="muted small">Entités à but non lucratif (associations, ONG, projets). Plan dédié EBNL.</span>
        </div>
      </div>
      <Card fill>
        <div className="card-h"><span className="t">Préchargé pour {sel} — {frame}</span><div className="grow" /><Chip kind="ai">✦ éditable</Chip></div>
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <CfgRow ico="▦" title={ref === "sycebnl" ? "Plan comptable SYCEBNL" : "Plan SYSCOHADA · 9 classes"} sub={ref === "sycebnl" ? "comptes EBNL · fonds dédiés" : "~712 comptes · natures correctes"} />
          <CfgRow ico="▤" title="Journaux de saisie" sub="ACH · VTE · BQ · CA · OD · PAIE" />
          <CfgRow ico="⇄" title="Comptes de trésorerie" sub={"Banque " + c[7] + " · Caisse · Mobile Money"} />
          <CfgRow ico="§" title="Libellés & langue" sub="Français (norme OHADA)" />
        </div>
      </Card>
      <Annot>Le plan n'est pas un fichier à importer comme sous Sage : il arrive déjà juste, prêt à recevoir des écritures.</Annot>
    </div>
  );
}

// 3 — Fiscalité du pays
function CStep3({ sel }) {
  const c = byName(sel);
  return (
    <div className="col g16">
      <div>
        <h2 style={{ margin: 0 }}>Fiscalité paramétrée pour {sel}</h2>
        <div className="muted">Les taux et régimes du pays sont appliqués — ils alimentent ensuite la régularisation et les déclarations.</div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="card kpi"><div className="v">{c[6]}</div><div className="k">TVA standard ({c[0]})</div><div className="small muted mt8">compte collecté 4431</div></div>
        <div className="card kpi"><div className="v mono">{c[5]}</div><div className="k">Devise · {c[7]}</div><div className="small muted mt8">{c[4]} · sans décimales</div></div>
        <div className="card kpi"><div className="v">Réel</div><div className="k">Régime par défaut</div><div className="small muted mt8">ajustable selon le CA</div></div>
      </div>
      <Card fill>
        <div className="card-h"><span className="t">Taxes & retenues du pays</span><div className="grow" /><Chip kind="ai">✦ modèles pays</Chip></div>
        <div className="flex wrap g8">
          <Chip kind="accent">TVA {c[6]}</Chip>
          <Chip kind="fill">Impôt sur les bénéfices (IS / IBS)</Chip>
          <Chip kind="fill">Retenues à la source · ITS / IRPP</Chip>
          <Chip kind="fill">Acomptes & minimum forfaitaire</Chip>
          {c[3] === "UEMOA" && <Chip kind="fill">AIRSI</Chip>}
        </div>
      </Card>
      <Annot>Multi-taux géré : taux réduit, exonéré et autoliquidation se branchent ici quand le dossier en a besoin.</Annot>
    </div>
  );
}

// 4 — Calendrier fiscal & DSF
function CStep4({ sel }) {
  const ech = [
    ["TVA", "Déclaration mensuelle", "le 15 du mois suivant", "Régularisation TVA"],
    ["IS / IBS", "Acomptes trimestriels + solde annuel", "selon calendrier pays", "Liasse fiscale"],
    ["Retenues ITS / IRPP", "Reversement mensuel", "le 15 du mois suivant", "Journal de Paie"],
    ["DSF", "Liasse statistique & fiscale", "dépôt annuel à la clôture", "États & documents"],
  ];
  return (
    <div className="col g16">
      <div>
        <h2 style={{ margin: 0 }}>Calendrier fiscal & modèles DSF</h2>
        <div className="muted">DaCompta installe les échéances du pays et la liasse DSF locale — les rappels et pré-remplissages en découlent.</div>
      </div>
      <Card>
        <table className="tbl">
          <thead><tr><th>Obligation</th><th>Fréquence</th><th>Échéance</th><th>Alimente le flux</th></tr></thead>
          <tbody>
            {ech.map((e, i) => (
              <tr key={i}>
                <td className="b">{e[0]}</td>
                <td>{e[1]}</td>
                <td className="muted small">{e[2]}</td>
                <td><span className="chip fill small">{e[3]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card fill className="flex center g10" style={{ padding: "12px 14px" }}>
        <span className="chip ai">✦ DSF {sel}</span>
        <span>Modèle de Déclaration Statistique et Fiscale du pays préchargé : bilan, compte de résultat, TAFIRE, notes annexes, états statistiques.</span>
      </Card>
    </div>
  );
}

// 5 — Dossier prêt → ce que ça alimente
function CStep5({ sel }) {
  const feeds = [
    ["▦", "Plan comptable", "comptes & natures prêts", "DaCompta - Flux Plan comptable.html"],
    ["✎", "Imputation des pièces", "TVA & analytique automatiques", "DaCompta - Flux Imputation des pièces.html"],
    ["%", "Régularisation TVA", "taux & échéance du pays", "DaCompta - Flux Régularisation TVA.html"],
    ["▥", "États & documents", "liasse DSF du pays", "DaCompta - Module Etats et documents.html"],
  ];
  return (
    <div className="col g16">
      <div className="flex center g12">
        <span className="icon-sq" style={{ width: 40, height: 40, fontSize: "1.3em", background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" }}>✓</span>
        <div>
          <h2 style={{ margin: 0 }}>Dossier {sel} configuré — en ~1 minute</h2>
          <div className="annotation annot">aucune saisie technique : le pays a tout déduit</div>
        </div>
      </div>
      <div>
        <Note>Ce que cette configuration alimente en aval</Note>
        <div className="grid" style={{ gridTemplateColumns: "repeat(2,1fr)", marginTop: 8 }}>
          {feeds.map((f, i) => (
            <a key={i} href={f[3]} className="card feed-card flex center g10" style={{ padding: "12px 14px", textDecoration: "none", color: "inherit" }}>
              <span className="icon-sq">{f[0]}</span>
              <div className="col" style={{ lineHeight: 1.15, flex: 1 }}><span className="b">{f[1]}</span><span className="muted small">{f[2]}</span></div>
              <span className="muted">↗</span>
            </a>
          ))}
        </div>
      </div>
      <Card fill className="flex center g10" style={{ padding: "12px 14px" }}>
        <span className="pill-sync"><span className="dot" /> Cloud + multi-utilisateurs</span>
        <span className="muted small">Le dossier est immédiatement partageable avec l'équipe du cabinet — pas de fichier local à transmettre.</span>
      </Card>
    </div>
  );
}

const CFG_STEPS = [
  { label: "Pays (17 OHADA)", comp: CStep1,
    note: "Concurrents : pays ignoré, paramétrage 100 % manuel. Ici : 17 pays reconnus, tout en découle." },
  { label: "Référentiel & plan", comp: CStep2,
    note: "Concurrents : un seul plan, à importer. Ici : SYSCOHADA ou SYCEBNL préchargé selon l'entité." },
  { label: "Fiscalité", comp: CStep3,
    note: "Concurrents : taux saisis à la main. Ici : TVA, IS/IBS et retenues du pays appliqués d'office." },
  { label: "Calendrier & DSF", comp: CStep4,
    note: "Concurrents : échéances suivies hors logiciel. Ici : calendrier + liasse DSF du pays installés." },
  { label: "Dossier prêt", comp: CStep5,
    note: "Concurrents : on vérifie que les menus sont actifs. Ici : tout est prêt et déjà branché aux flux suivants." },
];

Object.assign(window, { CFG_STEPS, PAYS17, CfgRow });
