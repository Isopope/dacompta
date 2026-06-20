import { describe, it, expect, beforeEach } from "vitest";
import { resetDb } from "./test-helpers";
import { listerDossiers } from "./dossiers";

beforeEach(async () => { await resetDb(); });

it("liste les dossiers (au moins celui de test)", async () => {
  const ds = await listerDossiers();
  expect(ds.length).toBeGreaterThanOrEqual(1);
  expect(ds[0]).toHaveProperty("nom");
});
