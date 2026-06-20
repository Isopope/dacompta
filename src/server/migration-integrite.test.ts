import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb, seedComptesStandards } from "./test-helpers";
import { creerPiece, validerPiece } from "./pieces";
import { archiverCompte } from "./comptes";
import { preVolMigration, executerMigration } from "./migration-integrite";
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

// ---------------------------------------------------------------------------
// Garde archivage
// ---------------------------------------------------------------------------
describe("garde archivage", () => {
  it("refuse d'archiver un compte mouvementé", async () => {
    // Créer et valider une pièce sur 601000
    const p = await creerPiece({
      dossierId,
      journalId,
      numeroPiece: "ACH-GUARD-001",
      datePiece: new Date("2020-03-15"),
      lignes: [
        { compteNumero: "601000", libelleLigne: "Achat", debit: 500, credit: 0 },
        { compteNumero: "401000", libelleLigne: "Fournisseur", debit: 0, credit: 500 },
      ],
    });
    await validerPiece(p.id);

    const c = await prisma.compte.findFirstOrThrow({
      where: { dossierId, numero: "601000" },
    });
    await expect(archiverCompte(c.id)).rejects.toThrow(/mouvement|écriture/i);
  });

  it("archive normalement un compte sans écritures", async () => {
    const c = await prisma.compte.findFirstOrThrow({
      where: { dossierId, numero: "521000" },
    });
    await expect(archiverCompte(c.id)).resolves.toMatchObject({ statut: "ARCHIVE" });
  });
});

// ---------------------------------------------------------------------------
// Migration fail-fast
// ---------------------------------------------------------------------------
describe("migration fail-fast", () => {
  it("le pré-vol détecte une pièce VALIDEE déséquilibrée et la migration avorte", async () => {
    // Insérer en base brute une pièce VALIDEE déséquilibrée (bypass creerPiece).
    // La contrainte CHECK interdit debit>0 AND credit>0 sur une même ligne,
    // donc on déséquilibre via deux lignes : 411 débit 100 / 707 crédit 50.
    const piece = await prisma.piece.create({
      data: {
        numeroPiece: "ACH/2020/DESES",
        datePiece: new Date("2020-06-01"),
        statut: "VALIDEE",
        exercice: 2020,
        journalId,
        dossierId,
        lignes: {
          create: [
            {
              compteNumero: "411000",
              compteId: (await prisma.compte.findFirstOrThrow({ where: { dossierId, numero: "411000" } })).id,
              libelleLigne: "Client débit",
              debit: 100,
              credit: 0,
              ordre: 0,
              amountResidual: 100,
            },
            {
              compteNumero: "707000",
              compteId: (await prisma.compte.findFirstOrThrow({ where: { dossierId, numero: "707000" } })).id,
              libelleLigne: "Vente crédit",
              debit: 0,
              credit: 50,
              ordre: 1,
              amountResidual: 50,
            },
          ],
        },
      },
    });
    expect(piece.statut).toBe("VALIDEE");

    const anomalies = await preVolMigration(dossierId);
    expect(anomalies.some((a) => a.type === "PIECE_DESEQUILIBREE")).toBe(true);

    await expect(executerMigration(dossierId)).rejects.toThrow(/pré-vol|anomalie/i);

    // Garantie "no writes on abort" : la pièce insérée ne doit pas avoir été modifiée
    const pieceApres = await prisma.piece.findUniqueOrThrow({ where: { id: piece.id } });
    expect(pieceApres.numeroPiece).toBe("ACH/2020/DESES");
  });

  it("sur base saine : balance identique avant/après + idempotent", async () => {
    // Créer des pièces saines et les valider
    const p1 = await creerPiece({
      dossierId,
      journalId,
      numeroPiece: "ACH-SAIN-001",
      datePiece: new Date("2020-03-10"),
      lignes: [
        { compteNumero: "601000", libelleLigne: "Achat marchandises", debit: 1000, credit: 0 },
        { compteNumero: "401000", libelleLigne: "Fournisseur", debit: 0, credit: 1000 },
      ],
    });
    await validerPiece(p1.id);

    const p2 = await creerPiece({
      dossierId,
      journalId,
      numeroPiece: "ACH-SAIN-002",
      datePiece: new Date("2020-04-15"),
      lignes: [
        { compteNumero: "605100", libelleLigne: "Eau", debit: 200, credit: 0 },
        { compteNumero: "401000", libelleLigne: "Fournisseur eau", debit: 0, credit: 200 },
      ],
    });
    await validerPiece(p2.id);

    // Pas d'anomalie en base saine
    const anomalies = await preVolMigration(dossierId);
    expect(anomalies).toHaveLength(0);

    // Capture balance avant
    const avant = await getBalance(dossierId);

    // Première migration
    const r1 = await executerMigration(dossierId);
    expect(r1.balanceIdentique).toBe(true);

    // Seconde migration (idempotent)
    const r2 = await executerMigration(dossierId);
    expect(r2.balanceIdentique).toBe(true);

    // Balance finale identique
    const apres = await getBalance(dossierId);
    expect(apres.totaux.debit).toBeCloseTo(avant.totaux.debit, 2);
    expect(apres.totaux.credit).toBeCloseTo(avant.totaux.credit, 2);
  });
});
