import { describe, it, expect, beforeEach } from "vitest";
import { resetDb } from "./test-helpers";
import { creerCompte, listerComptes, modifierCompte, archiverCompte } from "./comptes";

let dossierId: string;
beforeEach(async () => { dossierId = await resetDb(); });

describe("creerCompte", () => {
  it("complète le n°, déduit nature et report depuis la racine", async () => {
    const c = await creerCompte({ dossierId, numeroSaisi: "401", intitule: "Fournisseur ACI" });
    expect(c.numero).toBe("401000");
    expect(c.natureRacine).toBe("40");
    expect(c.reportNplus1).toBe(false);
  });
  it("refuse un doublon", async () => {
    await creerCompte({ dossierId, numeroSaisi: "571100", intitule: "Caisse" });
    await expect(creerCompte({ dossierId, numeroSaisi: "571100", intitule: "Caisse bis" }))
      .rejects.toThrow(/existe déjà/);
  });
  it("refuse un compte hors SYSCOHADA", async () => {
    await expect(creerCompte({ dossierId, numeroSaisi: "001100", intitule: "X" }))
      .rejects.toThrow(/Classe 0/);
  });
});

describe("listerComptes", () => {
  it("ne renvoie que les comptes actifs, filtrés", async () => {
    await creerCompte({ dossierId, numeroSaisi: "411100", intitule: "Clients" });
    await creerCompte({ dossierId, numeroSaisi: "601100", intitule: "Achats marchandises" });
    const tous = await listerComptes(dossierId, {});
    expect(tous).toHaveLength(2);
    const f = await listerComptes(dossierId, { texte: "client" });
    expect(f).toHaveLength(1);
    const c4 = await listerComptes(dossierId, { classe: 6 });
    expect(c4[0].numero).toBe("601100");
  });
});

describe("archiverCompte", () => {
  it("archive sans supprimer", async () => {
    const c = await creerCompte({ dossierId, numeroSaisi: "521100", intitule: "Banque" });
    await archiverCompte(c.id);
    expect(await listerComptes(dossierId, {})).toHaveLength(0);
  });
});

describe("modifierCompte", () => {
  it("renomme librement", async () => {
    const c = await creerCompte({ dossierId, numeroSaisi: "411100", intitule: "Clients" });
    const u = await modifierCompte(c.id, { intitule: "Clients divers" });
    expect(u.intitule).toBe("Clients divers");
  });
});
