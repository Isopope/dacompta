import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb, seedComptesStandards } from "./test-helpers";
import { creerPiece, validerPiece } from "./pieces";
import { definirVerrou, getAuditLog } from "./verrou";

let dossierId: string;
let journalId: string;

async function pieceSimple(numero: string, date: Date) {
  return creerPiece({
    dossierId, journalId, numeroPiece: numero, datePiece: date,
    lignes: [
      { compteNumero: "601000", libelleLigne: "Achat", debit: 1000, credit: 0 },
      { compteNumero: "401000", libelleLigne: "Frns", debit: 0, credit: 1000 },
    ],
  });
}

beforeEach(async () => {
  dossierId = await resetDb();
  await seedComptesStandards(dossierId);
  journalId = (await prisma.journal.create({ data: { code: "OD", libelle: "OD", dossierId } })).id;
});

describe("definirVerrou", () => {
  it("refuse une écriture dont la date est dans la période verrouillée", async () => {
    await definirVerrou(dossierId, { fiscalyearLockDate: new Date("2020-12-31") });
    await expect(pieceSimple("OD-1", new Date("2020-06-01"))).rejects.toThrow(/verrouillée/i);
  });

  it("autorise une écriture après le verrou", async () => {
    await definirVerrou(dossierId, { fiscalyearLockDate: new Date("2020-12-31") });
    const p = await pieceSimple("OD-2", new Date("2021-01-15"));
    expect(p.statut).toBe("BROUILLON");
  });

  it("interdit de lever ou reculer un verrou définitif (hard lock)", async () => {
    await definirVerrou(dossierId, { hardLockDate: new Date("2020-12-31") });
    await expect(definirVerrou(dossierId, { hardLockDate: null })).rejects.toThrow(/définitif|irréversible/i);
    await expect(definirVerrou(dossierId, { hardLockDate: new Date("2020-06-30") })).rejects.toThrow(/définitif|irréversible/i);
    // Avancer le hard lock est permis.
    const d = await definirVerrou(dossierId, { hardLockDate: new Date("2021-12-31") });
    expect(d.hardLockDate?.toISOString().slice(0, 10)).toBe("2021-12-31");
  });

  it("journalise le verrou dans l'audit", async () => {
    await definirVerrou(dossierId, { fiscalyearLockDate: new Date("2020-12-31") });
    const logs = await getAuditLog(dossierId);
    expect(logs.some((l) => l.type === "VERROU")).toBe(true);
  });
});

describe("audit trail des opérations", () => {
  it("journalise la validation d'une pièce", async () => {
    const p = await pieceSimple("OD-10", new Date("2021-03-01"));
    await validerPiece(p.id);
    const logs = await getAuditLog(dossierId);
    expect(logs.some((l) => l.type === "VALIDATION" && l.pieceId === p.id)).toBe(true);
  });
});
