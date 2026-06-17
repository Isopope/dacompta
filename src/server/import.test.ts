import { describe, it, expect, beforeEach } from "vitest";
import { resetDb } from "./test-helpers";
import { previsualiserImport, appliquerImport, annulerImport } from "./import";
import { creerCompte, listerComptes } from "./comptes";

let dossierId: string;
beforeEach(async () => { dossierId = await resetDb(); });

const CSV = [
  "note;numero;intitule;type",
  "x;401100;Fournisseurs;D",
  "y;411100;Clients;D",
  "z;001000;Compte interne;D",
].join("\n");

describe("previsualiserImport", () => {
  it("mappe les colonnes par contenu et applique les contrôles", async () => {
    const { lignes } = await previsualiserImport(dossierId, "plan.csv", CSV);
    expect(lignes.find((l) => l.numero === "401100")!.controle).toBe("ok");
    expect(lignes.find((l) => l.numero === "001000")!.controle).toBe("hors-syscohada");
  });
  it("signale les doublons vis-à-vis de l'existant", async () => {
    await creerCompte({ dossierId, numeroSaisi: "401100", intitule: "Fournisseurs" });
    const { lignes } = await previsualiserImport(dossierId, "plan.csv", CSV);
    expect(lignes.find((l) => l.numero === "401100")!.controle).toBe("doublon");
  });
});

describe("appliquerImport / annulerImport", () => {
  it("AJOUTER ignore les hors-cadre et crée les comptes valides", async () => {
    const { lignes } = await previsualiserImport(dossierId, "plan.csv", CSV);
    const res = await appliquerImport(dossierId, "plan.csv", lignes, "AJOUTER");
    expect(await listerComptes(dossierId, {})).toHaveLength(2); // 401100 + 411100, pas 001000
    const annule = await annulerImport(res.importLogId);
    expect(annule).toBe(true);
    expect(await listerComptes(dossierId, {})).toHaveLength(0);
  });
});
