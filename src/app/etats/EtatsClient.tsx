"use client";

import { useMemo, useState } from "react";
import type { BalanceResultat, GrandLivreCompte } from "@/server/balance";
import type { Bilan, CompteResultat, FluxTresorerie } from "@/lib/etats/etats-financiers";

const fmt = (n: number) =>
  n === 0 ? "" : n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmt0 = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

type DocId = "balance-generale" | "grand-livre" | "bilan" | "compte-resultat" | "flux-tresorerie";

interface DocDef {
  id: string;
  nom: string;
  desc: string;
  pret: boolean; // true = lecture depuis les écritures réelles
}
interface CatDef {
  nom: string;
  ico: string;
  docs: DocDef[];
}

const CATEGORIES: CatDef[] = [
  {
    nom: "Balances",
    ico: "▦",
    docs: [
      { id: "balance-generale", nom: "Balance générale", desc: "6 colonnes · ouverture, mouvements, solde", pret: true },
      { id: "balance-tiers", nom: "Balance des tiers", desc: "clients & fournisseurs nominatifs", pret: false },
      { id: "balance-agee", nom: "Balance âgée", desc: "dettes/créances par tranches de retard", pret: false },
      { id: "balance-analytique", nom: "Balance analytique", desc: "rentabilité par section", pret: false },
    ],
  },
  {
    nom: "Grand livre & journaux",
    ico: "▤",
    docs: [
      { id: "grand-livre", nom: "Grand livre général", desc: "tous les mouvements par compte", pret: true },
      { id: "grand-livre-aux", nom: "Grand livre auxiliaire", desc: "détail par tiers", pret: false },
      { id: "livre-journal", nom: "Livre-journal", desc: "journal général chronologique (légal)", pret: false },
      { id: "brouillard", nom: "Brouillard", desc: "contrôle d'un journal avant validation", pret: false },
    ],
  },
  {
    nom: "États financiers SYSCOHADA",
    ico: "▥",
    docs: [
      { id: "bilan", nom: "Bilan", desc: "Actif = Passif · résultat de l'exercice", pret: true },
      { id: "compte-resultat", nom: "Compte de résultat", desc: "charges / produits · résultat net", pret: true },
      { id: "flux-tresorerie", nom: "Tableau des Flux de Trésorerie", desc: "exploitation · investissement · financement (AUDCIF 2017)", pret: true },
      { id: "notes", nom: "Notes annexes", desc: "états annexés à la liasse", pret: false },
    ],
  },
  {
    nom: "Fiscal & social",
    ico: "%",
    docs: [
      { id: "tva", nom: "Déclaration TVA", desc: "liquidation mensuelle · télédéclaration", pret: false },
      { id: "dsf", nom: "Liasse DSF", desc: "déclaration statistique & fiscale (annuelle)", pret: false },
      { id: "cnss", nom: "Déclaration CNSS", desc: "cotisations sociales", pret: false },
      { id: "igr", nom: "État IGR / salaires", desc: "retenues à la source", pret: false },
    ],
  },
];

