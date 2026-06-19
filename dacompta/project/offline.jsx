/* global React, Win, Card, Chip, Btn, Mark, Note, Annot, Kpi */
// Flux « Offline-first » — saisie hors-ligne → sync → résolution de conflits
// Pilier 3. Cas fil rouge : collaborateur en déplacement (Kpalimé, Togo — réseau instable).

const { useState: useOfState } = React;

// file d'attente offline : [heure, journal, libellé, montant, statut sync]
const QUEUE = [
  ["08:12", "CAI", "Vente tickets bus Kpalimé", 285000, "synced"],
  ["09:45", "CAI", "Achat de carburant — station ENI", 142500, "synced"],
  ["11:30", "ACH", "Facture pièces détachées — Garage Esso", 378000, "synced"],
  ["14:15", "CAI", "Vente tickets retour Lomé", 310000, "pending"],
  ["15:40", "CAI", "Règlement mécanicien — espèces", 95000, "pending"],
  ["16:20", "BQ", "Virement reçu client SOTRA", 1200000, "conflict"],
];

const CONFLICT = {
  local: { compte: "411SOTRA", montant: 1200000, date: "16/01 16:20", user: "K. Adjovi (terrain)" },
  server: { compte: "411SOTRA", montant: 1150000, date: "16/01 16:05", user: "A. Mensah (cabinet)" },
  diff: "Montant — 1 200 000 (terrain) vs 1 150 000 (cabinet)",
};

/* ============================== ÉTAPES ============================== */

function OfStep1() {
  return (
    <div className="col g16">
      <div>
        <h2 style={{ margin: 0 }}>Pas de réseau ? On saisit quand même.</h2>
        <div className="muted">DaCompta fonctionne hors-ligne par défaut. Les écritures sont stockées localement et synchronisées dès que la connexion revient.</div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <Kpi v="100 %" k="des fonctions disponibles offline" trend="saisie, consultation, états" />
        <Kpi v="< 3 s" k="sync au retour du réseau" trend="delta uniquement, pas tout le dossier" />
        <Kpi v="0" k="perte de données" trend="stockage local chiffré + file d'attente" />
      </div>
      <Card fill className="flex center g12" style={{ padding: "14px 16px" }}>
        <span className="pill-sync"><span className="dot" style={{ background: "var(--ink-3)" }} /> Hors ligne</span>
        <span className="small">Le collaborateur est à Kpalimé (route Lomé–Kpalimé, réseau intermittent). Il saisit normalement — l'app fonctionne sur les données locales.</span>
      </Card>
      <Annot>Pas de message d'erreur, pas de blocage : la saisie continue, le comptable ne voit pas la différence.</Annot>
    </div>
  );
}

