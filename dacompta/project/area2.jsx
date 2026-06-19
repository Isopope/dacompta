/* global React, Card, Chip, Btn, Mark, Note, Annot, Win, Lines, Ln */
// Zone 2 — Configuration "zéro-config" (SYSCOHADA, paramétrage)

function StepBar({ steps, current }) {
  return (
    <div className="stepper">
      {steps.map((s, i) => (
        <React.Fragment key={i}>
          <div className={"step " + (i < current ? "done" : i === current ? "active" : "")}>
            <span className="b">{i < current ? "✓" : i + 1}</span>
            <span className="small">{s}</span>
          </div>
          {i < steps.length - 1 && <span className="step-line" />}
        </React.Fragment>
      ))}
    </div>
  );
}

/* ---------- PISTE A : assistant guidé pas-à-pas (smart defaults) ---------- */
function Z2_A() {
  const opts = ["Côte d'Ivoire", "Sénégal", "Cameroun", "Bénin", "Burkina Faso", "Gabon", "Mali", "Togo"];
  return (
    <Win title="DaCompta — nouveau dossier">
      <div className="app onecol">
        <div className="main" style={{ padding: 26, gap: 20 }}>
          <StepBar steps={["Pays", "Activité", "Régime", "Devises", "Prêt"]} current={2} />
          <div className="flex between center wrap g12">
            <div>
              <div className="muted small">Étape 3 / 5</div>
              <h2 style={{ margin: "2px 0", fontSize: "1.7em" }}>Régime fiscal</h2>
            </div>
            <Chip kind="ai">✦ pré-rempli selon le pays + l'activité</Chip>
          </div>

          <div className="grid" style={{ gridTemplateColumns: "1.2fr .9fr", gap: 22 }}>
            <div className="col g12">
              {[
                ["Réel Normal", "CA > 100 M FCFA — états complets + DSF", true],
                ["Réel Simplifié", "CA intermédiaire — états allégés", false],
                ["Impôt Synthétique", "Petites structures / informel", false],
              ].map((o, i) => (
                <div key={i} className="card" style={{ display: "flex", gap: 12, alignItems: "center", borderColor: o[2] ? "var(--accent)" : undefined, background: o[2] ? "var(--accent-soft)" : undefined }}>
                  <span className="icon-sq">{o[2] ? "●" : "○"}</span>
                  <div className="col"><span className="b">{o[0]}</span><span className="muted small">{o[1]}</span></div>
                  <div className="grow" />
                  {o[2] && <Chip kind="accent">recommandé</Chip>}
                </div>
              ))}
              <div className="flex g10 mt8">
                <Btn>← Retour</Btn><div className="grow" /><Btn kind="primary">Continuer →</Btn>
              </div>
            </div>

            <div className="card fill" style={{ position: "relative" }}>
              <div className="card-h"><span className="t">Ce que DaCompta prépare</span></div>
              <div className="col g8">
                {["Plan comptable SYSCOHADA révisé (8 classes)", "Journaux : ACH, VTE, BQ, CA, OD", "Taux TVA 18% + AIRSI", "Liasse DSF + télédéclaration", "Comptes Mobile Money (Wave, OM, MoMo)"].map((t, i) => (
                  <div key={i} className="flex center g8"><span className="chip ai" style={{ padding: "0 7px" }}>✓</span><span className="small">{t}</span></div>
                ))}
              </div>
              <Annot style={{ marginTop: 14 }}>0 ligne de plan comptable à créer à la main</Annot>
            </div>
          </div>
          <Note style={{ textAlign: "center" }}>4 questions → dossier prêt en moins de 2 minutes</Note>
        </div>
      </div>
    </Win>
  );
}

