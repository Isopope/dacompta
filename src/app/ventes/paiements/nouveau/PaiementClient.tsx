"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { enregistrerPaiement } from "@/server/paiements";

/**
 * Formulaire client d'encaissement (drawer paiement).
 * Appelé depuis la page serveur `/ventes/paiements/nouveau`.
 * Génère un numéro de pièce horodaté et redirige vers la facture après paiement.
 */
export function PaiementClient({
  dossierId,
  factureId,
  tiersId,
  compteClient,
  residuel,
  journaux,
  comptesTresorerie,
}: {
  dossierId: string;
  factureId: string;
  tiersId: string;
  compteClient: string;
  residuel: number;
  journaux: { id: string; libelle: string }[];
  comptesTresorerie: { numero: string; intitule: string }[];
}) {
  const router = useRouter();
  const [montant, setMontant] = useState(residuel);
  const [journalId, setJournalId] = useState(journaux[0]?.id ?? "");
  const [compte, setCompte] = useState(comptesTresorerie[0]?.numero ?? "");
  const [erreur, setErreur] = useState<string | null>(null);

  /** Soumet le paiement via le Server Action et redirige vers le document facture. */
  async function valider() {
    setErreur(null);
    try {
      await enregistrerPaiement({
        dossierId,
        journalId,
        numeroPiece: `PAY-${Date.now()}`,
        sens: "ENTRANT",
        tiersId,
        compteTresorerieNumero: compte,
        compteTiersNumero: compteClient,
        montant,
      });
      router.push(`/ventes/factures/${factureId}`);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur");
    }
  }

  return (
    <div className="panel" style={{ padding: 16, maxWidth: 480 }}>
      {/* Affichage de l'erreur serveur éventuelle */}
      {erreur && (
        <div className="badge warn" style={{ display: "block", marginBottom: 12 }}>
          {erreur}
        </div>
      )}
      <h3>Encaisser la facture</h3>

      {/* Champ montant */}
      <label className="field">
        Montant&nbsp;
        <input
          className="input mono"
          type="number"
          value={montant}
          onChange={(e) => setMontant(Number(e.target.value))}
        />
      </label>

      {/* Sélection du journal de trésorerie (caisse / banque) */}
      <label className="field">
        Journal&nbsp;
        <select className="input" value={journalId} onChange={(e) => setJournalId(e.target.value)}>
          {journaux.map((j) => (
            <option key={j.id} value={j.id}>
              {j.libelle}
            </option>
          ))}
        </select>
      </label>

      {/* Sélection du compte de trésorerie (classe 5 actif) */}
      <label className="field">
        Compte trésorerie&nbsp;
        <select className="input" value={compte} onChange={(e) => setCompte(e.target.value)}>
          {comptesTresorerie.map((c) => (
            <option key={c.numero} value={c.numero}>
              {c.numero} — {c.intitule}
            </option>
          ))}
        </select>
      </label>

      {/* Bouton de validation */}
      <div style={{ marginTop: 12 }}>
        <button
          className="btn primary"
          onClick={valider}
          disabled={!journalId || !compte || montant <= 0}
        >
          Encaisser
        </button>
      </div>
    </div>
  );
}
