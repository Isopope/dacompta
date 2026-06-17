"use client";
import { useState } from "react";
import type { ClasseDef, NatureDef } from "@/lib/syscohada/referentiel";
import { completerNumero, detecterNature, deduireReport, extraireClasse, validerNumero } from "@/lib/syscohada/compte-logic";
import { creerCompte } from "@/server/comptes";

export default function NewAccountDrawer(props: {
  dossierId: string; natures: NatureDef[]; classes: ClasseDef[];
  onClose: () => void; onCreated: () => void;
}) {
  const [saisi, setSaisi] = useState("");
  const [intitule, setIntitule] = useState("");
  const [type, setType] = useState<"DETAIL" | "TOTAL">("DETAIL");
  const [erreur, setErreur] = useState<string | null>(null);

  const numero = saisi ? completerNumero(saisi) : "";
  const nature = numero ? detecterNature(numero, props.natures) : null;
  const report = numero ? (nature ? nature.reportNplus1 : deduireReport(extraireClasse(numero))) : false;
  const validation = numero ? validerNumero(numero, props.classes) : { ok: false as const };

  async function creer() {
    setErreur(null);
    try {
      await creerCompte({ dossierId: props.dossierId, numeroSaisi: saisi, intitule, type });
      props.onCreated();
    } catch (e) { setErreur(e instanceof Error ? e.message : "Erreur"); }
  }

  return (
    <>
      <div className="drawer-scrim" onClick={props.onClose} />
      <div className="drawer">
        <div className="row"><b style={{ fontSize: 18 }}>Nouveau compte</b><div className="grow" /><button className="btn" onClick={props.onClose}>✕</button></div>

        <div className="field" style={{ marginTop: 16 }}>
          <label>N° de compte</label>
          <input className="input mono" placeholder="ex. 401" value={saisi} onChange={(e) => setSaisi(e.target.value)} />
          {numero && <span className="muted">→ complété : <b className="mono">{numero}</b></span>}
        </div>

        {numero && (
          <div style={{ background: "#f1f5f4", borderRadius: 8, padding: 12, marginBottom: 14 }}>
            <div>Nature détectée : {nature ? <b>{nature.libelle}</b> : <span className="muted">non spécifiée</span>}</div>
            <div className="muted">Report N+1 : {report ? "oui (reporté)" : "non (remis à 0)"} · classe {extraireClasse(numero)}</div>
            {!validation.ok && <div className="badge warn" style={{ marginTop: 6 }}>{("raison" in validation && validation.raison) || "Numéro invalide"}</div>}
          </div>
        )}

        <div className="field">
          <label>Intitulé</label>
          <input className="input" value={intitule} onChange={(e) => setIntitule(e.target.value)} />
        </div>

        <div className="field">
          <label>Type</label>
          <div className="seg">
            <button className={type === "DETAIL" ? "on" : ""} onClick={() => setType("DETAIL")}>Détail</button>
            <button className={type === "TOTAL" ? "on" : ""} onClick={() => setType("TOTAL")}>Σ Total</button>
          </div>
        </div>

        {erreur && <div className="badge warn" style={{ marginBottom: 12 }}>{erreur}</div>}
        <button className="btn primary" style={{ width: "100%" }} disabled={!validation.ok || !intitule} onClick={creer}>Créer le compte</button>
      </div>
    </>
  );
}
