import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb, seedComptesStandards } from "./test-helpers";
import { creerCompte } from "./comptes";
import { creerTiers } from "./tiers";
import { creerTaxe, creerFacture } from "./taxes";
import { validerPiece } from "./pieces";
import { enregistrerPaiement, getEtatPaiementFacture } from "./paiements";

let dossierId: string;
let journalVente: string;
let journalCaisse: string;

async function factureClient(numero: string, montantHT: number) {
  await creerTaxe({ dossierId, code: "TVA18", nom: "TVA 18%", taux: 18, usage: "sale", compteNumero: "443100" }).catch(() => {});
  const client = await prisma.tiers.findFirstOrThrow({ where: { dossierId, code: "C001" } });
  const f = await creerFacture({
    dossierId, journalId: journalVente, numeroPiece: numero, sens: "VENTE",
    tiersId: client.id, compteTiersNumero: "411100",
    lignes: [{ compteNumero: "707000", libelleLigne: "Vente", montantHT, taxeCode: "TVA18" }],
  });
  await validerPiece(f.id);
  return { facture: f, clientId: client.id };
}

beforeEach(async () => {
  dossierId = await resetDb();
  await seedComptesStandards(dossierId);
  await creerCompte({ dossierId, numeroSaisi: "411100", intitule: "Clients", collectif: true });
  await creerTiers({ dossierId, code: "C001", nom: "Alpha", type: "CLIENT" });
  journalVente = (await prisma.journal.create({ data: { code: "VT", libelle: "Ventes", dossierId } })).id;
  journalCaisse = (await prisma.journal.create({ data: { code: "CAI", libelle: "Caisse", dossierId } })).id;
});

describe("enregistrerPaiement — encaissement client (ENTRANT)", () => {
  it("génère une pièce de trésorerie équilibrée et lettre la facture (soldée)", async () => {
    const { facture, clientId } = await factureClient("VT-1", 100_000); // TTC 118 000

    const { paiement, piece } = await enregistrerPaiement({
      dossierId, journalId: journalCaisse, numeroPiece: "CAI-1", sens: "ENTRANT",
      tiersId: clientId, compteTresorerieNumero: "521000", compteTiersNumero: "411100",
      montant: 118_000,
    });

    // Pièce de paiement : débit 521 118 000, crédit 411 118 000.
    const lignes = await prisma.ligneEcriture.findMany({ where: { pieceId: piece.id } });
    expect(Number(lignes.find((l) => l.compteNumero === "521000")!.debit)).toBe(118_000);
    expect(Number(lignes.find((l) => l.compteNumero === "411100")!.credit)).toBe(118_000);
    expect(paiement.pieceId).toBe(piece.id);

    // La facture est soldée (résiduel de la ligne 411 à 0).
    const etat = await getEtatPaiementFacture(dossierId, facture.id);
    expect(etat).toBe("PAYE");
  });

  it("paiement partiel → facture PARTIEL", async () => {
    const { facture, clientId } = await factureClient("VT-2", 100_000); // TTC 118 000

    await enregistrerPaiement({
      dossierId, journalId: journalCaisse, numeroPiece: "CAI-2", sens: "ENTRANT",
      tiersId: clientId, compteTresorerieNumero: "521000", compteTiersNumero: "411100",
      montant: 50_000,
    });

    expect(await getEtatPaiementFacture(dossierId, facture.id)).toBe("PARTIEL");
  });

  it("facture sans paiement → NON_PAYE", async () => {
    const { facture } = await factureClient("VT-3", 100_000);
    expect(await getEtatPaiementFacture(dossierId, facture.id)).toBe("NON_PAYE");
  });
});
