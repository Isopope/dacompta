import { describe, it, expect } from "vitest";
import { prochaineActionDe } from "./prochaine-action";

describe("prochaineActionDe", () => {
  it("priorise les brouillons à valider", () => {
    const a = prochaineActionDe({ nbBrouillons: 3, nbALettrer: 5, netteDue: 100 });
    expect(a).toEqual({ libelle: "Valider 3 pièce(s) en brouillon", href: "/ecritures", raison: "brouillons" });
  });

  it("propose le lettrage quand il n'y a plus de brouillon", () => {
    const a = prochaineActionDe({ nbBrouillons: 0, nbALettrer: 5, netteDue: 100 });
    expect(a).toEqual({ libelle: "Lettrer 5 ligne(s) de tiers", href: "/lettrage", raison: "lettrage" });
  });

  it("propose la déclaration de TVA quand brouillons et lettrage sont à zéro et la TVA est due", () => {
    const a = prochaineActionDe({ nbBrouillons: 0, nbALettrer: 0, netteDue: 100 });
    expect(a).toEqual({ libelle: "Déclarer la TVA", href: "/etats/tva", raison: "tva" });
  });

  it("ne propose pas la TVA si elle n'est pas due (crédit ou zéro)", () => {
    expect(prochaineActionDe({ nbBrouillons: 0, nbALettrer: 0, netteDue: 0 })).toBeNull();
    expect(prochaineActionDe({ nbBrouillons: 0, nbALettrer: 0, netteDue: -50 })).toBeNull();
  });
});
