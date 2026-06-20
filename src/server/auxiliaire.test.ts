import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb, seedComptesStandards } from "./test-helpers";
import { creerPiece } from "./pieces";
import { creerCompte } from "./comptes";
import { creerTiers } from "./tiers";
import { getGrandLivreAuxiliaire, getBalanceAgee } from "./auxiliaire";

let dossierId: string;
let journalId: string;

beforeEach(async () => {
  dossierId = await resetDb();
  await seedComptesStandards(dossierId);
  await creerCompte({ dossierId, numeroSaisi: "411200", intitule: "Clients collectif", collectif: true });
  const j = await prisma.journal.create({ data: { code: "VT", libelle: "Ventes", dossierId } });
  journalId = j.id;
});

describe("getGrandLivreAuxiliaire", () => {
  it("regroupe les mouvements d'un compte collectif par tiers", async () => {
    const tA = await creerTiers({ dossierId, code: "C-A", nom: "Alpha", type: "CLIENT" });
    const tB = await creerTiers({ dossierId, code: "C-B", nom: "Beta", type: "CLIENT" });
    await creerPiece({
      dossierId, journalId, numeroPiece: "V-1", datePiece: new Date("2020-01-01"),
      lignes: [
        { compteNumero: "411200", libelleLigne: "Alpha", debit: 100_000, credit: 0, tiersId: tA.id },
        { compteNumero: "707000", libelleLigne: "Vente", debit: 0, credit: 100_000 },
      ],
    });
    await creerPiece({
      dossierId, journalId, numeroPiece: "V-2", datePiece: new Date("2020-01-02"),
      lignes: [
        { compteNumero: "411200", libelleLigne: "Beta", debit: 60_000, credit: 0, tiersId: tB.id },
        { compteNumero: "707000", libelleLigne: "Vente", debit: 0, credit: 60_000 },
      ],
    });

    const aux = await getGrandLivreAuxiliaire(dossierId, "411200");
    expect(aux).toHaveLength(2);
    const alpha = aux.find((a) => a.tiersCode === "C-A")!;
    expect(alpha.tiersNom).toBe("Alpha");
    expect(alpha.solde).toBe(100_000);
    expect(alpha.lignes).toHaveLength(1);
    const beta = aux.find((a) => a.tiersCode === "C-B")!;
    expect(beta.solde).toBe(60_000);
    // La somme des soldes auxiliaires = solde du compte collectif.
    expect(alpha.solde + beta.solde).toBe(160_000);
  });
});

describe("getBalanceAgee", () => {
  it("ventile les résiduels ouverts par tiers et par tranche d'âge", async () => {
    const tA = await creerTiers({ dossierId, code: "C-A", nom: "Alpha", type: "CLIENT" });
    const ref = new Date("2020-03-01");
    // Facture à 10 jours (tranche 0-30).
    await creerPiece({
      dossierId, journalId, numeroPiece: "V-10", datePiece: new Date("2020-02-20"),
      lignes: [
        { compteNumero: "411200", libelleLigne: "Alpha", debit: 100_000, credit: 0, tiersId: tA.id },
        { compteNumero: "707000", libelleLigne: "Vente", debit: 0, credit: 100_000 },
      ],
    });
    // Facture à ~45 jours (tranche 31-60).
    await creerPiece({
      dossierId, journalId, numeroPiece: "V-45", datePiece: new Date("2020-01-16"),
      lignes: [
        { compteNumero: "411200", libelleLigne: "Alpha", debit: 50_000, credit: 0, tiersId: tA.id },
        { compteNumero: "707000", libelleLigne: "Vente", debit: 0, credit: 50_000 },
      ],
    });

    const lignes = await getBalanceAgee(dossierId, ref);
    const alpha = lignes.find((l) => l.tiersCode === "C-A")!;
    expect(alpha.b0_30).toBe(100_000);
    expect(alpha.b31_60).toBe(50_000);
    expect(alpha.b61_90).toBe(0);
    expect(alpha.b90plus).toBe(0);
    expect(alpha.total).toBe(150_000);
  });
});
