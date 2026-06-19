import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb, seedComptesStandards } from "./test-helpers";
import { creerPiece } from "./pieces";
import { getLettragesByDossier } from "./lettrage";
import {
  creerRegle,
  listerRegles,
  supprimerRegle,
  appliquerReglesLettrageAutomatique,
} from "./reglesLettrage";

let dossierId: string;
let journalId: string;

beforeEach(async () => {
  dossierId = await resetDb();
  await seedComptesStandards(dossierId);
  const j = await prisma.journal.create({
    data: { code: "OD", libelle: "Opérations diverses", dossierId },
  });
  journalId = j.id;
});

async function piece(
  numeroPiece: string,
  lignes: { compteNumero: string; debit: number; credit: number }[],
  datePiece: Date
) {
  return creerPiece({
    dossierId,
    journalId,
    numeroPiece,
    datePiece,
    lignes: lignes.map((l) => ({ ...l, libelleLigne: l.compteNumero })),
  });
}

describe("CRUD règles de lettrage", () => {
  it("crée puis liste une règle active", async () => {
    await creerRegle({
      dossierId,
      nom: "Clients 411",
      prefixeCompte: "411",
      tolerancePct: 10,
      toleranceJours: 30,
    });
    const regles = await listerRegles(dossierId);
    expect(regles).toHaveLength(1);
    expect(regles[0].prefixeCompte).toBe("411");
    expect(regles[0].active).toBe(true);
  });

  it("supprime une règle", async () => {
    const r = await creerRegle({
      dossierId,
      nom: "Frns 401",
      prefixeCompte: "401",
      tolerancePct: 5,
      toleranceJours: 15,
    });
    await supprimerRegle(r.id);
    expect(await listerRegles(dossierId)).toHaveLength(0);
  });
});

describe("appliquerReglesLettrageAutomatique", () => {
  it("lettre automatiquement deux lignes du même tiers dans la tolérance (±10%, ±30j)", async () => {
    await creerRegle({
      dossierId,
      nom: "Clients 411",
      prefixeCompte: "411",
      tolerancePct: 10,
      toleranceJours: 30,
    });

    await piece(
      "F-1",
      [
        { compteNumero: "411000", debit: 100_000, credit: 0 },
        { compteNumero: "707000", debit: 0, credit: 100_000 },
      ],
      new Date("2020-01-01")
    );
    await piece(
      "E-1",
      [
        { compteNumero: "521000", debit: 95_000, credit: 0 },
        { compteNumero: "411000", debit: 0, credit: 95_000 },
      ],
      new Date("2020-01-10")
    );

    await appliquerReglesLettrageAutomatique(dossierId);

    const lettrages = await getLettragesByDossier(dossierId);
    expect(lettrages).toHaveLength(1);
    expect(lettrages[0].montant).toBe(95_000); // min(100 000, 95 000)
  });

  it("ne lettre pas si le montant sort de la tolérance ±10%", async () => {
    await creerRegle({
      dossierId,
      nom: "Clients 411",
      prefixeCompte: "411",
      tolerancePct: 10,
      toleranceJours: 30,
    });

    await piece(
      "F-2",
      [
        { compteNumero: "411000", debit: 100_000, credit: 0 },
        { compteNumero: "707000", debit: 0, credit: 100_000 },
      ],
      new Date("2020-01-01")
    );
    await piece(
      "E-2",
      [
        { compteNumero: "521000", debit: 50_000, credit: 0 },
        { compteNumero: "411000", debit: 0, credit: 50_000 },
      ],
      new Date("2020-01-05")
    );

    await appliquerReglesLettrageAutomatique(dossierId);
    expect(await getLettragesByDossier(dossierId)).toHaveLength(0);
  });

  it("ne lettre pas si les dates sont trop éloignées (> ±30j)", async () => {
    await creerRegle({
      dossierId,
      nom: "Clients 411",
      prefixeCompte: "411",
      tolerancePct: 10,
      toleranceJours: 30,
    });

    await piece(
      "F-3",
      [
        { compteNumero: "411000", debit: 100_000, credit: 0 },
        { compteNumero: "707000", debit: 0, credit: 100_000 },
      ],
      new Date("2020-01-01")
    );
    await piece(
      "E-3",
      [
        { compteNumero: "521000", debit: 95_000, credit: 0 },
        { compteNumero: "411000", debit: 0, credit: 95_000 },
      ],
      new Date("2020-06-01") // ~5 mois plus tard
    );

    await appliquerReglesLettrageAutomatique(dossierId);
    expect(await getLettragesByDossier(dossierId)).toHaveLength(0);
  });

  it("n'applique pas une règle inactive", async () => {
    const r = await creerRegle({
      dossierId,
      nom: "Clients 411",
      prefixeCompte: "411",
      tolerancePct: 10,
      toleranceJours: 30,
    });
    await prisma.regleLettrage.update({ where: { id: r.id }, data: { active: false } });

    await piece(
      "F-4",
      [
        { compteNumero: "411000", debit: 100_000, credit: 0 },
        { compteNumero: "707000", debit: 0, credit: 100_000 },
      ],
      new Date("2020-01-01")
    );
    await piece(
      "E-4",
      [
        { compteNumero: "521000", debit: 100_000, credit: 0 },
        { compteNumero: "411000", debit: 0, credit: 100_000 },
      ],
      new Date("2020-01-02")
    );

    await appliquerReglesLettrageAutomatique(dossierId);
    expect(await getLettragesByDossier(dossierId)).toHaveLength(0);
  });
});
