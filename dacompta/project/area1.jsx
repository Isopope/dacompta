/* global React, Sidebar, DossierSwitcher, Card, Kpi, Bars, Chip, Btn, Mark, Note, Annot, Win, Lines, Ln */
// Zone 1 — Architecture & Tableau de bord

/* ---------- PISTE A : cabinet, orienté portefeuille de dossiers ---------- */
function Z1_A() {
  const nav = [
    { sect: "Cabinet" },
    { ico: "▦", label: "Portefeuille", active: true },
    { ico: "⏲", label: "Échéances", badge: "7" },
    { ico: "✓", label: "Missions" },
    { sect: "Dossier courant" },
    { ico: "✎", label: "Saisie" },
    { ico: "⇄", label: "Banques" },
    { ico: "▤", label: "États & DSF" },
    { ico: "✦", label: "Assistant IA", badge: "IA" },
  ];
  const rows = [
    ["IVOIRE NÉGOCE", "Réel Normal · XOF", "À jour", "DSF 15 mai", "ok"],
    ["BTP Sahel SARL", "Réel Normal · XOF", "12 à valider", "TVA 20 mai", "warn"],
    ["Pharma Plus", "Réel Simplifié · XOF", "À jour", "—", "ok"],
    ["AgriCam SA", "Réel Normal · XAF", "3 anomalies", "DSF 30 mai", "warn"],
    ["Wave Boutique", "Synthétique · XOF", "À jour", "—", "ok"],
  ];
  return (
    <Win title="DaCompta — Cabinet">
      <div className="app" style={{ "--side-w": "215px" }}>
        <Sidebar items={nav} footer={<DossierSwitcher name="Cabinet Diallo & Co" sub="14 dossiers actifs" />} />
        <div className="main">
          <div className="topbar">
            <div className="searchbar">⌕ <span>Rechercher un dossier, un compte, une pièce…</span></div>
            <div className="grow" />
            <Btn>+ Nouveau dossier</Btn>
            <span className="avatar">FD</span>
          </div>

          <div className="grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
            <Kpi v="14" k="Dossiers actifs" />
            <Kpi v="7" k="Échéances < 15 j" trend={<Chip kind="warn">à surveiller</Chip>} />
            <Kpi v="23" k="Pièces à valider" trend={<Chip kind="ai">IA a pré-saisi</Chip>} />
            <Kpi v="4" k="Anomalies détectées" trend={<Chip kind="warn">contrôle</Chip>} />
          </div>

          <Card title="Portefeuille de dossiers" right={<><Chip kind="fill">Tous</Chip><Chip>À traiter</Chip></>}>
            <table className="tbl">
              <thead><tr><th>Société</th><th>Régime · devise</th><th>État saisie</th><th>Prochaine échéance</th><th></th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="b">{r[0]}</td>
                    <td className="muted">{r[1]}</td>
                    <td>{r[4] === "warn" ? <Chip kind="warn">{r[2]}</Chip> : <Chip kind="fill">{r[2]}</Chip>}</td>
                    <td>{r[3]}</td>
                    <td className="right"><Btn sm>Ouvrir →</Btn></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    </Win>
  );
}

