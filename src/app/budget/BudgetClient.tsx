"use client";

import { useMemo, useState } from "react";
import type { PosteRealise } from "@/server/budget";
import { listerPostes, creerPoste, supprimerPoste } from "@/server/budget";

const fmt0 = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

type Filtre = "tous" | "P" | "C";

// Couleur de la barre de consommation : vert < 80 %, orange 80-95 %, rouge > 95 %.
function couleurConso(pourcentage: number): string {
  if (pourcentage > 95) return "#b3391f"; // rouge
  if (pourcentage >= 80) return "#c2780c"; // orange
  return "#0f766e"; // vert (accent)
}

export default function BudgetClient(props: {
  dossierId: string;
  postesInitiaux: PosteRealise[];
}) {
  const [postes, setPostes] = useState<PosteRealise[]>(props.postesInitiaux);
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [drawer, setDrawer] = useState(false);

  async function rafraichir() {
    setPostes(await listerPostes(props.dossierId));
  }

  const kpis = useMemo(() => {
    const produitsPrevus = postes.filter((p) => p.sens === "P").reduce((s, p) => s + p.prevision, 0);
    const chargesPrevues = postes.filter((p) => p.sens === "C").reduce((s, p) => s + p.prevision, 0);
    return { produitsPrevus, chargesPrevues, resultatPrev: produitsPrevus - chargesPrevues };
  }, [postes]);

  const lignes = useMemo(
    () => (filtre === "tous" ? postes : postes.filter((p) => p.sens === filtre)),
    [postes, filtre]
  );

  async function supprimer(id: string) {
    await supprimerPoste(id);
    await rafraichir();
  }

  return (
    <>
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 20 }}>
        <Kpi titre="Produits prévus" valeur={kpis.produitsPrevus} accent="#0f766e" />
        <Kpi titre="Charges prévues" valeur={kpis.chargesPrevues} accent="#b3391f" />
        <Kpi
          titre="Résultat prévisionnel"
          valeur={kpis.resultatPrev}
          accent={kpis.resultatPrev >= 0 ? "#0f766e" : "#b3391f"}
          badge={kpis.resultatPrev >= 0 ? "bénéfice" : "perte"}
        />
      </div>

      {/* Barre d'actions : filtre + nouveau poste */}
      <div className="row" style={{ marginTop: 24, marginBottom: 14 }}>
        <div className="classes" style={{ marginBottom: 0 }}>
          <button className={"chip" + (filtre === "tous" ? " active" : "")} onClick={() => setFiltre("tous")}>
            Tous
          </button>
          <button className={"chip" + (filtre === "P" ? " active" : "")} onClick={() => setFiltre("P")}>
            Produits
          </button>
          <button className={"chip" + (filtre === "C" ? " active" : "")} onClick={() => setFiltre("C")}>
            Charges
          </button>
        </div>
        <div className="grow" />
        <button className="btn primary" onClick={() => setDrawer(true)}>+ Nouveau poste</button>
      </div>

      {/* Tableau */}
      {lignes.length === 0 ? (
        <p className="muted">Aucun poste budgétaire. Créez-en un avec « + Nouveau poste ».</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Poste</th>
              <th>Sens</th>
              <th style={{ textAlign: "right" }}>Prévision</th>
              <th style={{ textAlign: "right" }}>/ mois</th>
              <th style={{ textAlign: "right" }}>Réalisé</th>
              <th style={{ width: 220 }}>Consommation</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lignes.map((p) => (
              <tr key={p.id}>
                <td>
                  <span className="mono">{p.code}</span>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {p.libelle} · compte {p.compteLie}…
                  </div>
                </td>
                <td>
                  <span className={"badge" + (p.sens === "C" ? " warn" : "")}>
                    {p.sens === "P" ? "Produit" : "Charge"}
                  </span>
                </td>
                <td className="mono" style={{ textAlign: "right" }}>{fmt0(p.prevision)}</td>
                <td className="mono muted" style={{ textAlign: "right" }}>{fmt0(p.prevision / 12)}</td>
                <td className="mono" style={{ textAlign: "right" }}>{fmt0(p.realise)}</td>
                <td>
                  <BarreConso pourcentage={p.pourcentage} />
                </td>
                <td>
                  <button className="btn" onClick={() => supprimer(p.id)} title="Supprimer">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {drawer && (
        <NouveauPosteDrawer
          dossierId={props.dossierId}
          onClose={() => setDrawer(false)}
          onCreated={() => { setDrawer(false); rafraichir(); }}
        />
      )}
    </>
  );
}

function Kpi(props: { titre: string; valeur: number; accent: string; badge?: string }) {
  return (
    <div
      style={{
        background: "var(--panel)",
        border: "1px solid var(--line)",
        borderRadius: 8,
        padding: 16,
      }}
    >
      <div className="muted" style={{ fontSize: 12, textTransform: "uppercase" }}>{props.titre}</div>
      <div className="mono" style={{ fontSize: 24, fontWeight: 600, color: props.accent, marginTop: 6 }}>
        {fmt0(props.valeur)}
      </div>
      {props.badge && (
        <span className={"badge" + (props.valeur >= 0 ? "" : " warn")} style={{ marginTop: 4, display: "inline-block" }}>
          {props.badge}
        </span>
      )}
    </div>
  );
}

function BarreConso({ pourcentage }: { pourcentage: number }) {
  const couleur = couleurConso(pourcentage);
  const largeur = Math.min(pourcentage, 100);
  return (
    <div>
      <div style={{ height: 8, background: "#eef2f1", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ width: `${largeur}%`, height: "100%", background: couleur, transition: "width .2s" }} />
      </div>
      <div className="mono" style={{ fontSize: 12, color: couleur, marginTop: 3 }}>
        {pourcentage.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %
      </div>
    </div>
  );
}

function NouveauPosteDrawer(props: {
  dossierId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [code, setCode] = useState("");
  const [libelle, setLibelle] = useState("");
  const [sens, setSens] = useState<"P" | "C">("C");
  const [prevision, setPrevision] = useState("");
  const [compteLie, setCompteLie] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  const valide = code.trim() && libelle.trim() && compteLie.trim();

  async function creer() {
    setErreur(null);
    try {
      await creerPoste({
        dossierId: props.dossierId,
        code: code.trim(),
        libelle: libelle.trim(),
        sens,
        prevision: Number(prevision) || 0,
        compteLie: compteLie.trim(),
      });
      props.onCreated();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur");
    }
  }

  return (
    <>
      <div className="drawer-scrim" onClick={props.onClose} />
      <div className="drawer">
        <div className="row">
          <b style={{ fontSize: 18 }}>Nouveau poste budgétaire</b>
          <div className="grow" />
          <button className="btn" onClick={props.onClose}>✕</button>
        </div>

        <div className="field" style={{ marginTop: 16 }}>
          <label>Code</label>
          <input className="input mono" placeholder="ex. 605300" value={code} onChange={(e) => setCode(e.target.value)} />
        </div>

        <div className="field">
          <label>Libellé</label>
          <input className="input" placeholder="ex. Achat carburant" value={libelle} onChange={(e) => setLibelle(e.target.value)} />
        </div>

        <div className="field">
          <label>Sens</label>
          <div className="seg">
            <button className={sens === "P" ? "on" : ""} onClick={() => setSens("P")}>Produit (recette)</button>
            <button className={sens === "C" ? "on" : ""} onClick={() => setSens("C")}>Charge (dépense)</button>
          </div>
        </div>

        <div className="field">
          <label>Prévision</label>
          <input className="input mono" type="number" placeholder="0" value={prevision} onChange={(e) => setPrevision(e.target.value)} />
        </div>

        <div className="field">
          <label>Compte lié (préfixe)</label>
          <input className="input mono" placeholder="ex. 605" value={compteLie} onChange={(e) => setCompteLie(e.target.value)} />
          <span className="muted" style={{ fontSize: 12 }}>
            Le réalisé sommera les {sens === "P" ? "crédits" : "débits"} des comptes commençant par ce préfixe.
          </span>
        </div>

        {erreur && <div className="badge warn" style={{ marginBottom: 12 }}>{erreur}</div>}
        <button className="btn primary" style={{ width: "100%" }} disabled={!valide} onClick={creer}>
          Créer le poste
        </button>
      </div>
    </>
  );
}
