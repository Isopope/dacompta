// src/lib/ui/facture-ui.test.ts
import { describe, it, expect } from "vitest";
import { badgeEtatPaiement, apercuTotaux } from "./facture-ui";

describe("badgeEtatPaiement", () => {
  it("mappe l'état vers libellé + variante", () => {
    expect(badgeEtatPaiement("PAYE").variant).toBe("ok");
    expect(badgeEtatPaiement("PARTIEL").variant).toBe("warn");
    expect(badgeEtatPaiement("NON_PAYE").variant).toBe("muted");
  });

  it("retourne les bons libellés", () => {
    expect(badgeEtatPaiement("PAYE").label).toBe("Payé");
    expect(badgeEtatPaiement("PARTIEL").label).toBe("Partiel");
    expect(badgeEtatPaiement("NON_PAYE").label).toBe("Non payé");
  });
});

describe("apercuTotaux", () => {
  it("agrège HT/TVA/TTC en XOF (0 décimale)", () => {
    const r = apercuTotaux([{ montantHT: 100_000, taux: 18 }, { montantHT: 50_000, taux: 18 }], "XOF");
    expect(r.ht).toBe(150_000);
    expect(r.tva).toBe(27_000);
    expect(r.ttc).toBe(177_000);
  });

  it("liste vide → totaux à zéro", () => {
    const r = apercuTotaux([], "XOF");
    expect(r).toEqual({ ht: 0, tva: 0, ttc: 0 });
  });

  it("taux 0 : TVA nulle, TTC = HT", () => {
    const r = apercuTotaux([{ montantHT: 100_000, taux: 0 }], "XOF");
    expect(r).toEqual({ ht: 100_000, tva: 0, ttc: 100_000 });
  });
});
