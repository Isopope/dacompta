"use client";
import { useState } from "react";
import { previsualiserImport, appliquerImport, annulerImport, type ModeImport } from "@/server/import";
import type { LigneImport } from "@/lib/syscohada/import-mapping";

export default function TabImport({ dossierId }: { dossierId: string }) {
  const [nom, setNom] = useState("");
  const [lignes, setLignes] = useState<LigneImport[] | null>(null);
  const [mode, setMode] = useState<ModeImport>("FUSIONNER");
  const [logId, setLogId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function onFichier(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setNom(f.name);
    const estCsv = f.name.toLowerCase().endsWith(".csv");
    const contenu = estCsv ? await f.text() : btoa(String.fromCharCode(...new Uint8Array(await f.arrayBuffer())));
    const res = await previsualiserImport(dossierId, f.name, contenu);
    setLignes(res.lignes); setLogId(null); setMsg(null);
  }

  async function lancer() {
    if (!lignes) return;
    const res = await appliquerImport(dossierId, nom, lignes, mode);
    setLogId(res.importLogId);
    setMsg(`${res.nbImportes} comptes importés. Rechargez l'onglet Plan pour les voir.`);
  }

  async function annuler() {
    if (!logId) return;
    await annulerImport(logId);
    setMsg("Import annulé."); setLogId(null); setLignes(null);
  }

  const compteur = (c: LigneImport["controle"]) => lignes?.filter((l) => l.controle === c).length ?? 0;

  return (
    <>
      <p className="muted">Excel (.xlsx) ou CSV — déposez le fichier tel quel, l'ordre des colonnes n'a pas d'importance.</p>
      <input type="file" accept=".csv,.xlsx,.xls" onChange={onFichier} />

      {lignes && (
        <>
          <div className="row" style={{ margin: "16px 0" }}>
            <span className="badge">{lignes.length} lignes</span>
            <span className="badge">{compteur("ok")} prêtes</span>
            <span className="badge">{compteur("doublon")} doublons</span>
            <span className="badge warn">{compteur("hors-syscohada")} hors-SYSCOHADA</span>
          </div>
          <table>
            <thead><tr><th>N°</th><th>Intitulé</th><th>Type</th><th>Contrôle</th></tr></thead>
            <tbody>
              {lignes.map((l, i) => (
                <tr key={i}>
                  <td className="mono">{l.numero}</td><td>{l.intitule}</td><td>{l.type}</td>
                  <td>{l.controle === "ok" ? <span className="badge">OK</span>
                    : l.controle === "doublon" ? <span className="badge">doublon</span>
                    : <span className="badge warn">hors-SYSCOHADA</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="row" style={{ marginTop: 16 }}>
            <span>Mode :</span>
            <div className="seg" style={{ maxWidth: 360 }}>
              {(["FUSIONNER", "REMPLACER", "AJOUTER"] as ModeImport[]).map((m) => (
                <button key={m} className={mode === m ? "on" : ""} onClick={() => setMode(m)}>{m}</button>
              ))}
            </div>
            <div className="grow" />
            {!logId && <button className="btn primary" onClick={lancer}>Lancer l&apos;import</button>}
            {logId && <button className="btn" onClick={annuler}>Annuler l&apos;import</button>}
          </div>
        </>
      )}
      {msg && <p style={{ marginTop: 14 }}>{msg}</p>}
    </>
  );
}
