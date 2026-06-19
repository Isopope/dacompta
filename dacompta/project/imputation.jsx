/* global React, Win, Card, Chip, Btn, Mark, Note, Annot, Ln */
// Flux « Imputation des pièces » — OCR + imputation IA + ventilation analytique (réadaptation Sage 100 vidéo 08)

const { useState: useIState } = React;
const ifmt = (n) => n.toLocaleString("fr-FR");

const PIECES = [
  {
    id: "02/01", titre: "Achat de 2 bus", four: "Concession Auto", jr: "ACH", type: "Immobilisation",
    ht: 18000000, tva: 3240000, ttc: 21240000, conf: 97,
    lines: [
      ["245100", "Matériel de transport", 18000000, 0],
      ["445100", "TVA récupérable / immobilisations", 3240000, 0],
      ["481200", "Fournisseurs d'investissements", 0, 21240000],
    ],
    ana: [["BUSA", "Bus A", 9000000], ["BUSB", "Bus B", 9000000]],
    regles: ["Classe 2 (immobilisation)", "Fournisseur d'invest. 4812", "TVA récup. sur immo 4451", "Règlement à 30 j"],
  },
  {
    id: "05/01", titre: "Prime d'assurance flotte", four: "Assureur NSIA", jr: "ACH", type: "Charge",
    ht: 3900000, tva: 0, ttc: 3900000, conf: 95, exo: true,
    lines: [
      ["625200", "Primes d'assurance", 3900000, 0],
      ["401100", "Fournisseur (assurance)", 0, 3900000],
    ],
    ana: [["BUSA", "Bus A", 1300000], ["BUSB", "Bus B", 1300000], ["BUSC", "Bus C", 1300000]],
    regles: ["Exonéré de TVA (assurance)", "Réparti sur toute la flotte"],
  },
  {
    id: "08/01", titre: "Fournitures de bureau", four: "Librairie Centrale", jr: "ACH", type: "Charge",
    ht: 120000, tva: 21600, ttc: 141600, conf: 96,
    lines: [
      ["605400", "Fournitures de bureau", 120000, 0],
      ["445200", "TVA récupérable / achats", 21600, 0],
      ["401100", "Fournisseur (fournitures)", 0, 141600],
    ],
    ana: [["DIV", "Imputations diverses", 120000]],
    regles: ["TVA 18 %", "Charge globale → section « Divers »", "Non rattachable à un bus"],
  },
  {
    id: "06/01", titre: "Vente de tickets (transport)", four: "Clients divers", jr: "VT", type: "Recette",
    ht: 1111000, tva: 199980, ttc: 1310980, conf: 98,
    lines: [
      ["411DIV", "Clients divers", 1310980, 0],
      ["706100", "Services vendus / transport", 0, 1111000],
      ["443000", "TVA facturée / collectée", 0, 199980],
    ],
    ana: [["BUSA", "Bus A", 620000], ["BUSB", "Bus B", 491000]],
    regles: ["TVA collectée 18 %", "Vente au comptant", "HT scindé par bus"],
  },
  {
    id: "09/01", titre: "Achat de carburant", four: "Sté Nat. Pétrole", jr: "CAI", type: "Charge comptant",
    ht: 850000, tva: 153000, ttc: 1003000, conf: 99,
    lines: [
      ["605300", "Achat de carburant", 850000, 0],
      ["445200", "TVA récupérable / achats", 153000, 0],
      ["571100", "Caisse siège", 0, 1003000],
    ],
    ana: [["BUSA", "Bus A", 850000]],
    regles: ["Carburant réglé au comptant", "Affecté directement au Bus A", "TVA 18 %"],
  },
];

