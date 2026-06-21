// src/app/etats/export/route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/dossier-context", () => ({ getDossierIdCookie: vi.fn() }));
vi.mock("@/server/etats", () => ({ getEtatsData: vi.fn() }));

import { GET } from "./route";
import { getDossierIdCookie } from "@/lib/dossier-context";
import { getEtatsData } from "@/server/etats";

const fakeData = {
  dossier: { nom: "Test SARL", exercice: 2020, devise: "XOF" },
  balance: { lignes: [], totaux: { debit: 0, credit: 0, soldeDebiteur: 0, soldeCrediteur: 0 } },
  grandLivre: [],
  bilan: { actif: [], passif: [], totalActif: 0, totalPassif: 0, resultatNet: 0, equilibre: true },
  compteResultat: { charges: [], produits: [], totalCharges: 0, totalProduits: 0, resultatNet: 0, totalChargesNMoins1: 0, totalProduitsNMoins1: 0, resultatNetNMoins1: 0 },
  fluxTresorerie: { exploitation: { total: 0, postes: [] }, investissement: { total: 0, postes: [] }, financement: { total: 0, postes: [] }, variationTresorerie: 0, tresorerieOuverture: 0, tresorerieCloture: 0 },
};

beforeEach(() => {
  vi.mocked(getDossierIdCookie).mockReset();
  vi.mocked(getEtatsData).mockReset();
});

function req(qs: string) {
  return new Request(`http://localhost/etats/export${qs}`);
}

describe("GET /etats/export", () => {
  it("400 si aucun dossier", async () => {
    vi.mocked(getDossierIdCookie).mockResolvedValue(null);
    const res = await GET(req("?doc=bilan&format=pdf"));
    expect(res.status).toBe(400);
  });

  it("400 si doc invalide", async () => {
    vi.mocked(getDossierIdCookie).mockResolvedValue("d1");
    const res = await GET(req("?doc=notes&format=pdf"));
    expect(res.status).toBe(400);
  });

  it("400 si format invalide", async () => {
    vi.mocked(getDossierIdCookie).mockResolvedValue("d1");
    const res = await GET(req("?doc=bilan&format=csv"));
    expect(res.status).toBe(400);
  });

  it("200 + en-têtes de téléchargement pour xlsx", async () => {
    vi.mocked(getDossierIdCookie).mockResolvedValue("d1");
    vi.mocked(getEtatsData).mockResolvedValue(fakeData as never);
    const res = await GET(req("?doc=bilan&format=xlsx"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    expect(res.headers.get("Content-Disposition")).toContain("test-sarl_bilan_2020.xlsx");
    expect((await res.arrayBuffer()).byteLength).toBeGreaterThan(0);
  });

  it("500 si la génération échoue", async () => {
    vi.mocked(getDossierIdCookie).mockResolvedValue("d1");
    vi.mocked(getEtatsData).mockRejectedValue(new Error("DB down"));
    const res = await GET(req("?doc=bilan&format=pdf"));
    expect(res.status).toBe(500);
  });
});
