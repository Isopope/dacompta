/* global React, Win, Card, Chip, Btn, Mark, Note, Annot, Ln */
// Flux « Plan comptable » — workspace SYSCOHADA natif (réadaptation Sage 100)

const { useState: usePState } = React;

/* ---------- données SYSCOHADA (natures correctes) ---------- */
const CLASSES = [
  ["1", "Ressources durables", 24],
  ["2", "Actif immobilisé", 31],
  ["3", "Stocks", 12],
  ["4", "Tiers", 40],
  ["5", "Trésorerie", 18],
  ["6", "Charges des activités ordinaires", 96],
  ["7", "Produits des activités ordinaires", 41],
  ["8", "Autres charges & produits (HAO)", 22],
];

// nature auto-déduite de la racine — pré-configuré, conforme SYSCOHADA révisé
const NATURES = [
  ["40", "Fournisseurs", "Tiers", "Non"],
  ["41", "Clients", "Tiers", "Non"],
  ["42", "Personnel", "Tiers", "Non"],
  ["43", "Organismes sociaux", "Tiers", "Non"],
  ["44", "État & collectivités", "Tiers", "Non"],
  ["11", "Réserves", "Capitaux", "Oui"],
  ["12", "Report à nouveau", "Capitaux", "Oui"],
  ["52", "Banques", "Trésorerie", "Oui"],
  ["57", "Caisse", "Trésorerie", "Oui"],
  ["6", "Charges (activités ordinaires)", "Gestion", "Non"],
  ["7", "Produits (activités ordinaires)", "Gestion", "Non"],
  ["8", "Charges & produits HAO", "Gestion", "Non"],
];

// comptes de la société "Les Associés SA" (issus du cas pratique, natures correctes)
const ACCOUNTS = [
  ["121000", "Report à nouveau créditeur", "Détail", "Report à nouveau", "Oui"],
  ["129000", "Report à nouveau débiteur", "Détail", "Report à nouveau", "Oui"],
  ["120000", "Report à nouveau", "Total", "—", "Oui"],
  ["401100", "Fournisseurs", "Détail", "Fournisseurs", "Non", true],
  ["411100", "Clients", "Détail", "Clients", "Non", true],
  ["521100", "Banque BIMA", "Détail", "Banques", "Oui"],
  ["521200", "Banque BTCI", "Détail", "Banques", "Oui"],
  ["571100", "Caisse siège", "Détail", "Caisse", "Oui"],
  ["601100", "Achats de marchandises", "Détail", "Charges", "Non"],
];

function TypeChip({ t }) {
  if (t === "Total") return <span className="chip" style={{ background: "var(--fill-2)" }}>Σ Total</span>;
  if (t === "Détail") return <span className="chip fill">✎ Détail</span>;
  return <span className="muted">—</span>;
}