function ImputationWorkspace() {
  const [sel, setSel] = useIState(0);
  const p = PIECES[sel];
  const eq = p.lines.reduce((s, l) => s + l[2], 0) === p.lines.reduce((s, l) => s + l[3], 0);

  return (
    <div className="flex" style={{ minHeight: 580 }}>
      {/* inbox des pièces */}
      <aside className="side" style={{ width: 240, flex: "none" }}>
        <div className="flex center g8" style={{ margin: "0 4px 8px" }}><span className="b">Pièces · Janvier</span><span className="chip ai" style={{ fontSize: ".68em" }}>✦ lues</span></div>
        {PIECES.map((x, i) => (
          <div key={i} className={"nav-item" + (i === sel ? " active" : "")} onClick={() => setSel(i)} style={{ cursor: "pointer", alignItems: "flex-start" }}>
            <span className="ico mono small">{x.id}</span>
            <div className="col" style={{ flex: 1, lineHeight: 1.1 }}>
              <span className="small b">{x.titre}</span>
              <span className="muted small">{x.jr} · {ifmt(x.ttc)}</span>
            </div>
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <div className="card fill small" style={{ padding: 10 }}>Plus de « fiche d'imputation » papier — tout est pré-calculé.</div>
      </aside>

      {/* détail imputation */}
      <div className="main" style={{ flex: 1, padding: 18 }}>
        <div className="flex center g10">
          <span className="b" style={{ fontSize: "1.2em" }}>{p.titre}</span>
          <Chip kind="fill">Journal {p.jr}</Chip>
          <Chip kind="fill">{p.type}</Chip>
          <div className="grow" />
          <Chip kind="ai">✦ confiance {p.conf} %</Chip>
        </div>

        <div className="grid" style={{ gridTemplateColumns: ".8fr 1.2fr", marginTop: 12 }}>
          {/* pièce + TVA */}
          <div className="col g12">
            <div className="docslot" style={{ minHeight: 120 }}>
              <div className="flex between center"><span className="b">{p.type === "Recette" ? "REÇU / TICKET" : "FACTURE"}</span><span className="mono small muted">{p.four}</span></div>
              <Ln w="60%" /><Lines rows={2} widths={["80%", "50%"]} />
            </div>
            <Card style={{ padding: 12 }}>
              <div className="col g8">
                <div className="flex between"><span className="muted">Montant HT</span><span className="mono b">{ifmt(p.ht)}</span></div>
                <div className="flex between"><span className="muted">TVA {p.exo ? "(exonérée)" : "18 %"}</span><span className="mono b">{p.exo ? "—" : ifmt(p.tva)}</span></div>
                <div className="flex between" style={{ borderTop: "1.5px dashed var(--fill-2)", paddingTop: 6 }}><span className="b">TTC</span><span className="mono b">{ifmt(p.ttc)}</span></div>
              </div>
              {p.exo && <div className="annotation annot small" style={{ marginTop: 8 }}>assurance → exonérée automatiquement</div>}
            </Card>
          </div>

          {/* écriture proposée */}
          <div className="col g12">
            <Card style={{ padding: 0 }}>
              <table className="tbl">
                <thead><tr><th>Compte</th><th>Libellé</th><th className="num">Débit</th><th className="num">Crédit</th></tr></thead>
                <tbody>
                  {p.lines.map((l, i) => (
                    <tr key={i}>
                      <td className="mono b"><Mark>{l[0]}</Mark></td>
                      <td>{l[1]}</td>
                      <td className="num mono">{l[2] ? ifmt(l[2]) : ""}</td>
                      <td className="num mono">{l[3] ? ifmt(l[3]) : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex between center" style={{ padding: "8px 10px", borderTop: "2px solid var(--line)" }}>
                <span className="chip accent">⚖ {eq ? "Équilibrée" : "à compléter"}</span>
                <span className="muted small">comptes surlignés = proposés par l'IA</span>
              </div>
            </Card>

            {/* ventilation analytique */}
            <Card fill style={{ padding: 12 }}>
              <div className="flex center g8"><span className="chip ai">✦ Ventilation analytique</span></div>
              <div className="flex wrap g8 mt8">
                {p.ana.map((a, i) => (
                  <span key={i} className="chip" style={{ background: a[0] === "DIV" ? "var(--fill)" : "var(--accent-soft)", borderColor: a[0] === "DIV" ? undefined : "var(--accent)" }}>
                    {a[1]} · <b className="mono">{ifmt(a[2])}</b>
                  </span>
                ))}
              </div>
            </Card>

            {/* règles appliquées */}
            <div className="flex wrap g6">
              {p.regles.map((r, i) => <span key={i} className="chip fill small">✓ {r}</span>)}
            </div>

            <div className="flex g10">
              <span className="btn primary">✓ Valider l'imputation</span>
              <Btn>Corriger</Btn>
              <div className="grow" />
              <Btn kind="ghost">Pièce suivante →</Btn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ImputationWorkspace });
