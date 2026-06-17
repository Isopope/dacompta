import { describe, it, expect } from "vitest";
import {
  completerNumero, extraireClasse, deduireReport,
  detecterNature, validerNumero,
} from "./compte-logic";
import { NATURES, CLASSES } from "./referentiel";

describe("completerNumero", () => {
  it("complète une racine à 6 chiffres par des zéros à droite", () => {
    expect(completerNumero("401")).toBe("401000");
    expect(completerNumero("6")).toBe("600000");
  });
  it("laisse un numéro déjà à 6 chiffres inchangé", () => {
    expect(completerNumero("571100")).toBe("571100");
  });
  it("ignore espaces et caractères non numériques", () => {
    expect(completerNumero(" 40 1 ")).toBe("401000");
  });
  it("tronque au-delà de 6 chiffres", () => {
    expect(completerNumero("4011001")).toBe("401100");
  });
});

describe("extraireClasse", () => {
  it("renvoie le premier chiffre comme numéro de classe", () => {
    expect(extraireClasse("401100")).toBe(4);
    expect(extraireClasse("601100")).toBe(6);
  });
});

describe("deduireReport", () => {
  it("reporte les classes de bilan (1 à 5)", () => {
    for (const c of [1, 2, 3, 4, 5]) expect(deduireReport(c)).toBe(true);
  });
  it("remet à zéro les classes de gestion/HAO/analytique (6 à 9)", () => {
    for (const c of [6, 7, 8, 9]) expect(deduireReport(c)).toBe(false);
  });
});

describe("detecterNature", () => {
  it("détecte par la racine la plus longue qui correspond", () => {
    expect(detecterNature("401100", NATURES)?.libelle).toBe("Fournisseurs");
    expect(detecterNature("121000", NATURES)?.libelle).toBe("Report à nouveau");
    expect(detecterNature("601100", NATURES)?.libelle).toBe("Charges (activités ordinaires)");
  });
  it("renvoie null quand aucune nature ne correspond (ex. classe 2)", () => {
    expect(detecterNature("245100", NATURES)).toBeNull();
  });
});

describe("validerNumero", () => {
  it("accepte un numéro de 6 chiffres dans une classe connue", () => {
    expect(validerNumero("401100", CLASSES).ok).toBe(true);
  });
  it("refuse une classe inconnue (0)", () => {
    expect(validerNumero("001100", CLASSES).ok).toBe(false);
  });
  it("refuse une longueur invalide", () => {
    expect(validerNumero("40", CLASSES).ok).toBe(false);
  });
});
