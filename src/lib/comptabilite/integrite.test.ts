import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { Prisma } from "@prisma/client";
import {
  ErreurIntegrite, verifierSignesLigne, verifierPieceNonVide,
  verifierEquilibre, verifierResiduel, verifierLettrageValide,
} from "./integrite";

const D = (n: number | string) => new Prisma.Decimal(n);

describe("verifierSignesLigne", () => {
  it("rejette une ligne débit ET crédit > 0", () => {
    expect(() => verifierSignesLigne({ debit: 10, credit: 5 })).toThrow(ErreurIntegrite);
  });
  it("rejette un montant négatif", () => {
    expect(() => verifierSignesLigne({ debit: -1, credit: 0 })).toThrow(ErreurIntegrite);
  });
  it("accepte une ligne débit pure", () => {
    expect(() => verifierSignesLigne({ debit: 10, credit: 0 })).not.toThrow();
  });
});

describe("verifierEquilibre (propriété)", () => {
  it("toute pièce équilibrée passe ; +1 unité casse l'équilibre", () => {
    fc.assert(fc.property(fc.array(fc.integer({ min: 1, max: 1_000_000 }), { minLength: 1, maxLength: 8 }), (montants) => {
      const total = montants.reduce((s, m) => s + m, 0);
      const lignes = [
        ...montants.map((m) => ({ debit: m, credit: 0 })),
        { debit: 0, credit: total },
      ];
      verifierEquilibre(lignes, "XOF"); // ne doit pas lever
      expect(() => verifierEquilibre([...lignes, { debit: 0, credit: 1 }], "XOF")).toThrow(ErreurIntegrite);
    }));
  });
});

describe("verifierPieceNonVide", () => {
  it("rejette une pièce sans ligne ou à zéro", () => {
    expect(() => verifierPieceNonVide([])).toThrow(ErreurIntegrite);
    expect(() => verifierPieceNonVide([{ debit: 0, credit: 0 }])).toThrow(ErreurIntegrite);
  });
});

describe("verifierResiduel", () => {
  it("résiduel = |debit−credit| − Σlettré, jamais négatif", () => {
    expect(() => verifierResiduel(D(40), D(100), D(0), D(60), "XOF")).not.toThrow();
    expect(() => verifierResiduel(D(50), D(100), D(0), D(60), "XOF")).toThrow(ErreurIntegrite); // 100-60=40≠50
    expect(() => verifierResiduel(D(0), D(100), D(0), D(150), "XOF")).toThrow(ErreurIntegrite); // sur-lettrage
  });
});

const base = {
  compteDebit: "411000", compteCredit: "411000",
  dossierDebit: "d1", dossierCredit: "d1", dossierAttendu: "d1",
  sensDebitOk: true, sensCreditOk: true,
  montant: D(50), residuelDebit: D(100), residuelCredit: D(50), devise: "XOF",
};

describe("verifierLettrageValide", () => {
  it("accepte un lettrage cohérent", () => { expect(() => verifierLettrageValide(base)).not.toThrow(); });
  it("refuse des comptes différents", () => { expect(() => verifierLettrageValide({ ...base, compteCredit: "401000" })).toThrow(ErreurIntegrite); });
  it("refuse un dossier différent", () => { expect(() => verifierLettrageValide({ ...base, dossierCredit: "d2" })).toThrow(ErreurIntegrite); });
  it("refuse un montant > min(résiduels)", () => { expect(() => verifierLettrageValide({ ...base, montant: D(80) })).toThrow(ErreurIntegrite); });
  it("refuse un montant ≤ 0", () => { expect(() => verifierLettrageValide({ ...base, montant: D(0) })).toThrow(ErreurIntegrite); });
  it("refuse un sens incompatible", () => { expect(() => verifierLettrageValide({ ...base, sensDebitOk: false })).toThrow(ErreurIntegrite); });
});
