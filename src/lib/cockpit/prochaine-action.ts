// Logique PURE (hors DB, hors "use server") : déterminer l'action la plus urgente
// à partir de compteurs déjà calculés. Premier critère non vide gagne.

export interface ProchaineAction {
  libelle: string;
  href: string;
  raison: "brouillons" | "lettrage" | "tva";
}

export interface EtatActionnable {
  nbBrouillons: number;
  nbALettrer: number;
  netteDue: number;
}

export function prochaineActionDe(e: EtatActionnable): ProchaineAction | null {
  if (e.nbBrouillons > 0) {
    return { libelle: `Valider ${e.nbBrouillons} pièce(s) en brouillon`, href: "/ecritures", raison: "brouillons" };
  }
  if (e.nbALettrer > 0) {
    return { libelle: `Lettrer ${e.nbALettrer} ligne(s) de tiers`, href: "/lettrage", raison: "lettrage" };
  }
  if (e.netteDue > 0) {
    return { libelle: "Déclarer la TVA", href: "/etats/tva", raison: "tva" };
  }
  return null;
}
