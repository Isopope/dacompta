// src/lib/etats/export/index.test.ts
import { describe, it, expect } from "vitest";
import { buildExport } from "./index";
import type { EtatsData } from "@/server/etats";

const data: EtatsData = {
  dossier: { nom: "Test SARL", exercice: 2020, devise: "XOF" },
  balance: { lignes: [], totaux: { debit: 0, credit: 0, soldeDebiteur: 0, soldeCrediteur: 0 } },
  grandLivre: [],
  bilan: { actif: [], passif: [], totalActif: 0, totalPassif: 0, resultatNet: 0, equilibre: true },
  compteResultat: { charges: [], produits: [], totalCharges: 0, totalProduits: 0, resultatNet: 0, totalChargesNMoins1: 0, totalProduitsNMoins1: 0, resultatNetNMoins1: 0 },
  fluxTresorerie: { exploitation: { total: 0, postes: [] }, investissement: { total: 0, postes: [] }, financement: { total: 0, postes: [] }, variationTresorerie: 0, tresorerieOuverture: 0, tresorerieCloture: 0 },
};

describe("buildExport", () => {
  it("xlsx : nom, content-type et buffer corrects", async () => {
    const r = await buildExport("bilan", "xlsx", data);
    expect(r.filename).toBe("test-sarl_bilan_2020.xlsx");
    expect(r.contentType).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(r.buffer.length).toBeGreaterThan(0);
  });

  it("pdf : nom, content-type et octets %PDF", async () => {
    const r = await buildExport("balance-generale", "pdf", data);
    expect(r.filename).toBe("test-sarl_balance-generale_2020.pdf");
    expect(r.contentType).toBe("application/pdf");
    expect(r.buffer.subarray(0, 4).toString("latin1")).toBe("%PDF");
  });
});