export default function EtatsClient(props: {
  balance: BalanceResultat;
  grandLivre: GrandLivreCompte[];
  bilan: Bilan;
  compteResultat: CompteResultat;
  fluxTresorerie: FluxTresorerie;
}) {
  const [catIndex, setCatIndex] = useState(0);
  const [docId, setDocId] = useState<string>("balance-generale");

  const cat = CATEGORIES[catIndex];
  const docCourant = useMemo(
    () => CATEGORIES.flatMap((c) => c.docs).find((d) => d.id === docId) ?? null,
    [docId]
  );

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "230px minmax(0, 1fr) minmax(320px, 460px)",
        gap: 18,
        alignItems: "start",
        marginTop: 20,
      }}
    >
      {/* Colonne gauche : catégories */}
      <aside style={panel}>
        <div style={{ padding: "12px 12px 6px" }}>
          <b>Catégories</b>
        </div>
        {CATEGORIES.map((c, i) => (
          <button
            key={c.nom}
            onClick={() => setCatIndex(i)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              textAlign: "left",
              cursor: "pointer",
              padding: "10px 12px",
              border: "none",
              borderLeft: `3px solid ${i === catIndex ? "var(--accent)" : "transparent"}`,
              background: i === catIndex ? "#f1f5f4" : "transparent",
              color: "var(--ink)",
              fontSize: 14,
            }}
          >
            <span style={{ width: 18, textAlign: "center" }}>{c.ico}</span>
            <span style={{ flex: 1, lineHeight: 1.1 }}>{c.nom}</span>
            <span className="badge">{c.docs.length}</span>
          </button>
        ))}
        <div className="muted" style={{ padding: 12, fontSize: 12 }}>
          Conformes SYSCOHADA révisé · multi-pays
        </div>
      </aside>

      {/* Colonne centre : documents de la catégorie */}
      <section style={panel}>
        <div className="row" style={{ padding: 14, borderBottom: "1px solid var(--line)" }}>
          <b style={{ fontSize: 16 }}>{cat.nom}</b>
        </div>
        <div>
          {cat.docs.map((d) => {
            const actif = d.id === docId;
            return (
              <div
                key={d.id}
                className="row"
                style={{
                  padding: "12px 14px",
                  borderBottom: "1px solid var(--line)",
                  gap: 12,
                  background: actif && d.pret ? "#f1f5f4" : "#fff",
                }}
              >
                <span style={{ width: 20, textAlign: "center", color: d.pret ? "var(--accent)" : "var(--muted)" }}>
                  {d.pret ? "▥" : "◌"}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{d.nom}</div>
                  <div className="muted" style={{ fontSize: 13 }}>{d.desc}</div>
                </div>
                {d.pret ? (
                  <>
                    <span className="badge">prêt</span>
                    <button className="btn" onClick={() => setDocId(d.id)}>Aperçu</button>
                  </>
                ) : (
                  <>
                    <span className="badge warn">à venir</span>
                    <button className="btn" disabled>Notifier</button>
                  </>
                )}
              </div>
            );
          })}
        </div>
        <div className="muted" style={{ padding: 14, fontSize: 13 }}>
          Tous les documents vitaux au même endroit — déduits des écritures, en temps réel.
        </div>
      </section>

      {/* Colonne droite : aperçu du document sélectionné */}
      <aside style={{ ...panel, position: "sticky", top: 16 }}>
        <div className="row" style={{ padding: 14, borderBottom: "1px solid var(--line)" }}>
          <b>Aperçu — {docCourant?.nom ?? "—"}</b>
        </div>
        <div style={{ padding: 14, maxHeight: "72vh", overflow: "auto" }}>
          <Apercu docId={docId as DocId} {...props} />
        </div>
        <div className="row" style={{ padding: 14, borderTop: "1px solid var(--line)", gap: 8 }}>
          <button className="btn" disabled>⬇ PDF</button>
          <button className="btn" disabled>⬇ Excel</button>
        </div>
      </aside>
    </div>
  );
}

function Apercu(props: {
  docId: DocId;
  balance: BalanceResultat;
  grandLivre: GrandLivreCompte[];
  bilan: Bilan;
  compteResultat: CompteResultat;
  fluxTresorerie: FluxTresorerie;
}) {
  switch (props.docId) {
    case "balance-generale":
      return <ApercuBalance balance={props.balance} />;
    case "grand-livre":
      return <ApercuGrandLivre grandLivre={props.grandLivre} />;
    case "bilan":
      return <ApercuBilan bilan={props.bilan} />;
    case "compte-resultat":
      return <ApercuCompteResultat cr={props.compteResultat} />;
    case "flux-tresorerie":
      return <ApercuFluxTresorerie flux={props.fluxTresorerie} />;
    default:
      return <p className="muted">Document à venir.</p>;
  }
}

const numCell = { textAlign: "right" as const };
const num = "mono";

