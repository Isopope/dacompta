import { describe, it, expect, beforeEach } from "vitest";
import { resetDb } from "./test-helpers";
import { creerTiers, listerTiers } from "./tiers";

let dossierId: string;
beforeEach(async () => { dossierId = await resetDb(); });

describe("creerTiers", () => {
  it("crée un tiers client avec code et nom", async () => {
    const t = await creerTiers({ dossierId, code: "C001", nom: "Société Alpha", type: "CLIENT" });
    expect(t.code).toBe("C001");
    expect(t.nom).toBe("Société Alpha");
    expect(t.type).toBe("CLIENT");
  });
  it("refuse un code dupliqué dans le même dossier", async () => {
    await creerTiers({ dossierId, code: "C001", nom: "Alpha", type: "CLIENT" });
    await expect(creerTiers({ dossierId, code: "C001", nom: "Bis", type: "CLIENT" }))
      .rejects.toThrow(/existe déjà|déjà/i);
  });
});

describe("listerTiers", () => {
  it("liste les tiers du dossier, triés par code, filtrables par type", async () => {
    await creerTiers({ dossierId, code: "F010", nom: "Fournisseur X", type: "FOURNISSEUR" });
    await creerTiers({ dossierId, code: "C001", nom: "Client A", type: "CLIENT" });
    const tous = await listerTiers(dossierId);
    expect(tous.map((t) => t.code)).toEqual(["C001", "F010"]);
    const clients = await listerTiers(dossierId, { type: "CLIENT" });
    expect(clients).toHaveLength(1);
    expect(clients[0].code).toBe("C001");
  });
});
