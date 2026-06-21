// src/server/etats.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb } from "./test-helpers";
import { creerPiece, validerPiece } from "./pieces";
import { getEtatsData } from "./etats";

let dossierId: string;

beforeEach(async () => {
  dossierId = await resetDb();
  await prisma.compte.createMany({
    data: [
      { numero: "601000", intitule: "Achats", classeNum: 6, type: "DETAIL", reportNplus1: false, dossierId },
      { numero: "701000", intitule: "Ventes", classeNum: 7, type: "DETAIL", reportNplus1: false, dossierId },
      { numero: "521000", intitule: "Banque", classeNum: 5, type: "DETAIL", reportNplus1: false, dossierId },
    ],
  });
  const vt = await prisma.journal.create({ data: { code: "VT", libelle: "Ventes", dossierId } });
  const d = await creerPiece({
    dossierId, journalId: vt.id, numeroPiece: "VT-001", datePiece: new Date("2020-03-01"),
    lignes: [
      { compteNumero: "521000", libelleLigne: "Encaissement", debit: 1000, credit: 0 },
      { compteNumero: "701000", libelleLigne: "Vente", debit: 0, credit: 1000 },
    ],
  });
  await validerPiece(d.id);
});

describe("getEtatsData", () => {
  it("regroupe métadonnées, balance, grand livre et états dérivés", async () => {
    const data = await getEtatsData(dossierId);
    expect(data.dossier.devise).toBe("XOF");
    expect(typeof data.dossier.exercice).toBe("number");
    expect(data.balance.lignes.length).toBeGreaterThan(0);
    expect(data.grandLivre.length).toBeGreaterThan(0);
    expect(data.compteResultat.totalProduits).toBe(1000);
    expect(data.bilan.equilibre).toBe(true);
    expect(data.fluxTresorerie.tresorerieCloture).toBe(1000);
  });

  it("lève une erreur claire si le dossier est introuvable", async () => {
    await expect(getEtatsData("dossier-inexistant")).rejects.toThrow();
  });
});