function OfStep2() {
  return (
    <div className="col g16">
      <div>
        <h2 style={{ margin: 0 }}>File d'attente — ce qui a été saisi offline</h2>
        <div className="muted">Chaque écriture saisie hors-ligne est horodatée et mise en file. La sync est automatique au retour du réseau.</div>
      </div>
      <Card style={{ padding: 0 }}>
        <table className="tbl">
          <thead><tr><th>Heure</th><th>Journal</th><th>Libellé</th><th className="num">Montant</th><th>Sync</th></tr></thead>
          <tbody>
            {QUEUE.map((q, i) => (
              <tr key={i} style={{ background: q[4] === "conflict" ? "color-mix(in srgb, var(--danger) 8%, white)" : undefined }}>
                <td className="mono small">{q[0]}</td>
                <td><span className="chip fill small">{q[1]}</span></td>
                <td>{q[2]}</td>
                <td className="num mono">{q[3].toLocaleString("fr-FR")}</td>
                <td>{q[4] === "synced" ? <span className="chip accent small">✓ synced</span> : q[4] === "pending" ? <span className="chip fill small">⏳ en attente</span> : <span className="chip warn small">⚠ conflit</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div className="flex wrap g8">
        <Chip kind="accent">3 synchronisées</Chip>
        <Chip kind="fill">2 en attente</Chip>
        <Chip kind="warn">1 conflit à résoudre</Chip>
      </div>
    </div>
  );
}

function OfStep3() {
  const [choice, setChoice] = useOfState(null);
  return (
    <div className="col g16">
      <div>
        <h2 style={{ margin: 0 }}>Résolution de conflit — deux versions</h2>
        <div className="muted">Quand deux personnes modifient la même écriture offline, DaCompta montre les deux versions côte à côte. Le comptable choisit.</div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Card title="Version terrain" right={<Chip kind="fill">{CONFLICT.local.user}</Chip>} style={{ borderColor: choice === "local" ? "var(--accent)" : undefined, background: choice === "local" ? "var(--accent-soft)" : undefined, cursor: "pointer" }} onClick={() => setChoice("local")}>
          <div className="col g8">
            <div className="flex between"><span className="muted">Compte</span><span className="mono b">{CONFLICT.local.compte}</span></div>
            <div className="flex between"><span className="muted">Montant</span><span className="mono b">{CONFLICT.local.montant.toLocaleString("fr-FR")}</span></div>
            <div className="flex between"><span className="muted">Date / heure</span><span className="small">{CONFLICT.local.date}</span></div>
          </div>
          {choice === "local" && <div className="flex center g8 mt8"><span className="chip accent">✓ sélectionnée</span></div>}
        </Card>
        <Card title="Version cabinet" right={<Chip kind="fill">{CONFLICT.server.user}</Chip>} style={{ borderColor: choice === "server" ? "var(--accent)" : undefined, background: choice === "server" ? "var(--accent-soft)" : undefined, cursor: "pointer" }} onClick={() => setChoice("server")}>
          <div className="col g8">
            <div className="flex between"><span className="muted">Compte</span><span className="mono b">{CONFLICT.server.compte}</span></div>
            <div className="flex between"><span className="muted">Montant</span><span className="mono b" style={{ color: "var(--danger)" }}>{CONFLICT.server.montant.toLocaleString("fr-FR")}</span></div>
            <div className="flex between"><span className="muted">Date / heure</span><span className="small">{CONFLICT.server.date}</span></div>
          </div>
          {choice === "server" && <div className="flex center g8 mt8"><span className="chip accent">✓ sélectionnée</span></div>}
        </Card>
      </div>
      <Card fill style={{ padding: "10px 14px", borderColor: "var(--danger)" }}>
        <div className="flex center g10"><span className="chip warn">⚠ Différence</span><span className="small">{CONFLICT.diff}</span></div>
      </Card>
      <div className="flex g10">
        <Btn kind="primary" onClick={() => setChoice("local")}>Garder terrain</Btn>
        <Btn onClick={() => setChoice("server")}>Garder cabinet</Btn>
        <Btn kind="ghost">Fusionner manuellement</Btn>
      </div>
      <Annot>Le conflit est rare (moins de 1 % des cas). Quand il arrive, DaCompta ne choisit jamais à la place du comptable.</Annot>
    </div>
  );
}

function OfStep4() {
  return (
    <div className="col g16">
      <div className="flex center g12">
        <span className="icon-sq" style={{ width: 40, height: 40, fontSize: "1.3em", background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" }}>✓</span>
        <div>
          <h2 style={{ margin: 0 }}>Tout est synchronisé — zéro perte</h2>
          <div className="annotation annot">6 écritures saisies à Kpalimé, toutes dans le dossier</div>
        </div>
      </div>
      <Card>
        <div className="flex center g16 wrap">
          <span className="pill-sync"><span className="dot" /> En ligne</span>
          <div className="col"><span className="muted small">File d'attente</span><span className="b">0 écriture en attente</span></div>
          <div className="col"><span className="muted small">Conflits</span><span className="b">0 conflit ouvert</span></div>
          <div className="col"><span className="muted small">Dernière sync</span><span className="b mono">16:42</span></div>
        </div>
      </Card>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Card fill className="flex center g10" style={{ padding: "12px 14px" }}>
          <span className="chip">🔒 chiffré</span>
          <span className="small">Les données locales sont chiffrées — perte ou vol du téléphone ne compromet rien.</span>
        </Card>
        <Card fill className="flex center g10" style={{ padding: "12px 14px" }}>
          <span className="chip ai">✦ delta</span>
          <span className="small">La sync n'envoie que les écritures modifiées — pas tout le dossier. Fonctionne sur réseau 2G.</span>
        </Card>
      </div>
    </div>
  );
}

const OFFLINE_STEPS = [
  { label: "Saisie hors-ligne", comp: OfStep1, note: "Concurrents : blocage complet sans réseau. Ici : 100 % des fonctions disponibles offline." },
  { label: "File d'attente", comp: OfStep2, note: "Concurrents : données perdues. Ici : file horodatée, sync automatique au retour." },
  { label: "Résolution de conflits", comp: OfStep3, note: "Concurrents : écrasement silencieux. Ici : les deux versions côte à côte, le comptable tranche." },
  { label: "Synchronisé", comp: OfStep4, note: "Concurrents : sync lourde. Ici : delta uniquement, chiffré, fonctionne sur 2G." },
];

Object.assign(window, { OFFLINE_STEPS });
