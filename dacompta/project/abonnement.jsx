/* global React, Win, Card, Chip, Btn, Mark, Note, Annot, Ln */
// Flux « Écriture d'abonnement » — lissage charges constatées d'avance (Sage vidéo 15)

const { useState: useAbState } = React;
const abfmt = (n) => n.toLocaleString("fr-FR");

const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin"];

function AbonnementWorkspace() {
  const [gen, setGen] = useAbState(false); // janvier généré ?

  return (
    <div className="main" style={{ padding: 18 }}>
      <div className="flex center g10">
        <span className="b" style={{ fontSize: "1.15em" }}>Abonnement — Loyer Notaire Baba</span>
        <Chip kind="fill">601 → reporté</Chip>
        <div className="grow" />
        <span className="chip ai" style={{ fontSize: ".75em" }}>✦ proposé depuis la pièce du 30/01</span>
      </div>
      <Annot style={{ marginTop: 6 }}>Spécialisation des exercices : ne rattacher à janvier que sa quote-part — le reste est de la charge payée d'avance</Annot>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1.15fr", marginTop: 12 }}>
        {/* config */}
        <Card>
          <div className="card-h"><span className="t">Paramètres</span><div className="grow" /><Chip kind="ai">✦ pré-remplis</Chip></div>
          <div className="col g10">
            <div className="flex between"><span className="muted">Montant payé d'avance</span><span className="mono b">{abfmt(600000)}</span></div>
            <div className="flex between"><span className="muted">Période</span><span className="mono">01/2020 → 06/2020</span></div>
            <div className="flex between"><span className="muted">Périodicité</span><Chip kind="fill">Mensuelle</Chip></div>
            <div className="flex between"><span className="muted">Compte de charge</span><span className="mono">622100 — Locations</span></div>
            <div className="flex between"><span className="muted">Compte de report</span><span className="mono">476000 — Charges constatées d'avance</span></div>
            <div className="flex center g8 mt8" style={{ borderTop: "1.5px dashed var(--fill-2)", paddingTop: 10 }}>
              <span className="btn" >Répartir</span>
              <span className="annotation annot small">→ 600 000 ÷ 6 = <b>100 000 / mois</b></span>
            </div>
          </div>
        </Card>

        {/* échéancier */}
        <Card style={{ padding: 0 }}>
          <div className="flex center g8" style={{ padding: "8px 12px", borderBottom: "2px solid var(--line)" }}><span className="b">Échéancier</span><div className="grow" /><span className="muted small">{gen ? "1 / 6 généré" : "0 / 6 généré"}</span></div>
          <table className="tbl">
            <tbody>
              {MOIS.map((m, i) => (
                <tr key={i}>
                  <td className="b">{m} 2020</td>
                  <td className="num mono">{abfmt(100000)}</td>
                  <td className="num">
                    {i === 0
                      ? (gen ? <Chip kind="accent">✓ généré</Chip> : <Chip kind="ai">à générer</Chip>)
                      : <span className="muted small">planifié</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {/* écriture générée pour janvier */}
      {gen && (
        <Card style={{ padding: 0, marginTop: 14 }}>
          <div className="flex center g8" style={{ padding: "8px 12px", borderBottom: "2px solid var(--line)" }}><span className="b">Écriture générée — Janvier (JOD)</span><Chip kind="ai" style={{ fontSize: ".7em" }}>✦ auto</Chip></div>
          <table className="tbl">
            <thead><tr><th>Compte</th><th>Libellé</th><th className="num">Débit</th><th className="num">Crédit</th></tr></thead>
            <tbody>
              <tr><td className="mono b">622100</td><td>Loyer — quote-part janvier</td><td className="num mono">{abfmt(100000)}</td><td></td></tr>
              <tr><td className="mono b">476000</td><td>Charges constatées d'avance</td><td></td><td className="num mono">{abfmt(100000)}</td></tr>
            </tbody>
          </table>
          <div className="flex between center" style={{ padding: "8px 12px", borderTop: "2px solid var(--line)" }}>
            <span className="chip accent">⚖ Équilibrée</span>
            <span className="muted small">les 5 mois restants se généreront automatiquement à leur échéance</span>
          </div>
        </Card>
      )}

      <div className="flex center g10" style={{ marginTop: 14 }}>
        {!gen
          ? <span className="btn primary" style={{ cursor: "pointer" }} onClick={() => setGen(true)}>Activer l'abonnement & générer janvier</span>
          : <><span className="chip accent">✓ Abonnement actif</span><Btn onClick={() => setGen(false)}>Rejouer</Btn></>}
        <div className="grow" />
        <Annot>Chez Sage : 4 étapes (modèle de saisie → modèle d'abonnement → générer → contrôler)</Annot>
      </div>
    </div>
  );
}

Object.assign(window, { AbonnementWorkspace });
