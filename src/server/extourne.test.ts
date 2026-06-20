import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb, seedComptesStandards } from "./test-helpers";
import { creerPiece, validerPiece } from "./pieces";
import { extournerPiece } from "./pieces";
import { getBalance } from "./balance";

let dossierId: string;
let journalId: string;

beforeEach(async () => {
  dossierId = await resetDb();
  await seedComptesStandards(dossierId);
  const j = await prisma.journal.create({
    data: { code: "ACH", libelle: "Achats", dossierId },
  });
  journalId = j.id;
});

describe("extournerPiece", () => {
  it("crée une pièce inverse validée et remet la balance à l'identique", async () => {
    const p = await creerPiece({
      dossierId,
      journalId,
      numeroPiece: "ACH-001",
      datePiece: new Date("2020-03-01"),
      lignes: [
        { compteNumero: "601000", libelleLigne: "Achat marchandises", debit: 1000, credit: 0 },
        { compteNumero: "401000", libelleLigne: "Fournisseur ACI", debit: 0, credit: 1000 },
      ],
    });
    await validerPiece(p.id);

    const ext = await extournerPiece(p.id);

    // L'extourne référence la pièce d'origine
    expect(ext.extourneDeId).toBe(p.id);
    // L'extourne est validée
    expect(ext.statut).toBe("VALIDEE");

    // La balance après extourne : le compte 401000 doit être à 0
    const apres = await getBalance(dossierId);
    const solde401 = apres.lignes.find((l) => l.compteNumero === "401000")?.soldeCrediteur ?? 0;
    expect(solde401).toBe(0); // l'extourne annule le mouvement d'origine
  });

  it("refuse une 2ème extourne de la même pièce", async () => {
    const p = await creerPiece({
      dossierId,
      journalId,
      numeroPiece: "ACH-002",
      datePiece: new Date("2020-03-01"),
      lignes: [
        { compteNumero: "601000", libelleLigne: "Achat marchandises", debit: 500, credit: 0 },
        { compteNumero: "401000", libelleLigne: "Fournisseur ACI", debit: 0, credit: 500 },
      ],
    });
    await validerPiece(p.id);
    await extournerPiece(p.id);

    await expect(extournerPiece(p.id)).rejects.toThrow(/déjà extournée/i);
  });

  it("refuse d'extourner une pièce non validée", async () => {
    const p = await creerPiece({
      dossierId,
      journalId,
      numeroPiece: "ACH-003",
      datePiece: new Date("2020-03-01"),
      lignes: [
        { compteNumero: "601000", libelleLigne: "Achat marchandises", debit: 200, credit: 0 },
        { compteNumero: "401000", libelleLigne: "Fournisseur ACI", debit: 0, credit: 200 },
      ],
    });

    await expect(extournerPiece(p.id)).rejects.toThrow(/validée/i);
  });
});
