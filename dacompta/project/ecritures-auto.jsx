/* global React, Win, Card, Chip, Btn, Mark, Note, Annot */
// Flux « Écritures automatiques à l'opération » — feature stade Saisie
// Une opération métier → écriture équilibrée avec TVA ventilée + sortie de stock CMUP.
// Cas fil rouge : LES ASSOCIÉS SA (Lomé, Togo).

const { useState: useOpState } = React;
const of = (n) => n.toLocaleString("fr-FR");

// opérations : clé → modèle
const OPS = {
  "Vente comptant": {
    ico: "🛒", desc: "Encaissement boutique — espèces + Mobile Money", tva: true, stock: true,
    regle: [
      ["Trésorerie encaissée", "5xx", "débit", "selon moyen de paiement"],
      ["Produit de vente HT", "70x", "crédit", "nature du bien/service"],
      ["TVA collectée", "4431", "crédit", "au taux du pays"],
      ["Sortie de stock (CMUP)", "603x / 31x", "OD", "coût unitaire moyen pondéré"],
    ],
    lignes: [
      ["5211", "Banque Wave", 100000, 0],
      ["5711", "Caisse espèces", 150000, 0],
      ["7011", "Ventes de marchandises", 0, 211864],
      ["4431", "TVA collectée (18 %)", 0, 38136],
    ],
    stockLignes: [
      ["6031", "Variation stocks march.", 140000, 0],
      ["3110", "Marchandises", 0, 140000],
    ],
  },
  "Vente à crédit": {
    ico: "🧾", desc: "Facture client à échéance 30 j", tva: true, stock: true,
    regle: [
      ["Créance client", "411", "débit", "tiers client"],
      ["Produit de vente HT", "70x", "crédit", "nature"],
      ["TVA collectée", "4431", "crédit", "au taux du pays"],
      ["Sortie de stock (CMUP)", "603x / 31x", "OD", "coût moyen"],
    ],
    lignes: [
      ["4111", "Client SOTRA", 590000, 0],
      ["7011", "Ventes de marchandises", 0, 500000],
      ["4431", "TVA collectée (18 %)", 0, 90000],
    ],
    stockLignes: [
      ["6031", "Variation stocks march.", 330000, 0],
      ["3110", "Marchandises", 0, 330000],
    ],
  },
  "Achat fournisseur": {
    ico: "📦", desc: "Facture d'achat de marchandises", tva: true, stock: false,
    regle: [
      ["Charge d'achat HT", "60x", "débit", "nature de l'achat"],
      ["TVA déductible", "4452", "débit", "récupérable"],
      ["Dette fournisseur", "401", "crédit", "tiers fournisseur"],
    ],
    lignes: [
      ["6011", "Achats de marchandises", 420000, 0],
      ["4452", "TVA déductible", 75600, 0],
      ["4011", "Fournisseur SODIM", 0, 495600],
    ],
    stockLignes: [],
  },
};

/* ============================== ÉTAPES ============================== */

// 1 — Choisir l'opération
function OpStep1({ op, setOp }) {
  return (
    <div className="col g16">
      <div>
        <h2 style={{ margin: 0 }}>L'utilisateur saisit une opération, pas une écriture</h2>
        <div className="muted">On décrit ce qui s'est passé en langage métier. DaCompta connaît le modèle comptable derrière.</div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        {Object.keys(OPS).map((k) => (
          <div key={k} className={"card opcard" + (k === op ? " on" : "")} onClick={() => setOp(k)}>
            <div className="flex center g8"><span className="icon-sq">{OPS[k].ico}</span><span className="b">{k}</span>{k === op && <><div className="grow" /><span className="chip accent">✓</span></>}</div>
            <span className="muted small">{OPS[k].desc}</span>
          </div>
        ))}
      </div>
      <Annot>Le comptable n'impute plus à la main : il valide ce que le modèle a produit.</Annot>
    </div>
  );
}

