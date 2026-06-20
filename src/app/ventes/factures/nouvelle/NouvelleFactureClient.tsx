"use client";
// Composant client pour la saisie d'une nouvelle facture.
// Gère l'état local (tiers, lignes, numéro) et soumet via creerFacture.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LineEditor, type LigneHT } from "@/components/LineEditor";
import { apercuTotaux } from "@/lib/ui/facture-ui";
import { creerFacture } from "@/server/taxes";

/**
 * Formulaire de création de facture (brouillon) :
 * - Sélection du client (tiers de type CLIENT)
 * - Référence brouillon optionnelle (auto-générée sinon)
 * - Lignes HT via LineEditor
 * - Aperçu HT / TVA / TTC calculé côté client
 */
export function NouvelleFactureClient({
  dossierId,
  journalVenteId,
  tiers,
  taxes,
  comptes,
  compteClient,
}: {
  dossierId: string;
  journalVenteId: string | null;
  tiers: { id: string; nom: string }[];
  taxes: { code: string; nom: string; taux: number }[];
  comptes: { numero: string; intitule: string }[];
  compteClient: string;
}) {
  const router = useRouter();

  // État local du formulaire
  const [tiersId, setTiersId] = useState(tiers[0]?.id ?? "");
  const [numero, setNumero] = useState("");
  const [lignes, setLignes] = useState<LigneHT[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);

  // Map code → taux pour calcul d'aperçu côté client
  const tauxParCode = new Map(taxes.map((t) => [t.code, t.taux]));

  // Calcul de l'aperçu HT / TVA / TTC à partir des lignes en cours de saisie
  const apercu = apercuTotaux(
    lignes.map((l) => ({
      montantHT: l.montantHT,
      taux: l.taxeCode ? (tauxParCode.get(l.taxeCode) ?? 0) : 0,
    })),
    "XOF",
  );

  /** Soumet le formulaire et redirige vers la page de détail de la facture créée. */
  async function enregistrer() {
    setErreur(null);
    if (!journalVenteId) {
      setErreur("Aucun journal de vente configuré.");
      return;
    }
    try {
      const f = await creerFacture({
        dossierId,
        journalId: journalVenteId,
        // Numéro de pièce : saisi ou auto-généré (préfixe BR + timestamp)
        numeroPiece: numero || `BR-${Date.now()}`,
        sens: "VENTE",
        tiersId,
        compteTiersNumero: compteClient,
        lignes: lignes.map((l) => ({
          compteNumero: l.compteNumero,
          libelleLigne: l.libelleLigne,
          montantHT: l.montantHT,
          // taxeCode vide → pas de taxe (champ optionnel)
          taxeCode: l.taxeCode || undefined,
        })),
      });
      // Redirection vers la page de détail (route B7, future)
      router.push(`/ventes/factures/${f.id}`);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur");
    }
  }

  return (
    <div className="panel" style={{ padding: 16 }}>
      {/* Affichage des erreurs */}
      {erreur && (
        <div className="badge warn" style={{ display: "block", marginBottom: 12 }}>
          {erreur}
        </div>
      )}

      {/* En-tête : sélection client + référence brouillon */}
      <div className="field" style={{ display: "flex", gap: 16, marginBottom: 12 }}>
        <label>
          Client&nbsp;
          <select
            className="input"
            value={tiersId}
            onChange={(e) => setTiersId(e.target.value)}
          >
            {tiers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nom}
              </option>
            ))}
          </select>
        </label>
        <label>
          Réf. brouillon&nbsp;
          <input
            className="input"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="(auto à la validation)"
          />
        </label>
      </div>

      {/* Éditeur de lignes HT */}
      <LineEditor comptes={comptes} taxes={taxes} lignes={lignes} onChange={setLignes} />

      {/* Aperçu des totaux */}
      <div style={{ marginTop: 12, textAlign: "right" }} className="mono">
        HT {apercu.ht.toLocaleString("fr-FR")} · TVA {apercu.tva.toLocaleString("fr-FR")} ·{" "}
        <strong>TTC {apercu.ttc.toLocaleString("fr-FR")}</strong>
      </div>

      {/* Bouton de création — désactivé si aucun client ou aucune ligne */}
      <div style={{ marginTop: 12 }}>
        <button
          className="btn primary"
          onClick={enregistrer}
          disabled={!tiersId || lignes.length === 0}
        >
          Créer la facture (brouillon)
        </button>
      </div>
    </div>
  );
}
