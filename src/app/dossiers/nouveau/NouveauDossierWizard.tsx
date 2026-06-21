"use client";
// Assistant 3 étapes : ① Pays & identité → ② Exercice & devise → ③ Préparation.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { creerDossier, choisirDossier } from "@/server/dossiers";

interface PaysOption {
  pays: string;
  devise: string;
  tva: number;
}

export function NouveauDossierWizard({ pays }: { pays: PaysOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [etape, setEtape] = useState(1);
  const [erreur, setErreur] = useState<string | null>(null);

  const [paysSel, setPaysSel] = useState(pays[0]?.pays ?? "");
  const [nom, setNom] = useState("");
  const [ville, setVille] = useState("");
  const paysDef = pays.find((p) => p.pays === paysSel);
  const [devise, setDevise] = useState(paysDef?.devise ?? "");
  const [exercice, setExercice] = useState<number>(new Date().getFullYear());

  function choisirPays(p: string) {
    setPaysSel(p);
    const def = pays.find((x) => x.pays === p);
    if (def) setDevise(def.devise);
  }

  function creer() {
    setErreur(null);
    startTransition(async () => {
      try {
        const { id } = await creerDossier({ nom, ville, pays: paysSel, devise, exercice });
        await choisirDossier(id);
        router.push("/");
      } catch (e) {
        setErreur(e instanceof Error ? e.message : "Échec de la création du dossier.");
      }
    });
  }

  const tvaPct = paysDef?.tva ?? 0;

  return (
    <div className="panel" style={{ padding: 20, marginTop: 12 }}>
      <div className="muted" style={{ fontSize: 12, marginBottom: 12 }}>Étape {etape} sur 3</div>

      {etape === 1 && (
        <div>
          <h2 style={{ fontSize: 16 }}>Pays &amp; identité</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 8, margin: "12px 0" }}>
            {pays.map((p) => (
              <button
                key={p.pays}
                type="button"
                onClick={() => choisirPays(p.pays)}
                className="card"
                style={{
                  padding: 10, textAlign: "left", cursor: "pointer",
                  borderColor: p.pays === paysSel ? "var(--accent)" : undefined,
                  background: p.pays === paysSel ? "var(--bg)" : undefined,
                }}
              >
                <div style={{ fontWeight: 700 }}>{p.pays}</div>
                <div className="muted" style={{ fontSize: 12 }}>{p.devise} · TVA {p.tva}%</div>
              </button>
            ))}
          </div>
          <label style={{ display: "block", marginBottom: 8 }}>
            <div className="muted" style={{ fontSize: 12 }}>Raison sociale</div>
            <input className="input" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex. Nouvelle SARL" />
          </label>
          <label style={{ display: "block", marginBottom: 8 }}>
            <div className="muted" style={{ fontSize: 12 }}>Ville</div>
            <input className="input" value={ville} onChange={(e) => setVille(e.target.value)} placeholder="Ex. Dakar" />
          </label>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Link href="/" className="chip">Annuler</Link>
            <div style={{ flex: 1 }} />
            <button type="button" onClick={() => setEtape(2)} disabled={!nom.trim()}>Continuer →</button>
          </div>
        </div>
      )}

      {etape === 2 && (
        <div>
          <h2 style={{ fontSize: 16 }}>Exercice &amp; devise</h2>
          <label style={{ display: "block", margin: "12px 0 8px" }}>
            <div className="muted" style={{ fontSize: 12 }}>Exercice (année)</div>
            <input className="input" type="number" min={2000} max={2100} value={exercice}
              onChange={(e) => setExercice(Number(e.target.value))} />
          </label>
          <label style={{ display: "block", marginBottom: 8 }}>
            <div className="muted" style={{ fontSize: 12 }}>Devise</div>
            <input className="input" value={devise} onChange={(e) => setDevise(e.target.value)} />
          </label>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button type="button" onClick={() => setEtape(1)}>← Retour</button>
            <div style={{ flex: 1 }} />
            <button type="button" onClick={() => setEtape(3)} disabled={!devise.trim()}>Continuer →</button>
          </div>
        </div>
      )}

      {etape === 3 && (
        <div>
          <h2 style={{ fontSize: 16 }}>Préparation</h2>
          <p className="muted" style={{ fontSize: 13 }}>
            DaCompta va créer le dossier <strong>{nom || "(sans nom)"}</strong> ({paysSel} · {devise} ·
            exercice {exercice}) et amorcer automatiquement :
          </p>
          <ul style={{ fontSize: 14 }}>
            <li>6 journaux de saisie (Achats, Ventes, Caisse, Banque, OD, Report à nouveau)</li>
            <li>un plan comptable SYSCOHADA de base</li>
            <li>la TVA du pays (collectée &amp; déductible, {tvaPct}%)</li>
          </ul>
          {erreur && <p style={{ color: "var(--warn, #c2410c)" }}>{erreur}</p>}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button type="button" onClick={() => setEtape(2)} disabled={pending}>← Retour</button>
            <div style={{ flex: 1 }} />
            <button type="button" onClick={creer} disabled={pending} style={{ fontWeight: 700 }}>
              {pending ? "Création…" : "Créer &amp; ouvrir ✓"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