function ApercuBalance({ balance }: { balance: BalanceResultat }) {
  if (balance.lignes.length === 0) return <Vide />;
  return (
    <table>
      <thead>
        <tr>
          <th>Compte</th>
          <th style={numCell}>Ouvert.</th>
          <th style={numCell}>Débit</th>
          <th style={numCell}>Crédit</th>
          <th style={numCell}>S. débit</th>
          <th style={numCell}>S. crédit</th>
        </tr>
      </thead>
      <tbody>
        {balance.lignes.map((l) => (
          <tr key={l.compteNumero}>
            <td>
              <span className={num}>{l.compteNumero}</span>
              <div className="muted" style={{ fontSize: 12 }}>{l.intitule}</div>
            </td>
            <td className={num} style={numCell}>{fmt(l.ouverture)}</td>
            <td className={num} style={numCell}>{fmt(l.debit)}</td>
            <td className={num} style={numCell}>{fmt(l.credit)}</td>
            <td className={num} style={numCell}>{fmt(l.soldeDebiteur)}</td>
            <td className={num} style={numCell}>{fmt(l.soldeCrediteur)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr style={{ fontWeight: 600 }}>
          <td>Totaux</td>
          <td className={num} style={numCell}>—</td>
          <td className={num} style={numCell}>{fmt0(balance.totaux.debit)}</td>
          <td className={num} style={numCell}>{fmt0(balance.totaux.credit)}</td>
          <td className={num} style={numCell}>{fmt0(balance.totaux.soldeDebiteur)}</td>
          <td className={num} style={numCell}>{fmt0(balance.totaux.soldeCrediteur)}</td>
        </tr>
      </tfoot>
    </table>
  );
}

function ApercuGrandLivre({ grandLivre }: { grandLivre: GrandLivreCompte[] }) {
  const [filtre, setFiltre] = useState("");
  const comptes = filtre
    ? grandLivre.filter((c) => c.compteNumero.startsWith(filtre.trim()))
    : grandLivre;
  if (grandLivre.length === 0) return <Vide />;
  return (
    <div>
      <input
        className="input"
        placeholder="Filtrer par n° de compte (ex. 4, 601)"
        value={filtre}
        onChange={(e) => setFiltre(e.target.value)}
        style={{ marginBottom: 12 }}
      />
      {comptes.map((c) => (
        <div key={c.compteNumero} style={{ marginBottom: 18 }}>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 4 }}>
            <b>
              <span className={num}>{c.compteNumero}</span> {c.intitule}
            </b>
            <span className="badge">solde {fmt0(c.solde)}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Pièce</th>
                <th>Jrnl</th>
                <th style={numCell}>Débit</th>
                <th style={numCell}>Crédit</th>
                <th style={numCell}>Solde</th>
              </tr>
            </thead>
            <tbody>
              {c.lignes.map((l, i) => (
                <tr key={i}>
                  <td className="muted" style={{ fontSize: 12 }}>
                    {new Date(l.date).toLocaleDateString("fr-FR")}
                  </td>
                  <td className={num} style={{ fontSize: 12 }}>{l.numeroPiece}</td>
                  <td style={{ fontSize: 12 }}>{l.journalCode}</td>
                  <td className={num} style={numCell}>{fmt(l.debit)}</td>
                  <td className={num} style={numCell}>{fmt(l.credit)}</td>
                  <td className={num} style={numCell}>{fmt0(l.soldeApres)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {comptes.length === 0 && <p className="muted">Aucun compte ne correspond au filtre.</p>}
    </div>
  );
}

function ApercuBilan({ bilan }: { bilan: Bilan }) {
  if (bilan.actif.length === 0 && bilan.passif.length === 0) return <Vide />;
  return (
    <div>
      <Colonne titre="ACTIF" postes={bilan.actif} total={bilan.totalActif} />
      <div style={{ height: 16 }} />
      <Colonne
        titre="PASSIF"
        postes={[...bilan.passif, { compteNumero: "—", intitule: "Résultat de l'exercice", montant: bilan.resultatNet }]}
        total={bilan.totalPassif}
      />
      <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
        {bilan.equilibre ? "✓ Actif = Passif" : "⚠ Bilan déséquilibré (POC simplifié)"}
      </p>
    </div>
  );
}

function ApercuCompteResultat({ cr }: { cr: CompteResultat }) {
  if (cr.charges.length === 0 && cr.produits.length === 0) return <Vide />;
  return (
    <div>
      <Colonne titre="CHARGES (classe 6)" postes={cr.charges} total={cr.totalCharges} />
      <div style={{ height: 16 }} />
      <Colonne titre="PRODUITS (classe 7)" postes={cr.produits} total={cr.totalProduits} />
      <p style={{ fontWeight: 600, marginTop: 12 }}>
        Résultat net : <span className={num}>{fmt0(cr.resultatNet)}</span>{" "}
        <span className={cr.resultatNet >= 0 ? "badge" : "badge warn"}>
          {cr.resultatNet >= 0 ? "bénéfice" : "perte"}
        </span>
      </p>
    </div>
  );
}

function ApercuFluxTresorerie({ flux }: { flux: FluxTresorerie }) {
  const vide =
    flux.exploitation.postes.length === 0 &&
    flux.investissement.postes.length === 0 &&
    flux.financement.postes.length === 0;
  if (vide) return <Vide />;
  return (
    <div>
      <CategorieFlux titre="A · FLUX D'EXPLOITATION" cat={flux.exploitation} />
      <div style={{ height: 16 }} />
      <CategorieFlux titre="B · FLUX D'INVESTISSEMENT" cat={flux.investissement} />
      <div style={{ height: 16 }} />
      <CategorieFlux titre="C · FLUX DE FINANCEMENT" cat={flux.financement} />
      <table style={{ marginTop: 16 }}>
        <tbody>
          <tr>
            <td>Trésorerie d&apos;ouverture (RAN 52/57)</td>
            <td className={num} style={numCell}>{fmt0(flux.tresorerieOuverture)}</td>
          </tr>
          <tr style={{ fontWeight: 600 }}>
            <td>Variation de trésorerie (A + B + C)</td>
            <td className={num} style={numCell}>{fmt0(flux.variationTresorerie)}</td>
          </tr>
          <tr style={{ fontWeight: 600 }}>
            <td>Trésorerie de clôture</td>
            <td className={num} style={numCell}>{fmt0(flux.tresorerieCloture)}</td>
          </tr>
        </tbody>
      </table>
      <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
        ✓ Clôture = ouverture + variation · déduit des écritures (AUDCIF 2017 — remplace le TAFIRE)
      </p>
    </div>
  );
}

function CategorieFlux({ titre, cat }: { titre: string; cat: { total: number; postes: { libelle: string; montant: number }[] } }) {
  return (
    <table>
      <thead>
        <tr>
          <th>{titre}</th>
          <th style={numCell}>Flux</th>
        </tr>
      </thead>
      <tbody>
        {cat.postes.length === 0 ? (
          <tr>
            <td className="muted" colSpan={2} style={{ fontSize: 13 }}>Aucun mouvement</td>
          </tr>
        ) : (
          cat.postes.map((p, i) => (
            <tr key={i}>
              <td style={{ fontSize: 13 }}>{p.libelle}</td>
              <td className={num} style={numCell}>{fmt0(p.montant)}</td>
            </tr>
          ))
        )}
      </tbody>
      <tfoot>
        <tr style={{ fontWeight: 600 }}>
          <td>Total</td>
          <td className={num} style={numCell}>{fmt0(cat.total)}</td>
        </tr>
      </tfoot>
    </table>
  );
}

function Colonne({
  titre,
  postes,
  total,
}: {
  titre: string;
  postes: { compteNumero: string; intitule: string; montant: number }[];
  total: number;
}) {
  return (
    <table>
      <thead>
        <tr>
          <th>{titre}</th>
          <th style={numCell}>Montant</th>
        </tr>
      </thead>
      <tbody>
        {postes.map((p, i) => (
          <tr key={i}>
            <td>
              <span className={num}>{p.compteNumero}</span>{" "}
              <span className="muted" style={{ fontSize: 13 }}>{p.intitule}</span>
            </td>
            <td className={num} style={numCell}>{fmt0(p.montant)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr style={{ fontWeight: 600 }}>
          <td>Total</td>
          <td className={num} style={numCell}>{fmt0(total)}</td>
        </tr>
      </tfoot>
    </table>
  );
}

function Vide() {
  return (
    <p className="muted">
      Aucune écriture pour l’instant. Saisissez des pièces dans <b>Écritures</b> — les états
      s’actualiseront automatiquement.
    </p>
  );
}

const panel: React.CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--line)",
  borderRadius: 8,
  overflow: "hidden",
};
