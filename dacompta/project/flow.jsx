/* global React, Win, Sidebar, Card, Chip, Btn, Mark, Note, Annot, Ln */
// Flux « Création d'une société » — réadaptation Sage 100 → DaCompta
// Express par défaut · tout modifiable · mode Avancé · multi-référentiel (OHADA / IFRS / plan national)

const { useState: useFState } = React;

/* ---- field with edit affordance ---- */
function Field({ label, value, hint, ai, placeholder, wide, suffix }) {
  return (
    <div className="col g6" style={{ gridColumn: wide ? "1 / -1" : "auto" }}>
      <div className="flex center g8">
        <span className="small b">{label}</span>
        {ai && <span className="chip ai" style={{ padding: "0 7px", fontSize: ".72em" }}>✦ auto</span>}
      </div>
      <div className="sk" style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, background: "var(--panel)" }}>
        {value
          ? <span className={ai ? "mark" : ""} style={{ flex: 1 }}>{value}</span>
          : <span className="muted" style={{ flex: 1 }}>{placeholder}</span>}
        {suffix && <span className="muted small mono">{suffix}</span>}
        <span className="muted small" title="modifier" style={{ cursor: "pointer" }}>✎</span>
      </div>
      {hint && <span className="muted small">{hint}</span>}
    </div>
  );
}

function PickCard({ icon, title, sub, active, onClick }) {
  return (
    <div className="card" onClick={onClick} style={{ display: "flex", flexDirection: "column", gap: 6, cursor: onClick ? "pointer" : "default", borderColor: active ? "var(--accent)" : undefined, background: active ? "var(--accent-soft)" : undefined }}>
      <div className="flex center g8"><span className="icon-sq">{icon}</span><span className="b">{title}</span>{active && <><div className="grow" /><span className="chip accent">✓</span></>}</div>
      <span className="muted small">{sub}</span>
    </div>
  );
}

/* ---- advanced disclosure panel ---- */
function Adv({ mode, label, children }) {
  if (mode !== "avance")
    return (
      <div className="adv-collapsed">
        <span className="chip">⚙ {label}</span>
        <span className="muted small">masqué — passez en mode <b>Avancé</b> pour personnaliser</span>
      </div>
    );
  return (
    <div className="adv">
      <div className="adv-h"><span className="chip accent">⚙ {label}</span><span className="muted small">contrôle complet (expert-comptable)</span></div>
      {children}
    </div>
  );
}

/* ============================== ÉTAPES ============================== */

const COUNTRIES = {
  Togo:        { flag: "TG", zone: "OHADA · UEMOA", ref: "syscohada", cur: "FCFA · XOF", tax: "TVA 18%", ohada: true },
  "Côte d'Ivoire": { flag: "CI", zone: "OHADA · UEMOA", ref: "syscohada", cur: "FCFA · XOF", tax: "TVA 18%", ohada: true },
  Cameroun:    { flag: "CM", zone: "OHADA · CEMAC", ref: "syscohada", cur: "FCFA · XAF", tax: "TVA 19,25%", ohada: true },
  Sénégal:     { flag: "SN", zone: "OHADA · UEMOA", ref: "syscohada", cur: "FCFA · XOF", tax: "TVA 18%", ohada: true },
  Ghana:       { flag: "GH", zone: "Hors OHADA · CEDEAO", ref: "ifrs", cur: "Cedi · GHS", tax: "VAT 15%", ohada: false },
  Nigéria:     { flag: "NG", zone: "Hors OHADA · CEDEAO", ref: "ifrs", cur: "Naira · NGN", tax: "VAT 7,5%", ohada: false },
};
const REFS = {
  syscohada: "SYSCOHADA révisé",
  ifrs: "IFRS / IFRS for SMEs",
  national: "Plan comptable national",
  custom: "Plan personnalisé",
};

