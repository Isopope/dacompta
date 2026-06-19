/* global React, Win, Card, Chip, Btn, Mark, Note, Annot, Ln */
// Flux « Saisie d'écritures » — Bilan d'ouverture, journal RAN (réadaptation Sage 100 vidéo 06, parties 1 & 2)

const { useState: useEState } = React;
const fmt = (n) => n.toLocaleString("fr-FR");

// — Partie 1 : actif de départ + emprunt (181000 ajusté à 19 988 900 pour cohérence d'équilibre)
const LINES_BASE = [
  ["232300", "Bâtiments administratifs", 10000000, 0],
  ["245100", "Matériel de transport", 8150000, 0],
  ["244400", "Matériel de bureau", 340000, 0],
  ["244425", "Mobilier de bureau", 1500000, 0],
  ["244475", "Matériel complémentaire", 750000, 0],
  ["521100", "Banque BIMA", 6500000, 0, "treso"],
  ["521200", "Banque BTCI", 10000000, 0, "treso"],
  ["244200", "Matériel informatique", 1290000, 0],
  ["181000", "Compte courant associé", 19988900, 0, "flag"],
  ["311100", "Stocks de marchandises", 2160000, 0],
  ["162000", "Emprunts ét. de crédit", 0, 12000000],
];
// — Partie 2a : tiers créés « à la volée » + caisse
const LINES_TIERS = [
  ["411FILS", "Ets Fils — Client", 1115000, 0, "tiers"],
  ["401SASS", "Sass Moteur — Fournisseur", 0, 1125000, "tiers"],
  ["571100", "Caisse siège", 1331100, 0, "treso"],
];
// — Partie 2b : capital qui équilibre exactement
const LINES_CAPITAL = [
  ["101300", "Capital souscrit, appelé, versé", 0, 50000000, "ia"],
];

function EquilibriumBar({ debit, credit }) {
  const solde = debit - credit;
  const ok = solde === 0;
  return (
    <div className="card" style={{ padding: "12px 16px", borderColor: ok ? "var(--accent)" : "var(--danger)", background: ok ? "var(--accent-soft)" : "color-mix(in srgb, var(--danger) 8%, white)", position: "sticky", bottom: 0 }}>
      <div className="flex center g16 wrap">
        <div className="col"><span className="muted small">Total Débit</span><span className="b mono" style={{ fontSize: "1.2em" }}>{fmt(debit)}</span></div>
        <span className="muted">=</span>
        <div className="col"><span className="muted small">Total Crédit</span><span className="b mono" style={{ fontSize: "1.2em" }}>{fmt(credit)}</span></div>
        <div className="grow" />
        {ok ? (
          <div className="flex center g8"><span className="chip accent" style={{ fontSize: ".95em" }}>⚖ Équilibrée ✓</span><span className="muted small">la pièce peut être validée</span></div>
        ) : (
          <div className="flex center g10">
            <div className="col" style={{ textAlign: "right" }}>
              <span className="muted small">Solde à compléter au crédit</span>
              <span className="b mono" style={{ fontSize: "1.25em", color: "var(--danger)" }}>{fmt(Math.abs(solde))}</span>
            </div>
            <span className="chip warn">déséquilibre</span>
          </div>
        )}
      </div>
    </div>
  );
}

