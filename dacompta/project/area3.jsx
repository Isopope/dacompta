/* global React, Sidebar, Card, Chip, Btn, Mark, Note, Annot, Win, Lines, Ln, Bars */
// Zone 3 — Automatisation & Assistant IA (l'IA suggère, l'humain valide)

/* ---------- PISTE A : OCR → écriture pré-remplie (human-in-the-loop) ---------- */
function Z3_A() {
  return (
    <Win title="DaCompta — pièce à valider">
      <div className="app" style={{ "--side-w": "1fr", gridTemplateColumns: ".95fr 1.05fr" }}>
        {/* doc scanné */}
        <div className="main" style={{ background: "var(--paper)", padding: 18, gap: 12 }}>
          <div className="flex center g8"><Chip kind="fill">Boîte de réception</Chip><span className="muted small">2 / 23 pièces</span><div className="grow" /><Chip kind="ai">✦ lu par OCR</Chip></div>
          <div className="docslot" style={{ flex: 1 }}>
            <div className="flex between center"><span className="b">FACTURE</span><span className="mono small muted">scan_orange_208.jpg</span></div>
            <Ln w="55%" /><div style={{ height: 6 }} />
            <Lines rows={2} widths={["80%", "60%"]} />
            <div className="card" style={{ background: "var(--panel)", marginTop: 8, padding: 10 }}>
              <table className="tbl"><tbody>
                <tr><td>Abonnement fibre</td><td className="num mono">85 000</td></tr>
                <tr><td>TVA 18%</td><td className="num mono">15 300</td></tr>
                <tr><td className="b">Total TTC</td><td className="num mono b">100 300</td></tr>
              </tbody></table>
            </div>
            <Annot>champs reconnus surlignés ✦</Annot>
          </div>
        </div>
        {/* écriture pré-remplie */}
        <div className="main" style={{ padding: 18, gap: 12 }}>
          <div className="flex center g8"><span className="b" style={{ fontSize: "1.15em" }}>Écriture proposée</span><div className="grow" /><Chip kind="ai">confiance 96%</Chip></div>
          <Card>
            <div className="flex between small muted"><span>Journal ACH · 13/06/2026</span><span className="mono">FRN-208</span></div>
            <table className="tbl" style={{ marginTop: 8 }}>
              <thead><tr><th>Compte</th><th>Libellé</th><th className="num">Débit</th><th className="num">Crédit</th></tr></thead>
              <tbody>
                <tr><td className="mono b"><Mark>626</Mark></td><td>Télécom — Orange</td><td className="num mono">85 000</td><td className="num"></td></tr>
                <tr><td className="mono b"><Mark>445</Mark></td><td>TVA récupérable</td><td className="num mono">15 300</td><td className="num"></td></tr>
                <tr><td className="mono b">401</td><td>Fournisseur Orange CI</td><td className="num"></td><td className="num mono">100 300</td></tr>
              </tbody>
            </table>
            <div className="flex between center mt8"><span className="chip">⚖ Équilibrée</span><span className="muted small">surligné = proposé par l'IA</span></div>
          </Card>
          <Card fill style={{ padding: 12 }}>
            <div className="small muted">Pourquoi ces comptes ?</div>
            <div className="small">Fournisseur récurrent « Orange » → compte 626 utilisé sur les 6 dernières factures similaires.</div>
          </Card>
          <div className="flex g10">
            <Btn kind="primary">✓ Valider l'écriture</Btn>
            <Btn>Corriger</Btn>
            <div className="grow" />
            <Btn kind="ghost">Ignorer</Btn>
          </div>
          <Note>L'humain garde la main : rien n'est comptabilisé sans validation</Note>
        </div>
      </div>
    </Win>
  );
}

