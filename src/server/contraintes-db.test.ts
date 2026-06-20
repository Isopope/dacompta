import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb, seedComptesStandards } from "./test-helpers";

let dossierId: string;
beforeEach(async () => { dossierId = await resetDb(); await seedComptesStandards(dossierId); });

describe("contraintes CHECK", () => {
  it("rejette une ligne debit>0 ET credit>0 au niveau base", async () => {
    const j = await prisma.journal.create({ data: { code: "OD", libelle: "OD", dossierId } });
    const compte = await prisma.compte.findFirstOrThrow({ where: { dossierId, numero: "411000" } });
    const piece = await prisma.piece.create({ data: { numeroPiece: "RAW-1", datePiece: new Date(), journalId: j.id, dossierId } });
    await expect(prisma.ligneEcriture.create({
      data: { pieceId: piece.id, compteId: compte.id, compteNumero: "411000", libelleLigne: "x", debit: 10, credit: 5, ordre: 0, amountResidual: 5 },
    })).rejects.toThrow();
  });
});
