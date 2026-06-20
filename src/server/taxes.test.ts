import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb, seedComptesStandards } from "./test-helpers";
import { creerCompte } from "./comptes";
import { creerTiers } from "./tiers";
import { creerTaxe, listerTaxes, creerFacture, getDeclarationTVA } from "./taxes";

let dossierId: string;
let journalVente: string;
let journalAchat: string;

beforeEach(async () => {
  dossierId = await resetDb();
  await seedComptesStandards(dossierId);
  // Comptes collectifs clients/fournisseurs.
  await creerCompte({ dossierId, numeroSaisi: "411100", intitule: "Clients", collectif: true });
  await creerCompte({ dossierId, numeroSaisi: "401100", intitule: "Fournisseurs", collectif: true });
  journalVente = (await prisma.journal.create({ data: { code: "VT", libelle: "Ventes", dossierId } })).id;
  journalAchat = (await prisma.journal.create({ data: { code: "ACH", libelle: "Achats", dossierId } })).id;
});

describe("creerTaxe / listerTaxes", () => {
  it("crée une taxe de vente et la liste", async () => {
    const t = await creerTaxe({ dossierId, code: "TVA18", nom: "TVA 18%", taux: 18, usage: "sale", compteNumero: "443100" });
    expect(t.taux.toString()).toBe("18");
    const liste = await listerTaxes(dossierId, { usage: "sale" });
    expect(liste.map((x) => x.code)).toContain("TVA18");
  });
});

describe("creerFacture — vente avec TVA collectée", () => {
  it("génère une pièce équilibrée : produit HT + TVA + créance TTC sur le tiers", async () => {
    await creerTaxe({ dossierId, code: "TVA18", nom: "TVA 18%", taux: 18, usage: "sale", compteNumero: "443100" });
    const client = await creerTiers({ dossierId, code: "C001", nom: "Alpha", type: "CLIENT" });

    const piece = await creerFacture({
      dossierId, journalId: journalVente, numeroPiece: "VT-1", sens: "VENTE",
      tiersId: client.id, compteTiersNumero: "411100",
      lignes: [{ compteNumero: "707000", libelleLigne: "Vente", montantHT: 100_000, taxeCode: "TVA18" }],
    });

    // 707 crédit 100 000 ; 443 crédit 18 000 ; 411 débit 118 000.
    const ligne707 = piece.lignes.find((l) => l.compteNumero === "707000")!;
    const ligne443 = piece.lignes.find((l) => l.compteNumero === "443100")!;
    const ligne411 = piece.lignes.find((l) => l.compteNumero === "411100")!;
    expect(Number(ligne707.credit)).toBe(100_000);
    expect(Number(ligne443.credit)).toBe(18_000);
    expect(ligne443.taxeId).not.toBeNull();
    expect(Number(ligne411.debit)).toBe(118_000);
    expect(ligne411.tiersId).toBe(client.id);
    // HT/TVA/TTC corrects (plus d'heuristique fausse).
    expect(Number(piece.montantHT)).toBe(100_000);
    expect(Number(piece.montantTVA)).toBe(18_000);
    expect(Number(piece.montantTTC)).toBe(118_000);
  });
});

describe("creerFacture — achat avec TVA déductible", () => {
  it("génère charge HT + TVA déductible au débit, dette TTC au crédit", async () => {
    await creerTaxe({ dossierId, code: "TVA18A", nom: "TVA déductible 18%", taux: 18, usage: "purchase", compteNumero: "445660" });
    const frns = await creerTiers({ dossierId, code: "F001", nom: "Gamma", type: "FOURNISSEUR" });

    const piece = await creerFacture({
      dossierId, journalId: journalAchat, numeroPiece: "ACH-1", sens: "ACHAT",
      tiersId: frns.id, compteTiersNumero: "401100",
      lignes: [{ compteNumero: "601000", libelleLigne: "Achat", montantHT: 100_000, taxeCode: "TVA18A" }],
    });

    expect(Number(piece.lignes.find((l) => l.compteNumero === "601000")!.debit)).toBe(100_000);
    expect(Number(piece.lignes.find((l) => l.compteNumero === "445660")!.debit)).toBe(18_000);
    const ligne401 = piece.lignes.find((l) => l.compteNumero === "401100")!;
    expect(Number(ligne401.credit)).toBe(118_000);
    expect(ligne401.tiersId).toBe(frns.id);
  });
});

describe("getDeclarationTVA", () => {
  it("agrège TVA collectée et déductible et calcule la TVA nette due", async () => {
    await creerTaxe({ dossierId, code: "TVA18", nom: "TVA 18%", taux: 18, usage: "sale", compteNumero: "443100" });
    await creerTaxe({ dossierId, code: "TVA18A", nom: "TVA déd. 18%", taux: 18, usage: "purchase", compteNumero: "445660" });
    const client = await creerTiers({ dossierId, code: "C001", nom: "Alpha", type: "CLIENT" });
    const frns = await creerTiers({ dossierId, code: "F001", nom: "Gamma", type: "FOURNISSEUR" });

    await creerFacture({
      dossierId, journalId: journalVente, numeroPiece: "VT-1", sens: "VENTE",
      tiersId: client.id, compteTiersNumero: "411100",
      lignes: [{ compteNumero: "707000", libelleLigne: "Vente", montantHT: 100_000, taxeCode: "TVA18" }],
    });
    await creerFacture({
      dossierId, journalId: journalAchat, numeroPiece: "ACH-1", sens: "ACHAT",
      tiersId: frns.id, compteTiersNumero: "401100",
      lignes: [{ compteNumero: "601000", libelleLigne: "Achat", montantHT: 50_000, taxeCode: "TVA18A" }],
    });

    const decl = await getDeclarationTVA(dossierId);
    expect(decl.collectee).toBe(18_000); // sur 100 000
    expect(decl.deductible).toBe(9_000); // sur 50 000
    expect(decl.netteDue).toBe(9_000); // 18 000 − 9 000
  });
});