/* ================= ONGLET 1 — PLAN COMPTABLE ================= */
function TabPlan({ onNew }) {
  const [cls, setCls] = usePState("4");
  return (
    <div className="flex" style={{ minHeight: 540 }}>
      {/* arbre des classes */}
      <aside className="side" style={{ width: 250, flex: "none" }}>
        <div className="flex center g8" style={{ margin: "0 4px 8px" }}>
          <span className="b">Classes SYSCOHADA</span><div className="grow" /><span className="chip ai" style={{ fontSize: ".7em" }}>✦ pré-chargé</span>
        </div>
        {CLASSES.map((c) => (
          <div key={c[0]} className={"nav-item" + (c[0] === cls ? " active" : "")} onClick={() => setCls(c[0])} style={{ cursor: "pointer" }}>
            <span className="ico b">{c[0]}</span>
            <span style={{ flex: 1, lineHeight: 1.05 }}>{c[1]}</span>
            <span className="muted small">{c[2]}</span>
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <div className="card fill small" style={{ padding: 10 }}>712 comptes prêts — 0 à recréer à la main</div>
      </aside>

      {/* table des comptes */}
      <div className="main">
        <div className="topbar">
          <div className="searchbar">⌕ <span>Filtrer un compte (n° ou intitulé)…</span></div>
          <div className="grow" />
          <Btn>↥ Importer (Excel / Sage)</Btn>
          <span className="btn primary" style={{ cursor: "pointer" }} onClick={onNew}>＋ Nouveau compte</span>
        </div>
        <Card style={{ padding: 0 }}>
          <table className="tbl">
            <thead><tr><th>N° (6 chiffres)</th><th>Intitulé</th><th>Type</th><th>Nature</th><th>Report N+1</th><th></th></tr></thead>
            <tbody>
              {ACCOUNTS.map((a, i) => (
                <tr key={i}>
                  <td className="mono b">{a[0]}</td>
                  <td>{a[1]}</td>
                  <td><TypeChip t={a[2]} /></td>
                  <td>{a[3] === "—" ? <span className="muted">—</span> : <span className="chip ai" style={{ fontSize: ".75em" }}>✦ {a[3]}</span>}</td>
                  <td>{a[4] === "Oui" ? <Chip kind="accent">reporté</Chip> : <span className="muted small">remis à 0</span>}</td>
                  <td className="right muted">✎</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <div className="flex center g10">
          <Annot>la « Nature » se remplit toute seule depuis la racine — rien à reparamétrer</Annot>
          <div className="grow" />
          <Btn kind="ghost" sm>＋ Ajouter une banque</Btn>
        </div>
      </div>
    </div>
  );
}

/* ================= ONGLET 2 — NATURES ================= */
function TabNatures({ mode }) {
  return (
    <div className="main" style={{ padding: 22 }}>
      <div className="flex center g10">
        <div>
          <h2 style={{ margin: 0, fontSize: "1.6em" }}>Natures de comptes</h2>
          <div className="muted">Déjà mappées au standard SYSCOHADA révisé — vous n'avez rien à « réapprendre » au logiciel.</div>
        </div>
        <div className="grow" />
        <Chip kind="ai">✦ pré-configuré & conforme</Chip>
      </div>
      <Card style={{ padding: 0, marginTop: 14 }}>
        <table className="tbl">
          <thead><tr><th>Racine</th><th>Nature</th><th>Famille</th><th>Report à nouveau</th>{mode === "avance" && <th>Bornes</th>}</tr></thead>
          <tbody>
            {NATURES.map((n, i) => (
              <tr key={i}>
                <td className="mono b">{n[0]}</td>
                <td>{n[1]}</td>
                <td><span className="chip fill" style={{ fontSize: ".75em" }}>{n[2]}</span></td>
                <td>{n[3] === "Oui" ? <Chip kind="accent">Oui — soldes reportés</Chip> : <span className="muted small">Non — remis à zéro</span>}</td>
                {mode === "avance" && <td className="mono muted small">{n[0]}0000 → {n[0]}ZZZZ</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {mode === "avance"
        ? <div className="adv" style={{ marginTop: 14 }}>
            <div className="adv-h"><span className="chip accent">⚙ Édition avancée</span><span className="muted small">redéfinir une borne, ajouter une nature, adapter à un plan national / IFRS</span></div>
            <div className="flex g10 wrap"><Btn sm>＋ Nouvelle nature</Btn><Btn sm>Modifier les bornes</Btn><Btn sm>Réinitialiser au standard SYSCOHADA</Btn></div>
          </div>
        : <div className="adv-collapsed" style={{ marginTop: 14 }}><span className="chip">⚙ Édition des bornes & natures</span><span className="muted small">réservé au mode Avancé (expert-comptable)</span></div>}
      <Annot style={{ marginTop: 12 }}>Chez Sage : tout ce tableau est à reconstruire à la main, racine par racine, avec des jokers « Z »</Annot>
    </div>
  );
}

/* ================= ONGLET 3 — IMPORTER (mini-flux 4 sous-étapes) ================= */
const IMPORT_STEPS = ["Source", "Correspondance", "Aperçu & contrôles", "Résultat"];

function SubStepper({ steps, cur, onJump }) {
  return (
    <div className="stepper" style={{ marginBottom: 16 }}>
      {steps.map((s, i) => (
        <React.Fragment key={i}>
          <div className={"step " + (i < cur ? "done" : i === cur ? "active" : "")} onClick={() => onJump(i)} style={{ cursor: "pointer" }}>
            <span className="b">{i < cur ? "✓" : i + 1}</span><span className="small">{s}</span>
          </div>
          {i < steps.length - 1 && <span className="step-line" />}
        </React.Fragment>
      ))}
    </div>
  );
}

// mapping (ordre du fichier indépendant : l'IA reconnaît le contenu)
const MAP_ROWS = [
  ["Colonne A", "« 401100, 411100… »", "N° de compte", true],
  ["Colonne B", "« Fournisseurs, Clients… »", "Intitulé", true],
  ["Colonne C", "« D / T »", "Type (Détail/Total)", true],
  ["Colonne D", "« note interne »", "Ignorer", false],
];
const PREVIEW_ROWS = [
  ["101000", "Capital social", "ok", "Capitaux"],
  ["401100", "Fournisseurs", "ok", "✦ Fournisseurs"],
  ["411100", "Clients", "ok", "✦ Clients"],
  ["521100", "Banque BIMA (ligne en double)", "dup", "Banques"],
  ["990000", "Compte interne X", "warn", "hors SYSCOHADA"],
  ["571100", "Caisse siège", "ok", "Caisse"],
];

function TabImport() {
  const [is, setIs] = usePState(0);
  const next = () => setIs((s) => Math.min(IMPORT_STEPS.length - 1, s + 1));
  const back = () => setIs((s) => Math.max(0, s - 1));

  return (
    <div className="main" style={{ padding: 22 }}>
      <h2 style={{ margin: 0, fontSize: "1.6em" }}>Importer un plan comptable</h2>
      <div className="muted">Excel, CSV ou export d'un autre logiciel — déposez le fichier tel quel, l'IA fait le reste.</div>
      <div style={{ marginTop: 14 }}><SubStepper steps={IMPORT_STEPS} cur={is} onJump={setIs} /></div>

      {/* — 0 : SOURCE — */}
      {is === 0 && (
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div className="docslot" style={{ minHeight: 230, justifyContent: "center", alignItems: "center", textAlign: "center" }}>
            <div className="note">Glissez votre fichier ici</div>
            <span className="muted small">.xlsx · .xls · .csv · export Sage</span>
            <Btn>Parcourir…</Btn>
            <span className="chip fill small">plan_les_associes.xlsx · 712 lignes</span>
          </div>
          <div className="col g12">
            <Card fill>
              <div className="flex center g8"><span className="chip ai">✦</span><span className="b">Aucune conversion nécessaire</span></div>
              <div className="small mt8">Pas besoin de créer un format <span className="mono">.ema</span> ni de convertir en <span className="mono">.txt</span> tabulé : on lit le <Mark>.xlsx directement</Mark>.</div>
            </Card>
            <Annot>Chez Sage : 1) créer un masque de format · 2) ré-enregistrer l'Excel en .txt · 3) fournir les deux fichiers</Annot>
          </div>
        </div>
      )}

      {/* — 1 : MAPPING — */}
      {is === 1 && (
        <div className="col g12">
          <div className="flex center g8"><span className="b">Correspondance des colonnes</span><Chip kind="ai">✦ détecté par le contenu</Chip><div className="grow" /><span className="annotation annot small">l'ordre des colonnes n'a aucune importance</span></div>
          <Card style={{ padding: 0 }}>
            <table className="tbl">
              <thead><tr><th>Colonne fichier</th><th>Exemple lu</th><th>Champ DaCompta</th><th>Statut</th></tr></thead>
              <tbody>
                {MAP_ROWS.map((m, i) => (
                  <tr key={i}>
                    <td className="b">{m[0]}</td>
                    <td className="muted small mono">{m[1]}</td>
                    <td><span className="chip fill">{m[2]} <span className="muted">▾</span></span></td>
                    <td>{m[3] ? <Chip kind="accent">✓ mappé</Chip> : <span className="muted small">ignorée</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card fill style={{ padding: 12 }}>
            <span className="small">Minimum requis : <b>N° de compte</b> + <b>Intitulé</b>. Les colonnes Type, Nature ou Report sont optionnelles — sinon DaCompta les <Mark>déduit de la racine</Mark>.</span>
          </Card>
        </div>
      )}

      {/* — 2 : APERÇU & CONTRÔLES — */}
      {is === 2 && (
        <div className="col g12">
          <div className="grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
            <div className="card kpi"><div className="v">712</div><div className="k">lignes lues</div></div>
            <div className="card kpi"><div className="v">707</div><div className="k">prêtes</div></div>
            <div className="card kpi"><div className="v" style={{ color: "var(--accent)" }}>3</div><div className="k">doublons fusionnés</div></div>
            <div className="card kpi"><div className="v" style={{ color: "var(--danger)" }}>2</div><div className="k">à vérifier</div></div>
          </div>
          <Card style={{ padding: 0 }}>
            <table className="tbl">
              <thead><tr><th>N°</th><th>Intitulé</th><th>Nature</th><th>Contrôle</th></tr></thead>
              <tbody>
                {PREVIEW_ROWS.map((r, i) => (
                  <tr key={i}>
                    <td className="mono b">{r[0]}</td>
                    <td>{r[1]}</td>
                    <td>{r[3].startsWith("✦") ? <span className="chip ai" style={{ fontSize: ".72em" }}>{r[3]}</span> : <span className="muted small">{r[3]}</span>}</td>
                    <td>
                      {r[2] === "ok" && <Chip kind="accent">✓ OK</Chip>}
                      {r[2] === "dup" && <Chip kind="fill">doublon → fusionné</Chip>}
                      {r[2] === "warn" && <Chip kind="warn">hors SYSCOHADA — à classer</Chip>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <div className="flex center g12 wrap">
            <span className="small b">Mode d'import :</span>
            <div className="modeseg"><button className="on">Fusionner</button><button>Remplacer tout</button><button>Ajouter seulement</button></div>
            <span className="annotation annot small">« Fusionner » met à jour sans rien casser — réversible, contrairement au « supprimer tout » de Sage</span>
          </div>
        </div>
      )}

      {/* — 3 : RÉSULTAT — */}
      {is === 3 && (
        <div className="col g16" style={{ alignItems: "center", textAlign: "center", padding: "20px 0" }}>
          <span className="icon-sq" style={{ width: 48, height: 48, fontSize: "1.5em", background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" }}>✓</span>
          <div>
            <h2 style={{ margin: 0 }}>710 comptes importés et opérationnels</h2>
            <div className="annotation annot">structurés, natures attribuées, prêts à recevoir des écritures</div>
          </div>
          <div className="flex g10"><span className="btn primary">Ouvrir le plan comptable</span><Btn>Annuler cet import</Btn></div>
          <Note>Import réversible : un clic pour annuler, journal d'audit conservé</Note>
        </div>
      )}

      {/* nav */}
      <div className="flex center g10" style={{ marginTop: 18, borderTop: "2px dashed var(--ink-3)", paddingTop: 14 }}>
        {is > 0 && is < 3 && <Btn onClick={back}>← Retour</Btn>}
        <span className="muted small">Étape {is + 1} / {IMPORT_STEPS.length}</span>
        <div className="grow" style={{ flex: 1 }} />
        {is < 2 && <span className="btn primary" style={{ cursor: "pointer" }} onClick={next}>Continuer →</span>}
        {is === 2 && <span className="btn primary" style={{ cursor: "pointer" }} onClick={next}>Lancer l'import ✓</span>}
        {is === 3 && <span className="btn" style={{ cursor: "pointer" }} onClick={() => setIs(0)}>Nouvel import</span>}
      </div>
    </div>
  );
}

/* ================= DRAWER — NOUVEAU COMPTE ================= */
function NewAccountDrawer({ open, onClose }) {
  return (
    <div className={"drawer-wrap" + (open ? " open" : "")} style={{ pointerEvents: open ? "auto" : "none" }}>
      <div className="drawer-scrim" onClick={onClose} style={{ opacity: open ? 1 : 0 }} />
      <div className="drawer" style={{ transform: open ? "translateX(0)" : "translateX(102%)" }}>
        <div className="flex center g8"><span className="b" style={{ fontSize: "1.2em" }}>Nouveau compte</span><div className="grow" /><span onClick={onClose} style={{ cursor: "pointer" }} className="muted">✕</span></div>

        <div className="col g6 mt12">
          <span className="small b">N° de compte</span>
          <div className="sk" style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 8, background: "var(--panel)" }}>
            <span className="mono b" style={{ fontSize: "1.15em" }}>401<span className="muted">100</span></span>
            <div className="grow" /><span className="chip fill small">complété à 6 chiffres</span>
          </div>
          <span className="muted small">Tapez juste la racine <b>401</b> — on complète par des zéros.</span>
        </div>

        <div className="card fill mt12" style={{ padding: 12 }}>
          <div className="flex center g8"><span className="chip ai">✦ Nature détectée</span><div className="grow" /></div>
          <div className="b mt8" style={{ fontSize: "1.1em" }}><Mark>Fournisseurs</Mark> · famille Tiers</div>
          <span className="muted small">racine 40 → Fournisseurs (SYSCOHADA) — aucune saisie requise</span>
        </div>

        <div className="col g6 mt12">
          <span className="small b">Intitulé</span>
          <div className="sk" style={{ padding: "10px 12px", background: "var(--panel)" }}>Fournisseur ACI Distribution</div>
        </div>

        <div className="grid mt12" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="col g6">
            <span className="small b">Type de compte</span>
            <div className="modeseg"><button className="on">✎ Détail</button><button>Σ Total</button></div>
            <span className="muted small">Détail = on y saisit · Total = totalise les sous-comptes</span>
          </div>
          <div className="col g6">
            <span className="small b">Report à nouveau</span>
            <div className="modeseg"><button>Oui</button><button className="on">Non</button></div>
            <span className="muted small">✦ déduit de la classe (tiers → non reporté)</span>
          </div>
        </div>

        <div className="flex g8 mt12"><span className="btn primary" style={{ flex: 1, justifyContent: "center" }}>Créer & saisir un autre</span><Btn>Créer</Btn></div>
      </div>
    </div>
  );
}

const PC_TABS = [
  { key: "plan", label: "Plan comptable" },
  { key: "natures", label: "Natures" },
  { key: "import", label: "Importer" },
];

Object.assign(window, { TabPlan, TabNatures, TabImport, NewAccountDrawer, PC_TABS });
