/* global React, Win, Card, Chip, Btn, Mark, Note, Annot, Ln */
// Flux « Révision & Clôture » — lettrage, balances, états SYSCOHADA, nouvel exercice (Sage vidéo 16)

const { useState: useClState } = React;
const clfmt = (n) => n.toLocaleString("fr-FR");

/* ---- onglet 1 : LETTRAGE ---- */
function TabLettrage() {
  const cli = [
    ["411DIV", "Clients divers", "ok", "soldé — ventes = encaissements"],
    ["411FILS", "Ets Fils", "ok", "règlement solde la facture d'ouverture"],
    ["411LOC", "Location de bus (avances)", "part", "solde résiduel — lettrage partiel"],
  ];
  const four = [
    ["4011SNP", "Sté Nat. Pétrole", "ok", "achats comptant = paiements caisse"],
    ["4011NOT", "Notaire Baba (loyer)", "part", "abonnement en cours — reporté"],
    ["4812JAP", "FR Invest. Frères Japon", "part", "dette à 30 j échue (voir balance âgée)"],
  ];
  const row = (r, i) => (
    <div key={i} className="card flex center g10" style={{ padding: "9px 12px" }}>
      <span className="mono b" style={{ minWidth: 70 }}>{r[0]}</span>
      <div className="col grow"><span className="b">{r[1]}</span><span className="muted small">{r[3]}</span></div>
      {r[2] === "ok" ? <Chip kind="accent">✓ lettré</Chip> : <Chip kind="warn">non soldé</Chip>}
    </div>
  );
  return (
    <div className="main" style={{ padding: 22 }}>
      <div className="flex center g10"><h2 style={{ margin: 0, fontSize: "1.5em" }}>Lettrage des tiers</h2><div className="grow" /><Chip kind="ai">✦ lettrage automatique proposé</Chip></div>
      <Annot style={{ marginTop: 4 }}>Associer factures et règlements pour isoler ce qui reste dû — l'IA pré-rapproche, vous confirmez</Annot>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 12 }}>
        <div className="col g8"><span className="small b muted">CLIENTS</span>{cli.map(row)}</div>
        <div className="col g8"><span className="small b muted">FOURNISSEURS</span>{four.map(row)}</div>
      </div>
    </div>
  );
}

/* ---- onglet 2 : BALANCES ---- */
function TabBalances() {
  const ana = [["Bus A", -118400, "warn"], ["Bus B", 45200, "ok"], ["Bus C", 347720, "ok"]];
  return (
    <div className="main" style={{ padding: 22 }}>
      <h2 style={{ margin: 0, fontSize: "1.5em" }}>Balances de contrôle</h2>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 12 }}>
        <Card>
          <div className="card-h"><span className="t">Balance générale (6 colonnes)</span><div className="grow" /><Chip kind="fill">Janvier</Chip></div>
          <div className="col g8">
            <div className="flex between small"><span className="muted">Total mouvements débit</span><span className="mono">84 312 050</span></div>
            <div className="flex between small"><span className="muted">Total mouvements crédit</span><span className="mono">84 312 050</span></div>
            <div className="flex between b mt8" style={{ borderTop: "1.5px dashed var(--fill-2)", paddingTop: 6 }}><span>Résultat provisoire</span><span className="mono" style={{ color: "var(--danger)" }}>− perte</span></div>
          </div>
        </Card>
        <Card style={{ borderColor: "var(--accent)" }}>
          <div className="card-h"><span className="t">Balance analytique — rentabilité flotte</span><div className="grow" /><Chip kind="ai">✦</Chip></div>
          <table className="tbl">
            <tbody>
              {ana.map((a, i) => (
                <tr key={i}><td className="b">{a[0]}</td><td className="num mono">{a[1] > 0 ? <Chip kind="accent">+{clfmt(a[1])}</Chip> : <Chip kind="warn">{clfmt(a[1])}</Chip>}</td></tr>
              ))}
            </tbody>
          </table>
          <div className="annotation annot small" style={{ marginTop: 6 }}>Bus C dégage +347 720 ; Bus A est déficitaire — piloter véhicule par véhicule</div>
        </Card>
      </div>
      <Card style={{ marginTop: 12 }}>
        <div className="card-h"><span className="t">Balance âgée fournisseurs</span><div className="grow" /><Chip kind="warn">1 échéance dépassée</Chip></div>
        <table className="tbl">
          <thead><tr><th>Fournisseur</th><th className="num">À échoir</th><th className="num">Échu</th><th>Statut</th></tr></thead>
          <tbody>
            <tr><td className="b">FR Invest. Frères Japon</td><td className="num mono muted">—</td><td className="num mono">{clfmt(14600000)}</td><td><Chip kind="warn">retard &gt; 30 j</Chip></td></tr>
            <tr><td>Autres fournisseurs</td><td className="num mono">à 60 j</td><td className="num mono muted">—</td><td><Chip kind="fill">à jour</Chip></td></tr>
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ---- onglet 3 : ÉTATS FINANCIERS ---- */
function TabEtats() {
  return (
    <div className="main" style={{ padding: 22 }}>
      <div className="flex center g10"><h2 style={{ margin: 0, fontSize: "1.5em" }}>États financiers</h2><Chip kind="accent">SYSCOHADA — Système Normal</Chip><div className="grow" /><Chip kind="ai">✦ générés nativement</Chip></div>
      <Annot style={{ marginTop: 4 }}>Pas d'application séparée ni d'export : le bilan, le résultat et la DSF se calculent dans DaCompta</Annot>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 12 }}>
        <Card>
          <div className="card-h"><span className="t">Bilan</span></div>
          <div className="col g8">
            <div className="flex between"><span className="muted">Total Actif</span><span className="mono b">{clfmt(106220100)}</span></div>
            <div className="flex between"><span className="muted">Total Passif</span><span className="mono b">{clfmt(106220100)}</span></div>
            <div className="flex center g8 mt8" style={{ borderTop: "1.5px dashed var(--fill-2)", paddingTop: 6 }}><Chip kind="accent">⚖ Actif = Passif</Chip></div>
          </div>
        </Card>
        <Card>
          <div className="card-h"><span className="t">Compte de résultat</span></div>
          <div className="col g8">
            <div className="flex between small"><span className="muted">Produits</span><span className="mono">3 ...</span></div>
            <div className="flex between small"><span className="muted">Charges</span><span className="mono">4 ...</span></div>
            <div className="flex between b mt8" style={{ borderTop: "1.5px dashed var(--fill-2)", paddingTop: 6 }}><span>Résultat net</span><span className="mono" style={{ color: "var(--danger)" }}>Perte → 139000</span></div>
          </div>
        </Card>
      </div>
      <div className="flex g10 mt12 wrap">
        <Chip kind="fill">▥ Bilan</Chip><Chip kind="fill">▥ Compte de résultat</Chip><Chip kind="fill">▥ Tableau des flux</Chip><Chip kind="fill">▥ Notes annexes</Chip><Chip kind="ai">✦ Liasse DSF Togo — pré-remplie</Chip>
      </div>
    </div>
  );
}

