/* global React, Win, Card, Chip, Btn, Mark, Note, Annot, Ln */
// Flux « Structure comptable » — Tiers · Analytique · Journaux (réadaptation Sage 100 vidéos 04 & 05)

const { useState: useSState } = React;

/* ================= ONGLET 1 — TIERS (comptabilité auxiliaire) ================= */
const TIERS = [
  ["411EPU", "Établissement Public", "Client", "411100", "1 250 000"],
  ["411OBI", "Hôtel Obili", "Client", "411100", "480 000"],
  ["411TOU", "Client Tourisme", "Client", "411100", "0"],
  ["411DIV", "Clients Divers", "Client", "411100", "95 000", "ventes au comptant"],
  ["401GMA", "Garage Maou", "Fournisseur", "401100", "-320 000"],
  ["401SNP", "Société Nationale du Pétrole", "Fournisseur", "401100", "-2 100 000"],
  ["401FRA", "Frères Adjaho", "Fournisseur", "401100", "-150 000"],
  ["401STE", "Société Toutes Pièces", "Fournisseur", "401100", "0"],
];

function TabTiers({ onNew }) {
  const [filt, setFilt] = useSState("Tous");
  const rows = TIERS.filter((r) => filt === "Tous" || r[2] === filt);
  return (
    <div className="main" style={{ padding: 22 }}>
      <div className="flex center g10">
        <div>
          <h2 style={{ margin: 0, fontSize: "1.6em" }}>Plan tiers</h2>
          <div className="muted">Comptabilité auxiliaire : chaque client / fournisseur rattaché à son compte collectif.</div>
        </div>
        <div className="grow" />
        <div className="modeseg">
          {["Tous", "Client", "Fournisseur"].map((f) => (
            <button key={f} className={filt === f ? "on" : ""} onClick={() => setFilt(f)}>{f === "Client" ? "Clients" : f === "Fournisseur" ? "Fournisseurs" : "Tous"}</button>
          ))}
        </div>
        <span className="btn primary" style={{ cursor: "pointer" }} onClick={onNew}>＋ Nouveau tiers</span>
      </div>

      <Card style={{ padding: 0, marginTop: 14 }}>
        <table className="tbl">
          <thead><tr><th>Code</th><th>Intitulé</th><th>Type</th><th>Compte collectif</th><th className="num">Solde (XOF)</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="mono b">{r[0]}</td>
                <td>{r[1]}{r[5] ? <span className="muted small"> — {r[5]}</span> : null}</td>
                <td>{r[2] === "Client" ? <Chip kind="fill">Client</Chip> : <Chip>Fournisseur</Chip>}</td>
                <td className="mono">{r[3]} <span className="chip ai" style={{ fontSize: ".68em" }}>✦ auto</span></td>
                <td className="num mono">{r[4]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Annot style={{ marginTop: 12 }}>Le compte collectif (411100 / 401100) se déduit du type — pas besoin de le ressaisir à chaque fiche</Annot>
    </div>
  );
}

function NewTiersDrawer({ open, onClose }) {
  return (
    <div className="drawer-wrap" style={{ pointerEvents: open ? "auto" : "none" }}>
      <div className="drawer-scrim" onClick={onClose} style={{ opacity: open ? 1 : 0 }} />
      <div className="drawer" style={{ transform: open ? "translateX(0)" : "translateX(102%)" }}>
        <div className="flex center g8"><span className="b" style={{ fontSize: "1.2em" }}>Nouveau tiers</span><div className="grow" /><span onClick={onClose} style={{ cursor: "pointer" }} className="muted">✕</span></div>

        <div className="col g6 mt12">
          <span className="small b">Type</span>
          <div className="modeseg"><button className="on">Client</button><button>Fournisseur</button></div>
        </div>

        <div className="col g6 mt12">
          <span className="small b">Intitulé</span>
          <div className="sk" style={{ padding: "10px 12px", background: "var(--panel)" }}>Hôtel Obili</div>
        </div>

        <div className="card fill mt12" style={{ padding: 12 }}>
          <div className="flex center g8"><span className="chip ai">✦ Code proposé</span></div>
          <div className="b mt8" style={{ fontSize: "1.2em" }} ><span className="mono"><Mark>411OBI</Mark></span></div>
          <span className="muted small">racine du collectif + initiales de l'intitulé — modifiable</span>
        </div>

        <div className="card mt12" style={{ padding: 12 }}>
          <div className="flex center g8"><span className="small b">Compte collectif</span><div className="grow" /><span className="chip ai" style={{ fontSize: ".7em" }}>✦ auto</span></div>
          <div className="mono b mt8">411100 — Clients</div>
          <span className="muted small">déduit du type Client</span>
        </div>

        <div className="adv" style={{ marginTop: 12 }}>
          <div className="adv-h"><span className="chip accent">⚙ Fiche complète</span><span className="muted small">réalités locales</span></div>
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div className="col g6"><span className="small b">NIF / IFU</span><div className="sk" style={{ padding: "8px 10px", background: "var(--panel)" }}>—</div></div>
            <div className="col g6"><span className="small b">Mobile Money</span><div className="sk" style={{ padding: "8px 10px", background: "var(--panel)" }}>Flooz / T-Money</div></div>
            <div className="col g6"><span className="small b">Téléphone</span><div className="sk" style={{ padding: "8px 10px", background: "var(--panel)" }}>+228…</div></div>
            <div className="col g6"><span className="small b">Délai de règlement</span><div className="sk" style={{ padding: "8px 10px", background: "var(--panel)" }}>30 j</div></div>
          </div>
        </div>

        <div className="flex g8 mt12"><span className="btn primary" style={{ flex: 1, justifyContent: "center" }}>Créer & ajouter un autre</span><Btn>Créer</Btn></div>
      </div>
    </div>
  );
}

/* ================= ONGLET 2 — ANALYTIQUE ================= */
const SECTIONS = [
  ["BUSA", "Bus A", "+1 240 000", "ok"],
  ["BUSB", "Bus B", "-310 000", "warn"],
  ["BUSC", "Bus C", "+860 000", "ok"],
];

function TabAnalytique({ mode }) {
  return (
    <div className="main" style={{ padding: 22 }}>
      <div className="flex center g10">
        <div>
          <h2 style={{ margin: 0, fontSize: "1.6em" }}>Comptabilité analytique</h2>
          <div className="muted">Suivre la rentabilité par axe — ici, par véhicule de la flotte.</div>
        </div>
        <div className="grow" />
        <span className="chip fill">Axe : Flotte ▾</span>
        <span className="btn primary" style={{ cursor: "pointer" }}>＋ Section</span>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.1fr 1fr", marginTop: 14 }}>
        {/* sections */}
        <Card>
          <div className="card-h"><span className="t">Sections de l'axe « Flotte »</span></div>
          <div className="col g10">
            {SECTIONS.map((s, i) => (
              <div key={i} className="flex center g10 card" style={{ padding: "9px 12px" }}>
                <span className="icon-sq">🚌</span>
                <div className="col"><span className="b">{s[1]}</span><span className="muted small mono">{s[0]}</span></div>
                <div className="grow" />
                <span className="muted">✎</span>
              </div>
            ))}
          </div>
          {mode === "avance"
            ? <div className="adv" style={{ marginTop: 12 }}><div className="adv-h"><span className="chip accent">⚙ Axes multiples</span></div><div className="flex g8 wrap"><Chip kind="fill">Flotte ✓</Chip><Chip>＋ Chantier</Chip><Chip>＋ Projet</Chip><Chip>＋ Agence</Chip></div><span className="muted small">Plusieurs axes croisés possibles (ex. Bus × Ligne)</span></div>
            : <div className="adv-collapsed" style={{ marginTop: 12 }}><span className="chip">⚙ Axes multiples (Chantier, Projet…)</span><span className="muted small">mode Avancé</span></div>}
        </Card>

        {/* payoff : résultat par section */}
        <Card fill>
          <div className="card-h"><span className="t">Aperçu — résultat par bus</span><div className="grow" /><Chip kind="ai">✦ en fin d'exercice</Chip></div>
          <table className="tbl">
            <thead><tr><th>Section</th><th className="num">Produits</th><th className="num">Charges</th><th className="num">Résultat</th></tr></thead>
            <tbody>
              {SECTIONS.map((s, i) => (
                <tr key={i}>
                  <td className="b">{s[1]}</td>
                  <td className="num mono muted">…</td>
                  <td className="num mono muted">…</td>
                  <td className="num mono">{s[3] === "warn" ? <Chip kind="warn">{s[2]}</Chip> : <Chip kind="accent">{s[2]}</Chip>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Annot style={{ marginTop: 10 }}>Bus B est déficitaire — détecté automatiquement, sans calcul manuel</Annot>
        </Card>
      </div>

      <Card style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12 }}>
        <span className="chip ai">✦ À la saisie</span>
        <span>Dès qu'une charge (carburant, pièces) ou une recette est saisie sur un journal analytique, un <b>volet de ventilation</b> propose le bus concerné — pré-suggéré par l'IA selon le libellé.</span>
      </Card>
    </div>
  );
}

/* ================= ONGLET 3 — JOURNAUX ================= */
const JOURNAUX = [
  ["ACH", "Achat", "Journal d'achat", ["analytique"]],
  ["VT", "Vente", "Journal de vente", ["analytique"]],
  ["RAN", "Général", "Report à nouveau", ["bilan d'ouverture"]],
  ["OD", "Général", "Opérations diverses", []],
  ["PE", "Général", "Journal de paie", []],
  ["CAI", "Trésorerie", "Journal de caisse", ["571100", "contrepartie auto"]],
  ["BIMA", "Trésorerie", "Banque BIMA", ["521100", "contrepartie auto", "rapprochement"]],
  ["BTCI", "Trésorerie", "Banque BTCI", ["521200", "contrepartie auto"]],
];
function TypeBadge({ t }) {
  const map = { Achat: "fill", Vente: "fill", "Trésorerie": "accent", "Général": "" };
  return <span className={"chip " + (map[t] || "")}>{t}</span>;
}

function TabJournaux({ onNew }) {
  return (
    <div className="main" style={{ padding: 22 }}>
      <div className="flex center g10">
        <div>
          <h2 style={{ margin: 0, fontSize: "1.6em" }}>Codes journaux</h2>
          <div className="muted">Les réceptacles de saisie — pré-créés selon le SYSCOHADA, options intelligentes par type.</div>
        </div>
        <div className="grow" />
        <span className="btn primary" style={{ cursor: "pointer" }} onClick={onNew}>＋ Nouveau journal</span>
      </div>

      <Card style={{ padding: 0, marginTop: 14 }}>
        <table className="tbl">
          <thead><tr><th>Code</th><th>Type</th><th>Intitulé</th><th>Options</th></tr></thead>
          <tbody>
            {JOURNAUX.map((j, i) => (
              <tr key={i}>
                <td className="mono b">{j[0]}</td>
                <td><TypeBadge t={j[1]} /></td>
                <td>{j[2]}</td>
                <td>
                  <div className="flex g6 wrap">
                    {j[3].map((o, k) => (
                      <span key={k} className={"chip " + (/^\d/.test(o) ? "" : o === "analytique" ? "ai" : "fill")} style={{ fontSize: ".72em" }}>
                        {o === "analytique" ? "✦ analytique" : /^\d/.test(o) ? "cpte " + o : o}
                      </span>
                    ))}
                    {j[3].length === 0 && <span className="muted small">—</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Annot style={{ marginTop: 12 }}>Type Trésorerie → DaCompta propose tout seul le compte, la contrepartie auto et le rapprochement</Annot>
    </div>
  );
}

function NewJournalDrawer({ open, onClose }) {
  const [type, setType] = useSState("Trésorerie");
  const types = ["Achat", "Vente", "Trésorerie", "Général", "Situation"];
  return (
    <div className="drawer-wrap" style={{ pointerEvents: open ? "auto" : "none" }}>
      <div className="drawer-scrim" onClick={onClose} style={{ opacity: open ? 1 : 0 }} />
      <div className="drawer" style={{ transform: open ? "translateX(0)" : "translateX(102%)" }}>
        <div className="flex center g8"><span className="b" style={{ fontSize: "1.2em" }}>Nouveau journal</span><div className="grow" /><span onClick={onClose} style={{ cursor: "pointer" }} className="muted">✕</span></div>

        <div className="grid mt12" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="col g6"><span className="small b">Code</span><div className="sk" style={{ padding: "9px 11px", background: "var(--panel)" }}><span className="mono">BIMA</span></div></div>
          <div className="col g6"><span className="small b">Intitulé</span><div className="sk" style={{ padding: "9px 11px", background: "var(--panel)" }}>Banque BIMA</div></div>
        </div>

        <div className="col g6 mt12">
          <span className="small b">Type de journal</span>
          <div className="flex g6 wrap">
            {types.map((tp) => (
              <span key={tp} className={"chip " + (tp === type ? "accent" : "fill")} style={{ cursor: "pointer" }} onClick={() => setType(tp)}>{tp}</span>
            ))}
          </div>
        </div>

        {/* options conditionnelles selon type */}
        {type === "Trésorerie" && (
          <div className="card fill mt12" style={{ padding: 12 }}>
            <div className="flex center g8"><span className="chip ai">✦ Options trésorerie</span></div>
            <div className="col g10 mt8">
              <div className="flex center g8"><span className="small b" style={{ width: 150 }}>Compte de trésorerie</span><div className="sk" style={{ flex: 1, padding: "6px 10px", background: "var(--panel)" }}><span className="mono">521100 — Banque BIMA</span></div></div>
              <div className="flex center g8"><span className="modeseg"><button className="on">Contrepartie auto</button><button>Manuelle</button></span></div>
              <div className="flex center g8"><span className="modeseg"><button className="on">Rapprochement ✓</button><button>Off</button></span><span className="muted small">indispensable pour le pointage bancaire</span></div>
            </div>
          </div>
        )}
        {(type === "Achat" || type === "Vente") && (
          <div className="card fill mt12" style={{ padding: 12 }}>
            <div className="flex center g8"><span className="chip ai">✦ Option</span><div className="grow" /><span className="modeseg"><button className="on">Saisie analytique ✓</button><button>Off</button></span></div>
            <span className="muted small">permet de ventiler charges/produits sur les bus (BUSA/B/C)</span>
          </div>
        )}
        {type === "Situation" && (
          <div className="card mt12" style={{ padding: 12, borderColor: "var(--danger)", background: "color-mix(in srgb, var(--danger) 8%, white)" }}>
            <div className="flex center g8"><span className="chip warn">⚠ Garde-fou</span></div>
            <div className="small mt8">Type réservé aux <b>simulations</b> (bilan intermédiaire). DaCompta <Mark>purge automatiquement</Mark> ces écritures avant la clôture — fini le risque de blocage de Sage.</div>
          </div>
        )}
        {type === "Général" && <div className="adv-collapsed mt12"><span className="chip">Aucune option spécifique</span><span className="muted small">OD, paie, dotations…</span></div>}

        <div className="flex g8 mt12"><span className="btn primary" style={{ flex: 1, justifyContent: "center" }}>Créer le journal</span><Btn>Annuler</Btn></div>
      </div>
    </div>
  );
}

const STRUCT_TABS = [
  { key: "tiers", label: "Tiers" },
  { key: "analytique", label: "Analytique" },
  { key: "journaux", label: "Journaux" },
];

Object.assign(window, { TabTiers, NewTiersDrawer, TabAnalytique, TabJournaux, NewJournalDrawer, STRUCT_TABS });
