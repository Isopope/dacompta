import { describe, it, expect } from "vitest";
import { COMPTES_BASE_SYSCOHADA, CLASSES } from "./referentiel";

describe("COMPTES_BASE_SYSCOHADA", () => {
  it("est un plan curé de taille raisonnable (60-100 comptes)", () => {
    expect(COMPTES_BASE_SYSCOHADA.length).toBeGreaterThanOrEqual(60);
    expect(COMPTES_BASE_SYSCOHADA.length).toBeLessThanOrEqual(100);
  });

  it("n'a que des numéros à 6 chiffres, sans doublon", () => {
    const numeros = COMPTES_BASE_SYSCOHADA.map((c) => c.numero);
    for (const n of numeros) expect(n).toMatch(/^\d{6}$/);
    expect(new Set(numeros).size).toBe(numeros.length);
  });

  it("contient les comptes requis par les taxes et la trésorerie", () => {
    const numeros = new Set(COMPTES_BASE_SYSCOHADA.map((c) => c.numero));
    for (const requis of ["443100", "445200", "401000", "411000", "521000", "571000", "601000", "701000"]) {
      expect(numeros.has(requis)).toBe(true);
    }
  });

  it("marque 401000 et 411000 comme collectifs", () => {
    const c401 = COMPTES_BASE_SYSCOHADA.find((c) => c.numero === "401000");
    const c411 = COMPTES_BASE_SYSCOHADA.find((c) => c.numero === "411000");
    expect(c401?.collectif).toBe(true);
    expect(c411?.collectif).toBe(true);
  });

  it("couvre au minimum les classes 1 à 7", () => {
    const classes = new Set(COMPTES_BASE_SYSCOHADA.map((c) => Number(c.numero[0])));
    for (const cl of [1, 2, 3, 4, 5, 6, 7]) expect(classes.has(cl)).toBe(true);
    // toutes les classes utilisées sont déclarées dans CLASSES
    const connues = new Set(CLASSES.map((c) => c.numero));
    for (const cl of classes) expect(connues.has(cl)).toBe(true);
  });
});