/* ---- onglet 4 : NOUVEL EXERCICE ---- */
function TabCloture() {
  const [done, setDone] = useClState(false);
  return (
    <div className="main" style={{ padding: 22 }}>
      <h2 style={{ margin: 0, fontSize: "1.5em" }}>Clôture & nouvel exercice</h2>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 12 }}>
        <Card>
          <div className="card-h"><span className="t">Étapes</span></div>
          <div className="col g10">
            {[["Lettrage & contrôles", true], ["États financiers validés", true], ["Affectation du résultat", true], ["Génération des reports (RAN)", done]].map((s, i) => (
              <div key={i} className="flex center g8"><span className={"chip " + (s[1] ? "accent" : "")}>{s[1] ? "✓" : i + 1}</span><span className="small">{s[0]}</span></div>
            ))}
          </div>
          <div className="card fill mt12" style={{ padding: 10 }}>
            <div className="flex center g8"><span className="small b">Affectation de la perte</span><div className="grow" /><span className="mono b">139000</span></div>
            <span className="muted small">solde de l'exercice viré aux capitaux propres</span>
          </div>
        </Card>
        <Card style={{ borderColor: done ? "var(--accent)" : undefined, background: done ? "var(--accent-soft)" : undefined }}>
          <div className="card-h"><span className="t">Exercice 2021 — Report à nouveau</span>{done && <><div className="grow" /><Chip kind="accent">✓ généré</Chip></>}</div>
          {done ? (
            <table className="tbl">
              <thead><tr><th>Compte</th><th>Libellé</th><th className="num">Solde repris</th></tr></thead>
              <tbody>
                <tr><td className="mono">521100</td><td>Banque BIMA</td><td className="num mono">…</td></tr>
                <tr><td className="mono">571100</td><td>Caisse</td><td className="num mono">…</td></tr>
                <tr><td className="mono">101300</td><td>Capital</td><td className="num mono">…</td></tr>
                <tr><td className="mono">139000</td><td>Report perte N-1</td><td className="num mono">…</td></tr>
              </tbody>
            </table>
          ) : (
            <div className="dash" style={{ minHeight: 110, display: "grid", placeItems: "center" }}><span className="muted small">pièce d'ouverture générée automatiquement</span></div>
          )}
        </Card>
      </div>
      <div className="flex center g10 mt12">
        {!done
          ? <span className="btn primary" style={{ cursor: "pointer" }} onClick={() => setDone(true)}>Clôturer 2020 & ouvrir 2021</span>
          : <><span className="chip accent">✓ 2020 archivé · 2021 ouvert et équilibré</span><Btn onClick={() => setDone(false)}>Rejouer</Btn></>}
        <div className="grow" />
        <Annot>Soldes de bilan recopiés tout seuls dans le RAN du 01/01 — aucune ressaisie</Annot>
      </div>
    </div>
  );
}

const CL_TABS = [
  { key: "lettrage", label: "Lettrage", comp: TabLettrage },
  { key: "balances", label: "Balances", comp: TabBalances },
  { key: "etats", label: "États financiers", comp: TabEtats },
  { key: "cloture", label: "Nouvel exercice", comp: TabCloture },
];
const CL_SAGE = {
  lettrage: "Sage : on ouvre chaque fiche tiers et on sélectionne à la main les lignes à lettrer une par une.",
  balances: "Sage : chaque balance (générale, tiers, analytique, âgée) s'édite via un menu distinct, à imprimer pour lecture.",
  etats: "Sage : il faut fermer la compta, ouvrir une seconde application « États Comptables et Fiscaux » et y intégrer la balance.",
  cloture: "Sage : la bascule exige de renseigner manuellement le compte de résultat puis de lancer la génération des reports.",
};

Object.assign(window, { CL_TABS, CL_SAGE });
