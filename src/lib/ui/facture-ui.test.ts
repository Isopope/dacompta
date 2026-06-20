// src/lib/ui/facture-ui.test.ts
import { describe, it, expect } from "vitest";
import { badgeEtatPaiement, apercuTotaux } from "./facture-ui";

describe("badgeEtatPaiement", () => {
  it("mappe l'état vers libellé + variante", () => {
    expect(badgeEtatPaiement("PAYE").variant).toBe("ok");
    expect(badgeEtatPaiement("PARTIEL").variant).toBe("warn");
    expect(badgeEtatPaiement("NON_PAYE").variant).toBe("muted");
  });
});

describe("apercuTotaux", () => {
  it("agrège HT/TVA/TTC en XOF (0 décimale)", () => {
    const r = apercuTotaux([{ montantHT: 100_000, taux: 18 }, { montantHT: 50_000, taux: 18 }], "XOF");
    expect(r.ht).toBe(150_000);
    expect(r.tva).toBe(27_000);
    expect(r.ttc).toBe(177_000);
  });
});