/* ---------- PISTE B : entreprise unique, barre de commande centrale ---------- */
function Z1_B() {
  const nav = [
    { ico: "◎", label: "Tableau de bord", active: true },
    { ico: "✎", label: "Écritures" },
    { ico: "⇄", label: "Banque & Mobile Money" },
    { ico: "▤", label: "États financiers" },
    { ico: "▦", label: "Plan comptable" },
    { ico: "✦", label: "Assistant", badge: "IA" },
    { sect: "" },
    { ico: "⚙", label: "Paramètres" },
  ];
  return (
    <Win title="DaCompta — IVOIRE NÉGOCE">
      <div className="app" style={{ "--side-w": "205px" }}>
        <Sidebar items={nav} footer={<span className="pill-sync"><span className="dot" /> Hors-ligne prêt</span>} />
        <div className="main" style={{ gap: "var(--gap)" }}>
          {/* big command bar hero */}
          <div className="card fill" style={{ display: "flex", flexDirection: "column", gap: 12, padding: 22, position: "relative" }}>
            <div className="muted">Bonjour Awa — exercice 2026, FCFA (XOF)</div>
            <div className="searchbar" style={{ maxWidth: "100%", padding: "12px 16px", fontSize: "1.1em" }}>
              ⌘K <span>Demandez ou agissez : « passe la facture Orange », « ma trésorerie ? »…</span>
            </div>
            <div className="flex wrap g8">
              <Chip kind="accent">＋ Saisir une pièce</Chip>
              <Chip>Importer relevé</Chip>
              <Chip kind="ai">✦ Générer bilan provisoire</Chip>
              <Chip>Lettrer 411 / 401</Chip>
            </div>
            <Annot style={{ position: "absolute", right: -6, top: -22 }}>une seule boîte : chercher + commander + demander à l'IA</Annot>
          </div>

          <div className="grid" style={{ gridTemplateColumns: "1.3fr 1fr" }}>
            <Card title="Trésorerie (90 j)" right={<Chip kind="fill">XOF</Chip>}>
              <Bars data={[40, 52, 48, 61, 70, 58, 82]} />
              <div className="flex between mt12">
                <div><div className="kpi"><div className="v">18,4 M</div><div className="k">Solde banques + caisse</div></div></div>
                <div className="col g6">
                  <span className="small"><Chip kind="fill">Banque 12,1 M</Chip></span>
                  <span className="small"><Chip kind="fill">Wave / OM 4,2 M</Chip></span>
                  <span className="small"><Chip kind="fill">Caisse 2,1 M</Chip></span>
                </div>
              </div>
            </Card>
            <Card title="À faire" right={<Chip kind="ai">✦ priorisé par l'IA</Chip>}>
              <div className="col g10">
                <div className="flex center g8"><span className="chip ai">IA</span><Ln w="70%" /></div>
                <div className="flex center g8"><span className="chip warn">!</span><Ln w="60%" /></div>
                <div className="flex center g8"><span className="chip">⏲</span><Ln w="80%" /></div>
                <div className="flex center g8"><span className="chip">⏲</span><Ln w="55%" /></div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Win>
  );
}

/* ---------- PISTE C : 3 colonnes, rail copilote IA permanent ---------- */
function Z1_C() {
  const nav = [
    { ico: "◎", label: "Activité", active: true },
    { ico: "✎", label: "Écritures" },
    { ico: "⇄", label: "Banques" },
    { ico: "▤", label: "États & DSF" },
    { ico: "▦", label: "Plan SYSCOHADA" },
  ];
  return (
    <Win title="DaCompta — espace de travail">
      <div className="app threecol" style={{ "--side-w": "190px", "--rail-w": "295px" }}>
        <Sidebar items={nav} footer={<DossierSwitcher name="Pharma Plus" sub="Réel simplifié" />} />
        {/* centre : flux d'activité + KPI */}
        <div className="main">
          <div className="topbar">
            <div className="searchbar">⌕ <span>Filtrer l'activité…</span></div>
            <div className="grow" /><Btn>+ Pièce</Btn>
          </div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
            <Kpi v="9,7 M" k="Résultat à date" />
            <Kpi v="61%" k="Saisie de l'exercice" />
            <Kpi v="3" k="Échéances" />
          </div>
          <Card title="Flux d'activité">
            <div className="col g12">
              {[
                ["✎", "Facture FRN-208 saisie", "il y a 5 min", "fill"],
                ["✦", "IA a proposé 4 imputations", "il y a 12 min", "ai"],
                ["⇄", "Relevé Ecobank importé (32 lignes)", "ce matin", "fill"],
                ["!", "Anomalie : TVA 18% attendue", "hier", "warn"],
              ].map((r, i) => (
                <div key={i} className="flex center g10">
                  <span className={"chip " + r[3]}>{r[0]}</span>
                  <div className="grow"><div className="b">{r[1]}</div></div>
                  <span className="muted small">{r[2]}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
        {/* rail copilote */}
        <aside className="rail">
          <div className="rail-h"><span className="chip ai">✦ Copilote</span><div className="grow" /><span className="muted">⤢</span></div>
          <Note>« Toujours là, jamais intrusif »</Note>
          <div className="bubble ai small">J'ai repéré 4 pièces à imputer et 1 anomalie TVA. Je prépare des propositions — tu valides.</div>
          <div className="card" style={{ padding: 11 }}>
            <div className="small muted">Proposition</div>
            <div className="b">FRN-208 → 601 / 445</div>
            <div className="flex g8 mt8"><Btn kind="primary" sm>Valider</Btn><Btn sm>Voir</Btn></div>
          </div>
          <div style={{ flex: 1 }} />
          <div className="searchbar" style={{ background: "var(--panel)" }}>✎ <span>Poser une question…</span></div>
        </aside>
      </div>
    </Win>
  );
}

Object.assign(window, { Z1_A, Z1_B, Z1_C });
