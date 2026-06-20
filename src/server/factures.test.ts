import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb, seedComptesStandards } from "./test-helpers";
import { creerCompte } from "./comptes";
import { creerTiers } from "./tiers";
import { creerTaxe, creerFacture } from "./taxes";
import { validerPiece } from "./pieces";
import { listerFactures } from "./factures";

let dossierId: string; let journalVente: string;
beforeEach(async () => {
  dossierId = await resetDb();
  await seedComptesStandards(dossierId);
  await creerCompte({ dossierId, numeroSaisi: "411100", intitule: "Clients", collectif: true });
  await creerTaxe({ dossierId, code: "TVA18", nom: "TVA 18%", taux: 18, usage: "sale", compteNumero: "443100" });
  journalVente = (await prisma.journal.create({ data: { code: "VT", libelle: "Ventes", type: "sale", dossierId } })).id;
});

it("liste les factures du journal de vente avec tiers, TTC et état de paiement", async () => {
  const client = await creerTiers({ dossierId, code: "C001", nom: "Alpha", type: "CLIENT" });
  const f = await creerFacture({
    dossierId, journalId: journalVente, numeroPiece: "VT-1", sens: "VENTE",
    tiersId: client.id, compteTiersNumero: "411100",
    lignes: [{ compteNumero: "707000", libelleLigne: "Vente", montantHT: 100_000, taxeCode: "TVA18" }],
  });
  await validerPiece(f.id);

  const liste = await listerFactures(dossierId);
  expect(liste).toHaveLength(1);
  expect(liste[0].tiersNom).toBe("Alpha");
  expect(liste[0].montantTTC).toBe(118_000);
  expect(liste[0].etatPaiement).toBe("NON_PAYE");
});

it("filtre par statut et par texte (numéro/tiers)", async () => {
  const client = await creerTiers({ dossierId, code: "C001", nom: "Alpha", type: "CLIENT" });
  const f = await creerFacture({
    dossierId, journalId: journalVente, numeroPiece: "VT-2", sens: "VENTE",
    tiersId: client.id, compteTiersNumero: "411100",
    lignes: [{ compteNumero: "707000", libelleLigne: "Vente", montantHT: 50_000, taxeCode: "TVA18" }],
  });
  await validerPiece(f.id);
  expect(await listerFactures(dossierId, { statut: "VALIDEE" })).toHaveLength(1);
  expect(await listerFactures(dossierId, { statut: "BROUILLON" })).toHaveLength(0);
  expect(await listerFactures(dossierId, { texte: "alpha" })).toHaveLength(1);
  expect(await listerFactures(dossierId, { texte: "zzz" })).toHaveLength(0);
});