/* ---------- PISTE B : configuration conversationnelle (chat) + aperçu live ---------- */
function Z2_B() {
  return (
    <Win title="DaCompta — configuration assistée">
      <div className="app" style={{ "--side-w": "1fr", gridTemplateColumns: "1.05fr .95fr" }}>
        {/* chat */}
        <div className="main" style={{ background: "var(--paper)", padding: 22, gap: 14 }}>
          <div className="flex center g8"><span className="chip ai">✦ Assistant config</span><span className="muted small">répondez en langage naturel</span></div>
          <div className="col g12" style={{ flex: 1 }}>
            <div className="bubble ai">Bonjour ! Décrivez votre entreprise en une phrase — je m'occupe du paramétrage.</div>
            <div className="bubble me">Boutique d'électronique à Abidjan, 3 salariés, je vends aussi via Wave.</div>
            <div className="bubble ai">
              Parfait. Je configure : <Mark>Côte d'Ivoire · Commerce de détail · Réel Simplifié · XOF</Mark>, TVA 18%, et j'ajoute un compte <b>Wave (585)</b>. C'est bon ?
            </div>
            <div className="flex g8"><Btn kind="primary" sm>Oui, c'est ça</Btn><Btn sm>Préciser…</Btn></div>
          </div>
          <div className="searchbar" style={{ maxWidth: "100%" }}>✎ <span>Votre réponse…</span></div>
        </div>
        {/* aperçu live du plan */}
        <div className="rail" style={{ background: "var(--fill)" }}>
          <div className="flex center g8"><span className="b">Aperçu en direct</span><div className="grow" /><Chip kind="ai">se construit ✦</Chip></div>
          <div className="card" style={{ padding: 12 }}>
            <div className="small muted mono">PLAN COMPTABLE — extrait</div>
            <table className="tbl" style={{ marginTop: 6 }}>
              <tbody>
                {[["411", "Clients"], ["401", "Fournisseurs"], ["521", "Banque"], ["585", "Wave / Mobile Money"], ["601", "Achats marchandises"], ["701", "Ventes"], ["445", "TVA récupérable"]].map((r, i) => (
                  <tr key={i}><td className="mono b">{r[0]}</td><td>{r[1]}</td><td className="right">{i === 3 ? <Chip kind="ai">+ ajouté</Chip> : ""}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <Annot>chaque réponse met à jour le dossier en temps réel</Annot>
        </div>
      </div>
    </Win>
  );
}

/* ---------- PISTE C : galerie de modèles "1 clic" (pays × secteur) ---------- */
function Z2_C() {
  const tpl = [
    ["Commerce de détail", "Côte d'Ivoire · XOF", "Wave + caisse"],
    ["BTP / Construction", "Cameroun · XAF", "Retenues + sous-traitance"],
    ["Microfinance", "Sénégal · XOF", "Comptes clients épargne"],
    ["Restauration", "Bénin · XOF", "TVA + stocks périssables"],
    ["Transport / Logistique", "Mali · XOF", "Carburant + amortissements"],
    ["Cabinet de services", "Gabon · XAF", "Honoraires + AIRSI"],
  ];
  return (
    <Win title="DaCompta — modèles de démarrage">
      <div className="app onecol">
        <div className="main" style={{ padding: 24, gap: 16 }}>
          <div className="flex between center wrap g12">
            <div>
              <h2 style={{ margin: 0, fontSize: "1.7em" }}>Partez d'un modèle local</h2>
              <div className="annotation annot">tout est déjà adapté à votre pays + secteur</div>
            </div>
            <div className="flex g8">
              <Chip kind="fill">Pays ▾</Chip><Chip kind="fill">Secteur ▾</Chip><Chip kind="fill">Devise ▾</Chip>
            </div>
          </div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
            {tpl.map((t, i) => (
              <div key={i} className="card" style={{ display: "flex", flexDirection: "column", gap: 8, borderColor: i === 0 ? "var(--accent)" : undefined }}>
                <div className="flex center g8"><span className="icon-sq">▦</span><span className="b">{t[0]}</span></div>
                <div className="muted small">{t[1]}</div>
                <div className="dash" style={{ height: 52, marginTop: 2 }} />
                <div className="flex center wrap g6"><Chip kind="fill">{t[2]}</Chip></div>
                <div className="flex g8 mt8">
                  <Btn kind={i === 0 ? "primary" : undefined} sm>Utiliser ce modèle</Btn>
                  <Btn kind="ghost" sm>Aperçu</Btn>
                </div>
              </div>
            ))}
          </div>
          <div className="card fill flex center g12" style={{ justifyContent: "space-between" }}>
            <div className="flex center g10"><span className="chip ai">✦</span><span>Aucun modèle ne colle ? <b>L'assistant en crée un sur-mesure</b> à partir d'une description.</span></div>
            <Btn>Décrire mon activité →</Btn>
          </div>
        </div>
      </div>
    </Win>
  );
}

Object.assign(window, { Z2_A, Z2_B, Z2_C });
