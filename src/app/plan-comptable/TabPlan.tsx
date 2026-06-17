"use client";
import { useState } from "react";
import type { ClasseDef, NatureDef } from "@/lib/syscohada/referentiel";
import { listerComptes, archiverCompte } from "@/server/comptes";
import NewAccountDrawer from "./NewAccountDrawer";

type Compte = Awaited<ReturnType<typeof listerComptes>>[number];

export default function TabPlan(props: {
  dossierId: string; comptesInitiaux: Compte[]; classes: ClasseDef[]; natures: NatureDef[];
}) {
  const [comptes, setComptes] = useState<Compte[]>(props.comptesInitiaux);
  const [texte, setTexte] = useState("");
  const [classe, setClasse] = useState<number | null>(null);
  const [drawer, setDrawer] = useState(false);

  async function rafraichir(t = texte, c = classe) {
    setComptes(await listerComptes(props.dossierId, { texte: t || undefined, classe: c ?? undefined }));
  }

  return (
    <>
      <div className="classes">
        <button className={"chip" + (classe === null ? " active" : "")} onClick={() => { setClasse(null); rafraichir(texte, null); }}>Toutes</button>
        {props.classes.map((c) => (
          <button key={c.numero} className={"chip" + (classe === c.numero ? " active" : "")}
            onClick={() => { setClasse(c.numero); rafraichir(texte, c.numero); }}>
            {c.numero} · {c.libelle}
          </button>
        ))}
      </div>
      <div className="row" style={{ marginBottom: 14 }}>
        <input className="input" placeholder="Filtrer (n° ou intitulé)…" value={texte}
          onChange={(e) => { setTexte(e.target.value); rafraichir(e.target.value, classe); }} style={{ maxWidth: 360 }} />
        <div className="grow" />
        <button className="btn primary" onClick={() => setDrawer(true)}>＋ Nouveau compte</button>
      </div>
      <table>
        <thead><tr><th>N°</th><th>Intitulé</th><th>Type</th><th>Nature</th><th>Report N+1</th><th /></tr></thead>
        <tbody>
          {comptes.map((c) => (
            <tr key={c.id}>
              <td className="mono">{c.numero}</td>
              <td>{c.intitule}{c.collectif && <span className="badge" style={{ marginLeft: 8 }}>collectif</span>}</td>
              <td>{c.type === "TOTAL" ? "Σ Total" : "Détail"}</td>
              <td>{c.natureRacine ? <span className="badge">{props.natures.find((n) => n.racine === c.natureRacine)?.libelle}</span> : <span className="muted">—</span>}</td>
              <td>{c.reportNplus1 ? <span className="badge">reporté</span> : <span className="muted">remis à 0</span>}</td>
              <td><button className="btn" onClick={async () => { await archiverCompte(c.id); rafraichir(); }}>Archiver</button></td>
            </tr>
          ))}
          {comptes.length === 0 && <tr><td colSpan={6} className="muted">Aucun compte.</td></tr>}
        </tbody>
      </table>
      {drawer && (
        <NewAccountDrawer
          dossierId={props.dossierId} natures={props.natures} classes={props.classes}
          onClose={() => setDrawer(false)}
          onCreated={() => { setDrawer(false); rafraichir(); }}
        />
      )}
    </>
  );
}
