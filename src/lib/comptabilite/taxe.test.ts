import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import { computeTaxe } from "./taxe";

const n = (d: Prisma.Decimal) => d.toNumber();

describe("computeTaxe — pourcentage, hors taxe (price_excluded)", () => {
  it("XOF 18% sur 100 000 → taxe 18 000, TTC 118 000", () => {
    const r = computeTaxe(100_000, 18, { priceInclude: false, typeAmount: "percent", devise: "XOF" });
    expect(n(r.baseHT)).toBe(100_000);
    expect(n(r.montantTaxe)).toBe(18_000);
    expect(n(r.montantTTC)).toBe(118_000);
  });
  it("Cameroun 19,25% sur 100 000 (XOF, 0 décimale) → taxe arrondie 19 250", () => {
    const r = computeTaxe(100_000, 19.25, { priceInclude: false, typeAmount: "percent", devise: "XAF" });
    expect(n(r.montantTaxe)).toBe(19_250);
  });
  it("EUR : arrondit la taxe au centime", () => {
    const r = computeTaxe(99.99, 18, { priceInclude: false, typeAmount: "percent", devise: "EUR" });
    expect(n(r.montantTaxe)).toBe(18.0); // 17,9982 → 18,00
    expect(n(r.montantTTC)).toBe(117.99);
  });
});

describe("computeTaxe — pourcentage, toutes taxes comprises (price_included)", () => {
  it("XOF 18% : 118 000 TTC → base 100 000, taxe 18 000", () => {
    const r = computeTaxe(118_000, 18, { priceInclude: true, typeAmount: "percent", devise: "XOF" });
    expect(n(r.baseHT)).toBe(100_000);
    expect(n(r.montantTaxe)).toBe(18_000);
    expect(n(r.montantTTC)).toBe(118_000);
  });
});

describe("computeTaxe — montant fixe", () => {
  it("taxe fixe : montant indépendant de la base", () => {
    const r = computeTaxe(100_000, 500, { priceInclude: false, typeAmount: "fixed", devise: "XOF" });
    expect(n(r.baseHT)).toBe(100_000);
    expect(n(r.montantTaxe)).toBe(500);
    expect(n(r.montantTTC)).toBe(100_500);
  });
});