function BilanOuverture() {
  const [phase, setPhase] = useEState(0); // 0 base · 1 +tiers · 2 +capital
  const rows = [...LINES_BASE, ...(phase >= 1 ? LINES_TIERS : []), ...(phase >= 2 ? LINES_CAPITAL : [])];
  const debit = rows.reduce((s, r) => s + r[2], 0);
  const credit = rows.reduce((s, r) => s + r[3], 0);

  return (
    <div className="flex" style={{ minHeight: 560 }}>
      <div className="main" style={{ padding: 18, flex: 1 }}>
        {/* en-tête de pièce */}
        <Card style={{ padding: 12 }}>
          <div className="flex center g12 wrap">
            <div className="col g6"><span className="muted small">Journal</span><span className="chip fill"><b className="mono">RAN</b> · Report à nouveau ▾</span></div>
            <div className="col g6"><span className="muted small">Date</span><span className="sk" style={{ padding: "5px 10px", background: "var(--panel)" }}><span className="mono">01/01/2020</span></span></div>
            <div className="col g6"><span className="muted small">N° pièce</span><span className="sk" style={{ padding: "5px 10px", background: "var(--panel)" }}><span className="mono">012020</span> <span className="chip ai" style={{ fontSize: ".68em" }}>✦ auto</span></span></div>
            <div className="col g6"><span className="muted small">Libellé</span><span className="sk" style={{ padding: "5px 10px", background: "var(--panel)" }}>Ouverture</span></div>
            <div className="grow" />
            <span className="chip fill small">Janvier 2020</span>
          </div>
        </Card>

        {/* grille */}
        <Card style={{ padding: 0, marginTop: 12 }}>
          <table className="tbl">
            <thead><tr><th>Compte</th><th>N° Tiers</th><th>Libellé</th><th className="num">Débit</th><th className="num">Crédit</th><th></th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} style={r[4] === "ia" ? { background: "var(--accent-soft)" } : r[4] === "tiers" ? { background: "var(--mark)" } : null}>
                  <td className="mono b">{r[0].startsWith("4") && r[4] === "tiers" ? (r[0].startsWith("411") ? "411100" : "401100") : r[0]}</td>
                  <td className="mono small">{r[4] === "tiers" ? r[0] : ""}</td>
                  <td>
                    {r[1]}
                    {r[4] === "treso" && <span className="chip fill" style={{ fontSize: ".66em", marginLeft: 6 }}>trésorerie ✓</span>}
                    {r[4] === "flag" && <span className="chip warn" style={{ fontSize: ".66em", marginLeft: 6 }}>ajusté · à vérifier</span>}
                    {r[4] === "tiers" && <span className="chip ai" style={{ fontSize: ".66em", marginLeft: 6 }}>✦ tiers créé à la volée</span>}
                    {r[4] === "ia" && <span className="chip ai" style={{ fontSize: ".66em", marginLeft: 6 }}>✦ ajouté</span>}
                  </td>
                  <td className="num mono">{r[2] ? fmt(r[2]) : ""}</td>
                  <td className="num mono">{r[3] ? fmt(r[3]) : ""}</td>
                  <td className="right muted small">✎</td>
                </tr>
              ))}
              <tr>
                <td colSpan="6" style={{ padding: "8px" }}>
                  <span className="btn ghost sm">＋ Ligne</span>
                  <span className="muted small" style={{ marginLeft: 10 }}>tapez un code tiers inconnu (ex. <b className="mono">411FILS</b>) → la fiche se crée sans quitter la saisie</span>
                </td>
              </tr>
            </tbody>
          </table>
        </Card>

        {/* phase 0 → saisir les tiers */}
        {phase === 0 && (
          <div className="card" style={{ marginTop: 12, padding: 12, borderColor: "var(--mark-edge)", background: "var(--mark)" }}>
            <div className="flex center g10">
              <span className="chip ai">✦ Suite de la pièce</span>
              <span className="small">Il reste à enregistrer un client et un fournisseur <b>non encore fichés</b>, puis la caisse. On les crée <Mark>à la volée</Mark> dans la grille.</span>
              <div className="grow" />
              <span className="btn primary sm" style={{ cursor: "pointer" }} onClick={() => setPhase(1)}>Saisir les tiers →</span>
            </div>
          </div>
        )}

        {/* phase 1 → ajouter capital */}
        {phase === 1 && (
          <div className="card" style={{ marginTop: 12, padding: 12, borderColor: "var(--mark-edge)", background: "var(--mark)" }}>
            <div className="flex center g10">
              <span className="chip ai">✦ Assistant</span>
              <span className="small"><b className="mono">411FILS</b> et <b className="mono">401SASS</b> créés à la volée — collectifs <b>411100 / 401100</b> insérés tout seuls. Le déséquilibre est désormais de <Mark>{fmt(debit - credit)}</Mark>, soit <b>exactement le capital social</b>.</span>
              <div className="grow" />
              <span className="btn primary sm" style={{ cursor: "pointer" }} onClick={() => setPhase(2)}>Ajouter le capital (101300)</span>
            </div>
          </div>
        )}

        {/* contrôle d'équilibre vivant */}
        <div style={{ marginTop: 12 }}><EquilibriumBar debit={debit} credit={credit} /></div>

        {phase === 2 && (
          <div className="flex center g10 wrap" style={{ marginTop: 12 }}>
            <span className="btn primary">✓ Valider la pièce</span>
            <Btn onClick={() => setPhase(0)}>Rejouer</Btn>
            <span className="chip accent">RAN · Janvier ✓ enregistrée</span>
            <div className="grow" />
            <Annot>partie double respectée — solde 0,00</Annot>
          </div>
        )}
      </div>

      {/* rail : confort & sécurité par défaut */}
      <aside className="rail" style={{ width: 290, flex: "none", background: "var(--paper)", borderLeft: "2px solid var(--line)" }}>
        <div className="flex center g8"><span className="chip ai">✦ Saisie confortable</span></div>
        <Note style={{ fontSize: "1.25em" }}>Aucune sécurité à désactiver</Note>
        <div className="col g10">
          {[
            ["Créer un tiers / compte à la volée", "natif — pas d'option à cocher au préalable"],
            ["Collectif auto-inséré", "411FILS → 411100, sans le retaper"],
            ["Corriger / supprimer une ligne", "libre tant que non validée, avec audit"],
            ["Numéro de pièce", "modifiable — pas de « zone protégée »"],
          ].map((x, i) => (
            <div key={i} className="card" style={{ padding: 10 }}>
              <div className="flex center g8"><span className="chip accent" style={{ fontSize: ".7em" }}>✓</span><span className="small b">{x[0]}</span></div>
              <span className="muted small">{x[1]}</span>
            </div>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <div className="annotation annot small">Chez Sage : la création « à la volée » n'est possible qu'après avoir coché « autoriser la création de compte en saisie » au préalable.</div>
      </aside>
    </div>
  );
}

Object.assign(window, { BilanOuverture });