// 2 — Le modèle d'écriture
function OpStep2({ op }) {
  const o = OPS[op];
  return (
    <div className="col g16">
      <div>
        <h2 style={{ margin: 0 }}>Le modèle d'écriture — {op}</h2>
        <div className="muted">Règle de passage opération → comptes. Paramétrable par le cabinet, livrée déjà juste.</div>
      </div>
      <Card>
        <table className="tbl">
          <thead><tr><th>Poste</th><th>Compte</th><th>Sens</th><th>Détermination</th></tr></thead>
          <tbody>
            {o.regle.map((r, i) => (
              <tr key={i}>
                <td className="b">{r[0]}</td>
                <td className="mono small">{r[1]}</td>
                <td><span className={"chip small " + (r[2] === "débit" ? "fill" : r[2] === "crédit" ? "accent" : "warn")}>{r[2]}</span></td>
                <td className="muted small">{r[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div className="flex wrap g8">
        {o.tva && <Chip kind="ai">✦ TVA ventilée automatiquement</Chip>}
        {o.stock && <Chip kind="ai">✦ sortie de stock au CMUP</Chip>}
        <Chip kind="fill">équilibre garanti</Chip>
      </div>
    </div>
  );
}

// 3 — Écriture générée
function OpStep3({ op }) {
  const o = OPS[op];
  const totD = o.lignes.reduce((s, l) => s + l[2], 0);
  const totC = o.lignes.reduce((s, l) => s + l[3], 0);
  return (
    <div className="col g16">
      <div>
        <h2 style={{ margin: 0 }}>L'écriture générée</h2>
        <div className="muted">Équilibrée à la saisie. Le comptable consulte, ajuste si besoin — il ne ressaisit pas.</div>
      </div>
      <Card title="Écriture principale" right={<Chip kind="ai">✦ auto</Chip>}>
        <table className="tbl">
          <thead><tr><th>Compte</th><th>Libellé</th><th className="num">Débit</th><th className="num">Crédit</th></tr></thead>
          <tbody>
            {o.lignes.map((l, i) => (
              <tr key={i}><td className="mono small">{l[0]}</td><td className="small">{l[1]}</td><td className="num mono small">{l[2] ? of(l[2]) : ""}</td><td className="num mono small">{l[3] ? of(l[3]) : ""}</td></tr>
            ))}
            <tr style={{ borderTop: "2px solid var(--line)" }}><td></td><td className="b small">Total</td><td className="num mono small b">{of(totD)}</td><td className="num mono small b">{of(totC)}</td></tr>
          </tbody>
        </table>
      </Card>
      {o.stockLignes.length > 0 && (
        <Card title="Écriture de stock (CMUP)" right={<Chip kind="ai">✦ auto</Chip>}>
          <table className="tbl">
            <tbody>
              {o.stockLignes.map((l, i) => (
                <tr key={i}><td className="mono small">{l[0]}</td><td className="small">{l[1]}</td><td className="num mono small">{l[2] ? of(l[2]) : ""}</td><td className="num mono small">{l[3] ? of(l[3]) : ""}</td></tr>
              ))}
            </tbody>
          </table>
          <Annot style={{ marginTop: 8 }}>Le coût de sortie est valorisé au coût moyen pondéré — la marge reste juste et auditable.</Annot>
        </Card>
      )}
      {/* pièce justificative */}
      <div className="flex center g10" style={{ marginTop: 12 }}>
        <PieceSlot name={"PJ-" + op.replace(/ /g, "-") + ".pdf"} type="Pièce justificative · scan" ocr />
        <PieceSlot empty />
      </div>
      <Annot style={{ marginTop: 6 }}>La pièce (facture, ticket, reçu) est rattachée à l'écriture dès la saisie — consultable partout, obligatoire SYSCOHADA</Annot>
    </div>
  );
}

// 4 — Validation & traçabilité
function OpStep4({ op }) {
  return (
    <div className="col g16">
      <div className="flex center g12">
        <span className="icon-sq" style={{ width: 40, height: 40, fontSize: "1.3em", background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" }}>✓</span>
        <div>
          <h2 style={{ margin: 0 }}>Validée & tracée</h2>
          <div className="annotation annot">de l'opération métier à l'écriture comptable, sans rupture</div>
        </div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Card fill className="flex center g10" style={{ padding: "12px 14px" }}>
          <span className="chip">⏲ piste d'audit</span>
          <span className="small">Qui, quand, depuis quelle pièce — chaque écriture auto est traçable.</span>
        </Card>
        <Card fill className="flex center g10" style={{ padding: "12px 14px" }}>
          <span className="chip ai">✦ révisable</span>
          <span className="small">Le modèle propose ; le comptable garde le dernier mot sur chaque ligne.</span>
        </Card>
      </div>
      <Card fill>
        <Note>S'enchaîne avec</Note>
        <div className="grid" style={{ gridTemplateColumns: "repeat(3,1fr)", marginTop: 8 }}>
          {[["✎", "Imputation des pièces", "DaCompta - Flux Imputation des pièces.html"], ["▤", "Journal de Caisse", "DaCompta - Flux Journal de Caisse.html"], ["%", "Régularisation TVA", "DaCompta - Flux Régularisation TVA.html"]].map((f, i) => (
            <a key={i} href={f[2]} className="card flex center g8" style={{ padding: "10px 12px", textDecoration: "none", color: "inherit" }}>
              <span className="icon-sq" style={{ width: 26, height: 26 }}>{f[0]}</span><span className="small b" style={{ flex: 1 }}>{f[1]}</span><span className="muted">↗</span>
            </a>
          ))}
        </div>
      </Card>
    </div>
  );
}

const OPS_STEPS = [
  { label: "L'opération", comp: OpStep1, note: "Concurrents : on saisit directement des comptes. Ici : on décrit l'opération métier." },
  { label: "Le modèle", comp: OpStep2, note: "Concurrents : règle dans la tête du comptable. Ici : modèle explicite, paramétrable." },
  { label: "Écriture générée", comp: OpStep3, note: "Concurrents : TVA et stock saisis à part. Ici : ventilation TVA + CMUP automatiques." },
  { label: "Validation", comp: OpStep4, note: "Concurrents : pas de lien opération ↔ écriture. Ici : tracé, révisable, chaîné." },
];

Object.assign(window, { OPS_STEPS });
