import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import { decimalesDevise, arrondiDevise, estNulDevise } from "./devise";

const D = (n: number | string) => new Prisma.Decimal(n);

describe("devise", () => {
  it("FCFA (XOF/XAF) = 0 décimale, autres = 2", () => {
    expect(decimalesDevise("XOF")).toBe(0);
    expect(decimalesDevise("XAF")).toBe(0);
    expect(decimalesDevise("EUR")).toBe(2);
  });
  it("arrondit selon la devise", () => {
    expect(arrondiDevise(D("100.4"), "XOF").toString()).toBe("100");
    expect(arrondiDevise(D("100.005"), "EUR").toString()).toBe("100.01");
  });
  it("estNulDevise tolère le sous-unité de la devise", () => {
    expect(estNulDevise(D("0.4"), "XOF")).toBe(true);   // arrondi à 0 en FCFA
    expect(estNulDevise(D("0.4"), "EUR")).toBe(false);
  });
});