// 1 — Pays & référentiel
function Step1({ mode }) {
  const [sel, setSel] = useFState("Togo");
  const c = COUNTRIES[sel];
  return (
    <div className="col g16">
      <div>
        <h2 style={{ margin: 0 }}>Pays & référentiel comptable</h2>
        <div className="muted">Le pays propose un cadre — vous pouvez le changer. DaCompta gère aussi les pays hors zone OHADA.</div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        {Object.keys(COUNTRIES).map((k) => (
          <PickCard key={k} icon={COUNTRIES[k].flag} title={k}
            sub={COUNTRIES[k].ohada ? "zone OHADA" : "hors OHADA"} active={k === sel} onClick={() => setSel(k)} />
        ))}
      </div>

      <Card fill>
        <div className="card-h"><span className="t">Cadre détecté pour {sel}</span><div className="grow" /><Chip kind="ai">✦ ajustable</Chip></div>
        <div className="flex wrap g8">
          <Chip kind={c.ohada ? "fill" : "warn"}>{c.zone}</Chip>
          <Chip kind="fill">Devise {c.cur}</Chip>
          <Chip kind="fill">{c.tax}</Chip>
          <Chip kind="accent">Référentiel : {REFS[c.ref]}</Chip>
        </div>
        {!c.ohada && <div className="annotation annot mt8">Pays hors OHADA → bascule automatique sur IFRS. Le plan, les états et les déclarations s'adaptent.</div>}
      </Card>

      <div>
        <div className="small b" style={{ marginBottom: 8 }}>Référentiel comptable</div>
        <div className="grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
          {Object.keys(REFS).map((r) => (
            <div key={r} className="card flex center g8" style={{ padding: "9px 11px", borderColor: r === c.ref ? "var(--accent)" : undefined, background: r === c.ref ? "var(--accent-soft)" : undefined }}>
              <span className="icon-sq" style={{ width: 24, height: 24 }}>{r === c.ref ? "●" : "○"}</span><span className="small b">{REFS[r]}</span>
            </div>
          ))}
        </div>
      </div>

      <Adv mode={mode} label="Structure du plan">
        <div className="grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
          <Field label="Longueur des comptes" value="6 → 8 chiffres" hint="extensible par sous-comptes" />
          <Field label="Langue des libellés" value="Français + Anglais" />
          <Field label="Multi-établissements" value="Activé — sièges & agences" />
        </div>
      </Adv>
    </div>
  );
}

// 2 — Identité
function Step2({ mode }) {
  return (
    <div className="col g16">
      <div>
        <h2 style={{ margin: 0 }}>Identité de la société</h2>
        <div className="muted">Saisissez le NIF pour pré-remplir — ou renseignez tout manuellement, comme vous préférez.</div>
      </div>
      <Card fill style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span className="chip ai">✦ NIF / IFU</span>
        <div className="sk" style={{ flex: 1, padding: "8px 12px", background: "var(--panel)" }}><span className="mono">100000000 (Togo)</span></div>
        <Btn kind="primary">Vérifier & pré-remplir</Btn>
        <Btn kind="ghost" sm>Saisir à la main</Btn>
      </Card>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Field label="Raison sociale" value="LES ASSOCIÉS SA" ai />
        <Field label="Forme juridique" value="SA — Société Anonyme" />
        <Field label="Activité" value="Transport et vente de pièces" wide />
        <Field label="Capital social" value="50 000 000" suffix="FCFA" />
        <Field label="Régime fiscal" value="Réel Normal" ai hint="déduit du capital + activité — modifiable" />
        <Field label="Adresse" value="123 Bd du Mono" ai />
        <Field label="Ville" value="Lomé" ai />
      </div>
      <Adv mode={mode} label="Identité avancée">
        <div className="grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
          <Field label="RCCM" value="TG-LOM-2020-B-1234" />
          <Field label="Assujetti à la TVA" value="Oui" />
          <Field label="Centre des impôts" value="DGI Lomé-Port" />
        </div>
      </Adv>
    </div>
  );
}

// 3 — Exercice & monnaie
function Step3({ mode }) {
  return (
    <div className="col g16">
      <div>
        <h2 style={{ margin: 0 }}>Exercice & monnaie</h2>
        <div className="muted">Pré-réglé intelligemment — ajustez librement.</div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Card>
          <div className="card-h"><span className="t">Exercice comptable</span><div className="grow" /><span className="muted small">✎ modifier</span></div>
          <div className="flex center g10">
            <div className="sk" style={{ padding: "8px 12px", flex: 1, textAlign: "center", background: "var(--panel)" }}><span className="mono">01 / 01 / 2020</span></div>
            <span className="muted">→</span>
            <div className="sk" style={{ padding: "8px 12px", flex: 1, textAlign: "center", background: "var(--panel)" }}><span className="mono">31 / 12 / 2020</span></div>
          </div>
          <div className="flex center g8 mt12 wrap"><span className="chip fill">12 mois</span><span className="chip">Exercice décalé ?</span><span className="chip">1ʳᵉ année (création en cours) ?</span></div>
        </Card>
        <Card>
          <div className="card-h"><span className="t">Monnaie</span><div className="grow" /><Chip kind="ai">✦ selon le pays</Chip></div>
          <div className="sk" style={{ padding: "10px 14px", background: "var(--accent-soft)", borderColor: "var(--accent)" }}>
            <div className="b">FRANC CFA — XOF</div><div className="muted small">BCEAO · franc</div>
          </div>
          <div className="flex center g8 mt12"><span className="chip accent">Sans décimales</span><span className="muted small">auto pour le FCFA — réversible</span></div>
        </Card>
      </div>
      <Card fill style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className="chip">＋</span>
        <span>Multi-devises ? Ajoutez l'EUR, l'USD, le GHS… pour l'import/export — conversion & écarts de change gérés.</span>
        <div className="grow" /><Btn kind="ghost" sm>Ajouter une devise</Btn>
      </Card>
      <Adv mode={mode} label="Réglages comptables">
        <div className="grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
          <Field label="Période de déclaration TVA" value="Mensuelle" />
          <Field label="Méthode d'arrondi" value="Au franc le plus proche" />
          <Field label="Écarts de conversion" value="Comptes 476 / 477" />
        </div>
      </Adv>
    </div>
  );
}

// 4 — Préparation
function Step4({ mode }) {
  const prepared = [
    ["▦", "Plan comptable SYSCOHADA révisé", "8 classes · 712 comptes pré-chargés"],
    ["▤", "Journaux de saisie", "ACH · VTE · BQ · CA · OD"],
    ["%", "Paramètres fiscaux Togo", "TVA 18% · AIRSI · acomptes IS"],
    ["⇄", "Comptes de trésorerie", "Banque + Caisse + Mobile Money (Flooz, T-Money)"],
    ["▥", "États & déclarations", "Bilan · Résultat · Flux · Liasse DSF Togo"],
    ["⏲", "Exercice ouvert", "2020 · prêt à recevoir des écritures"],
  ];
  return (
    <div className="col g16">
      <div>
        <h2 style={{ margin: 0 }}>Ce que DaCompta a préparé pour vous</h2>
        <div className="muted">Tout est généré automatiquement — et entièrement personnalisable avant validation.</div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        {prepared.map((p, i) => (
          <div key={i} className="card flex center g10" style={{ padding: "11px 13px" }}>
            <span className="icon-sq">{p[0]}</span>
            <div className="col"><span className="b">{p[1]}</span><span className="muted small">{p[2]}</span></div>
            <div className="grow" />
            <span className="muted small" style={{ cursor: "pointer" }}>✎</span>
            <span className="chip accent">✓</span>
          </div>
        ))}
      </div>
      <Card fill style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span className="pill-sync"><span className="dot" /> Sauvegarde cloud + hors-ligne</span>
        <span className="muted small">Rien à enregistrer sur le disque · pas de capacité à dimensionner · accessible partout</span>
      </Card>
      <Adv mode={mode} label="Personnalisation avant création">
        <div className="grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
          <PickCard icon="✎" title="Éditer le plan comptable" sub="ajouter / masquer des comptes" />
          <PickCard icon="↥" title="Importer un plan existant" sub="fichier .csv / export Sage" />
          <PickCard icon="▤" title="Personnaliser les journaux" sub="codes, numérotation" />
        </div>
      </Adv>
    </div>
  );
}

// 5 — Société prête
function Step5() {
  const nav = [
    { ico: "▦", label: "Plan comptable" },
    { ico: "▤", label: "Journaux de saisie" },
    { ico: "⇄", label: "Banques" },
    { ico: "▥", label: "États & DSF" },
    { ico: "✦", label: "Assistant", badge: "IA" },
  ];
  return (
    <div className="col g16">
      <div className="flex center g12">
        <span className="icon-sq" style={{ width: 40, height: 40, fontSize: "1.3em", background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" }}>✓</span>
        <div>
          <h2 style={{ margin: 0 }}>« LES ASSOCIÉS SA · Exercice 2020 » est prête</h2>
          <div className="annotation annot">tous les modules sont actifs — vous pouvez saisir tout de suite</div>
        </div>
      </div>
      <div className="appframe" style={{ boxShadow: "none" }}>
        <div className="win-bar"><div className="dots"><i /><i /><i /></div><span className="small b">LES ASSOCIÉS SA — Exercice 2020 (FCFA)</span></div>
        <div className="flex">
          <aside className="side" style={{ width: 210, flex: "none" }}>
            <div className="brand"><div className="logo">Dₐ</div><div className="name">DaCompta</div></div>
            {nav.map((n, i) => <div key={i} className="nav-item"><span className="ico">{n.ico}</span><span style={{ flex: 1 }}>{n.label}</span>{n.badge && <span className="chip ai" style={{ padding: "0 6px", fontSize: ".7em" }}>{n.badge}</span>}</div>)}
          </aside>
          <div className="main" style={{ padding: 18 }}>
            <Note>Par où commencer ?</Note>
            <div className="grid" style={{ gridTemplateColumns: "repeat(3,1fr)", marginTop: 8 }}>
              <PickCard icon="↥" title="Importer une balance d'ouverture" sub="reprise des soldes 2019" />
              <PickCard icon="✎" title="Saisir la 1ʳᵉ écriture" sub="journal au choix" active />
              <PickCard icon="GR" title="Inviter un collaborateur" sub="cabinet / équipe" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const FLOW_STEPS = [
  { label: "Pays & référentiel", comp: Step1,
    sage: "Sage : aucune notion de pays ni d'OHADA, et un seul référentiel à configurer entièrement. Ici : OHADA, IFRS ou plan national selon le pays — en 1 clic." },
  { label: "Identité", comp: Step2,
    sage: "Sage : ~10 champs sur 2 onglets, saisie 100% manuelle. Ici : pré-rempli depuis le NIF, ou manuel si vous préférez." },
  { label: "Exercice & devise", comp: Step3,
    sage: "Sage : avertissement « décimales irréversible » à valider. Ici : automatique selon la devise, réversible." },
  { label: "Préparation", comp: Step4,
    sage: "Sage : enregistrer un fichier .mae + dimensionner une « capacité » en Ko. Ici : rien à gérer, et le plan reste personnalisable." },
  { label: "Société prête", comp: Step5,
    sage: "Sage : on vérifie que les menus sont « dégrisés ». Ici : tout est actif et on propose la prochaine action." },
];

Object.assign(window, { FLOW_STEPS, Field, PickCard, Adv });