/* ---------- PISTE B : assistant conversationnel + actions proposées ---------- */
function Z3_B() {
  const nav = [
    { ico: "◎", label: "Tableau de bord" },
    { ico: "✦", label: "Assistant", active: true, badge: "IA" },
    { ico: "✎", label: "Écritures" },
    { ico: "▤", label: "États & DSF" },
  ];
  return (
    <Win title="DaCompta — Assistant">
      <div className="app" style={{ "--side-w": "190px" }}>
        <Sidebar items={nav} />
        <div className="main" style={{ padding: 22, gap: 14 }}>
          <div className="flex center g8"><span className="chip ai">✦ Assistant comptable</span><div className="grow" /><Chip kind="fill">Pharma Plus · 2026</Chip></div>
          <div className="col g14" style={{ flex: 1, gap: 14 }}>
            <div className="bubble me">Quelle est ma trésorerie disponible et que dois-je régler cette semaine ?</div>
            <div className="bubble ai" style={{ maxWidth: "92%" }}>
              <div>Trésorerie consolidée : <b>18,4 M XOF</b> (banque 12,1 + Mobile Money 4,2 + caisse 2,1).</div>
              <div className="card" style={{ background: "var(--panel)", marginTop: 8, padding: 10 }}>
                <Bars data={[30, 42, 38, 55, 48, 62]} h={64} />
              </div>
              <div className="mt8 small">3 échéances cette semaine — total <b>6,8 M</b>. Je peux préparer les règlements (vous validez chacun).</div>
              <div className="flex g8 mt8"><Btn kind="primary" sm>Préparer les règlements</Btn><Btn sm>Voir le détail</Btn></div>
              <div className="annotation annot" style={{ marginTop: 10 }}>l'IA propose une action — l'utilisateur confirme</div>
            </div>
            <div className="bubble me">Génère le compte de résultat provisoire au 31/05.</div>
            <div className="bubble ai"><span className="chip ai">✦</span> Brouillon prêt — <Mark>Résultat net +9,7 M</Mark>. <Btn sm>Ouvrir l'état →</Btn></div>
          </div>
          <div className="flex g8">
            <div className="searchbar" style={{ maxWidth: "100%" }}>✎ <span>Posez une question ou demandez une action…</span></div>
            <Btn kind="primary">Envoyer</Btn>
          </div>
        </div>
      </div>
    </Win>
  );
}

/* ---------- PISTE C : inbox "À vérifier" — anomalies + tâches IA à trier ---------- */
function Z3_C() {
  const nav = [
    { ico: "◎", label: "Tableau de bord" },
    { ico: "⚠", label: "À vérifier", active: true, badge: "11" },
    { ico: "✎", label: "Écritures" },
    { ico: "▤", label: "États & DSF" },
  ];
  const items = [
    ["warn", "Anomalie", "Facture FRN-191 possible doublon de FRN-188", "même montant 240 000 · même jour"],
    ["warn", "Contrôle", "TVA collectée incohérente sur VTE-77", "18% attendu, 0% saisi"],
    ["ai", "Suggestion", "12 lignes bancaires prêtes à lettrer (411 / 521)", "rapprochement auto proposé"],
    ["ai", "Brouillon", "DSF — liasse pré-remplie à 92%", "8 cases à confirmer"],
    ["fill", "Rappel", "Échéance acompte IS le 20/06", "—"],
  ];
  return (
    <Win title="DaCompta — À vérifier">
      <div className="app" style={{ "--side-w": "190px" }}>
        <Sidebar items={nav} />
        <div className="main">
          <div className="topbar">
            <span className="b" style={{ fontSize: "1.2em" }}>À vérifier</span>
            <Chip kind="ai">✦ détecté & préparé par l'IA</Chip>
            <div className="grow" />
            <Chip kind="fill">Tout</Chip><Chip>Anomalies</Chip><Chip>Suggestions</Chip>
          </div>
          <Annot style={{ marginTop: -4 }}>une seule file : l'IA travaille, vous décidez</Annot>
          <div className="col g12" style={{ marginTop: 4 }}>
            {items.map((it, i) => (
              <div key={i} className="card flex center g12" style={{ padding: "12px 14px" }}>
                <span className={"chip " + it[0]} style={{ minWidth: 86, justifyContent: "center" }}>{it[1]}</span>
                <div className="col grow"><span className="b">{it[2]}</span><span className="muted small">{it[3]}</span></div>
                <div className="flex g8">
                  {it[0] === "warn"
                    ? <><Btn sm>Examiner</Btn><Btn kind="ghost" sm>Ignorer</Btn></>
                    : <><Btn kind="primary" sm>✓ Accepter</Btn><Btn kind="ghost" sm>Modifier</Btn></>}
                </div>
              </div>
            ))}
          </div>
          <Note style={{ textAlign: "center", marginTop: 6 }}>Chaque action est tracée — journal d'audit + annulation possible</Note>
        </div>
      </div>
    </Win>
  );
}

Object.assign(window, { Z3_A, Z3_B, Z3_C });
