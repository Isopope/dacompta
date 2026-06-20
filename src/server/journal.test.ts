// Tests du champ Journal.type (façon journal.type d'Odoo)
import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb } from "./test-helpers";

let dossierId: string;
beforeEach(async () => { dossierId = await resetDb(); });

describe("Journal.type", () => {
  it("stocke le type d'un journal (sale)", async () => {
    const j = await prisma.journal.create({
      data: { code: "VT", libelle: "Ventes", type: "sale", dossierId },
    });
    expect(j.type).toBe("sale");
  });
  it("défaut = misc", async () => {
    const j = await prisma.journal.create({
      data: { code: "OD", libelle: "Opérations diverses", dossierId },
    });
    expect(j.type).toBe("misc");
  });
});
