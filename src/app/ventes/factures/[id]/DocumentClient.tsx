"use client";
// Composant client du document facture : barre d'état, smart buttons, actions métier et tableau des lignes.
// "use client" doit impérativement rester en toute première ligne (contrainte Next.js App Router).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBar } from "@/components/StatusBar";
import { SmartButton } from "@/components/SmartButton";
import { Badge } from "@/components/Badge";
import { badgeEtatPaiement } from "@/lib/ui/facture-ui";
import { actionValider, actionExtourner, actionAnnuler } from "@/server/facture-actions";
import type { FactureDetail } from "@/server/factures";

export function DocumentClient({ f }: { f: FactureDetail }) {
  const router = useRouter();
  // Message d'erreur affiché en cas d'échec d'une action (valider / extourner / annuler).
  const [erreur, setErreur] = useState<string | null>(null);

  // Exécute une action serveur, rafraîchit la page après succès, ou affiche l'erreur.
  const run = (fn: (id: string) => Promise<void>) => async () => {
    setErreur(null);
    try { await fn(f.id); router.refresh(); }
    catch (e) { setErreur(e instanceof Error ? e.message : "Erreur"); }
  };

  // Badge de l'état de paiement (Payé / Partiel / Non payé) avec sa variante de couleur.
  const badge = badgeEtatPaiement(f.etatPaiement);

  // Boutons d'action contextuels selon le statut de la pièce.
  const actions = (
    <>
      {/* BROUILLON → peut être validée */}
      {f.statut === "BROUILLON" && <button className="btn primary" onClick={run(actionValider)}>Valider</button>}
      {/* VALIDEE non soldée → lien vers l'enregistrement d'un paiement (route B8) */}
      {f.statut === "VALIDEE" && f.etatPaiement !== "PAYE" && <a className="btn primary" href={`/ventes/paiements/nouveau?facture=${f.id}`}>Enregistrer un paiement</a>}
      {/* VALIDEE → peut être extournée */}
      {f.statut === "VALIDEE" && <button className="btn" onClick={run(actionExtourner)}>Extourner</button>}
      {/* BROUILLON → peut être annulée */}
      {f.statut === "BROUILLON" && <button className="btn" onClick={run(actionAnnuler)}>Annuler</button>}
    </>
  );

  return (
    <div className="panel" style={{ padding: 16 }}>
      {/* Bandeau d'erreur contextuel */}
      {erreur && <div className="badge warn" style={{ display: "block", marginBottom: 12 }}>{erreur}</div>}

      {/* Barre d'état : étapes du cycle de vie de la pièce */}
      <StatusBar etats={["BROUILLON", "VALIDEE", "ANNULEE"]} courant={f.statut} actions={actions} />

      {/* Smart buttons : paiements rapprochés, lettrage et état paiement */}
      <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
        <SmartButton icone="💰" compteur={f.nbPaiements} label="paiements" href={`/ventes/paiements?tiers=${f.tiersId ?? ""}`} />
        <SmartButton icone="🔗" label={f.estLettree ? "Lettré" : "Non lettré"} />
        <Badge label={badge.label} variant={badge.variant} />
      </div>

      {/* En-tête du document */}
      <h2 style={{ margin: "8px 0" }}>Facture {f.numeroPiece}</h2>
      <div className="muted" style={{ marginBottom: 12 }}>Client : {f.tiersNom ?? "—"} · Date : {f.datePiece.slice(0, 10)} · Journal : {f.journalCode}</div>

      {/* Tableau des lignes d'écriture comptable */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            <th style={{ textAlign: "left", padding: 6 }}>Compte</th><th style={{ textAlign: "left", padding: 6 }}>Libellé</th>
            <th style={{ textAlign: "right", padding: 6 }}>Débit</th><th style={{ textAlign: "right", padding: 6 }}>Crédit</th>
          </tr></thead>
          <tbody>
            {f.lignes.map((l) => (
              <tr key={l.id}>
                <td style={{ padding: 6 }}>{l.compteNumero}</td><td style={{ padding: 6 }}>{l.libelleLigne}</td>
                <td style={{ padding: 6, textAlign: "right" }} className="mono">{l.debit ? l.debit.toLocaleString("fr-FR") : "—"}</td>
                <td style={{ padding: 6, textAlign: "right" }} className="mono">{l.credit ? l.credit.toLocaleString("fr-FR") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totaux HT / TVA / TTC en bas à droite */}
      <div style={{ marginTop: 12, textAlign: "right" }} className="mono">
        HT {f.montantHT.toLocaleString("fr-FR")} · TVA {f.montantTVA.toLocaleString("fr-FR")} · <strong>TTC {f.montantTTC.toLocaleString("fr-FR")}</strong>
      </div>
    </div>
  );
}
