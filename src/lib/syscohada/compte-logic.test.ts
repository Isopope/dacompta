import { describe, it, expect } from "vitest";
import {
  completerNumero, extraireClasse, deduireReport,
  detecterNature, validerNumero, deduireAccountType, deduireReconciliable,
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

describe("deduireAccountType", () => {
  it("tiers classe 4 : 41 → asset_receivable, 40 → liability_payable", () => {
    expect(deduireAccountType("411100")).toBe("asset_receivable");
    expect(deduireAccountType("401100")).toBe("liability_payable");
  });
  it("personnel/organismes sociaux (42/43) → liability_payable", () => {
    expect(deduireAccountType("421000")).toBe("liability_payable");
    expect(deduireAccountType("431000")).toBe("liability_payable");
  });
  it("TVA : 443 collectée → liability_current, 445 déductible → asset_current", () => {
    expect(deduireAccountType("443100")).toBe("liability_current");
    expect(deduireAccountType("445200")).toBe("asset_current");
  });
  it("trésorerie classe 5 → asset_cash", () => {
    expect(deduireAccountType("521100")).toBe("asset_cash");
    expect(deduireAccountType("571100")).toBe("asset_cash");
  });
  it("capitaux : 10 → equity, 12 report à nouveau → equity_unaffected, 16 emprunts → liability_non_current", () => {
    expect(deduireAccountType("101300")).toBe("equity");
    expect(deduireAccountType("121000")).toBe("equity_unaffected");
    expect(deduireAccountType("162000")).toBe("liability_non_current");
  });
  it("immobilisations classe 2 → asset_fixed, stocks classe 3 → asset_current", () => {
    expect(deduireAccountType("245100")).toBe("asset_fixed");
    expect(deduireAccountType("311000")).toBe("asset_current");
  });
  it("gestion : 6 → expense, 7 → income", () => {
    expect(deduireAccountType("601100")).toBe("expense");
    expect(deduireAccountType("706100")).toBe("income");
  });
  it("HAO classe 8 : produits (2e chiffre pair) → income_other, charges → expense", () => {
    expect(deduireAccountType("821000")).toBe("income_other");
    expect(deduireAccountType("811000")).toBe("expense");
  });
  it("classe 9 → off_balance", () => {
    expect(deduireAccountType("901000")).toBe("off_balance");
  });
});

describe("deduireReconciliable", () => {
  it("vrai pour receivable et payable (règle Odoo account.reconcile)", () => {
    expect(deduireReconciliable("asset_receivable")).toBe(true);
    expect(deduireReconciliable("liability_payable")).toBe(true);
  });
  it("faux par défaut pour les autres types", () => {
    expect(deduireReconciliable("asset_cash")).toBe(false);
    expect(deduireReconciliable("liability_current")).toBe(false);
    expect(deduireReconciliable("income")).toBe(false);
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
