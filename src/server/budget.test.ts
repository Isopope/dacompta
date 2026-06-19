import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb } from "./test-helpers";
import { creerPiece, annulerPiece } from "./pieces";
import { listerPostes, creerPoste, modifierPoste, supprimerPoste } from "./budget";

let dossierId: string;
let achId: string;
let vtId: string;

async function seedComptes() {
  const comptes = [
    { numero: "601000", intitule: "Achats marchandises", classeNum: 6 },
    { numero: "605300", intitule: "Achat carburant", classeNum: 6 },
    { numero: "706100", intitule: "Recette transport", classeNum: 7 },
    { numero: "401000", intitule: "Fournisseurs", classeNum: 4 },
    { numero: "411000", intitule: "Clients", classeNum: 4 },
  ];
  for (const c of comptes) {
    await prisma.compte.create({
      data: { ...c, type: "DETAIL", reportNplus1: false, dossierId },
    });
  }
}

beforeEach(async () => {
  dossierId = await resetDb();
  await seedComptes();
  const ach = await prisma.journal.create({ data: { code: "ACH", libelle: "Achats", dossierId } });
  const vt = await prisma.journal.create({ data: { code: "VT", libelle: "Ventes", dossierId } });
  achId = ach.id;
  vtId = vt.id;

  // Une charge carburant (compte 605...) de 2000 au débit.
  await creerPiece({
    dossierId, journalId: achId, numeroPiece: "ACH-001", datePiece: new Date("2020-01-05"),
    lignes: [
      { compteNumero: "605300", libelleLigne: "Carburant", debit: 2000, credit: 0 },
      { compteNumero: "401000", libelleLigne: "Fournisseur", debit: 0, credit: 2000 },
    ],
  });
  // Un produit transport (compte 706...) de 5000 au crédit.
  await creerPiece({
    dossierId, journalId: vtId, numeroPiece: "VT-001", datePiece: new Date("2020-01-10"),
    lignes: [
      { compteNumero: "411000", libelleLigne: "Client", debit: 5000, credit: 0 },
      { compteNumero: "706100", libelleLigne: "Transport", debit: 0, credit: 5000 },
    ],
  });
});

describe("listerPostes — réalisé depuis les écritures", () => {
  it("calcule le réalisé d'une charge depuis les débits des comptes du préfixe", async () => {
    await creerPoste({ dossierId, code: "605300", libelle: "Carburant", sens: "C", prevision: 16000, compteLie: "605" });
    const postes = await listerPostes(dossierId);
    const carburant = postes.find((p) => p.compteLie === "605")!;
    expect(carburant.realise).toBe(2000);
    expect(carburant.prevision).toBe(16000);
    expect(carburant.pourcentage).toBeCloseTo((2000 / 16000) * 100, 5);
  });

  it("calcule le réalisé d'un produit depuis les crédits des comptes du préfixe", async () => {
    await creerPoste({ dossierId, code: "706100", libelle: "Transport", sens: "P", prevision: 60000, compteLie: "706" });
    const postes = await listerPostes(dossierId);
    const transport = postes.find((p) => p.compteLie === "706")!;
    expect(transport.realise).toBe(5000);
    expect(transport.pourcentage).toBeCloseTo((5000 / 60000) * 100, 5);
  });

  it("ignore les pièces annulées", async () => {
    const p = await creerPiece({
      dossierId, journalId: achId, numeroPiece: "ACH-099", datePiece: new Date("2020-01-25"),
      lignes: [
        { compteNumero: "605300", libelleLigne: "Carburant erroné", debit: 9999, credit: 0 },
        { compteNumero: "401000", libelleLigne: "Fournisseur", debit: 0, credit: 9999 },
      ],
    });
    await annulerPiece(p.id);
    await creerPoste({ dossierId, code: "605300", libelle: "Carburant", sens: "C", prevision: 16000, compteLie: "605" });
    const postes = await listerPostes(dossierId);
    const carburant = postes.find((p) => p.compteLie === "605")!;
    expect(carburant.realise).toBe(2000); // inchangé
  });

  it("pourcentage = 0 quand la prévision est nulle", async () => {
    await creerPoste({ dossierId, code: "999000", libelle: "Sans prévision", sens: "C", prevision: 0, compteLie: "999" });
    const postes = await listerPostes(dossierId);
    const poste = postes.find((p) => p.compteLie === "999")!;
    expect(poste.realise).toBe(0);
    expect(poste.pourcentage).toBe(0);
  });
});

describe("listerPostes — correspondance exacte vs préfixe", () => {
  // On ajoute un second compte 605 (eau) avec une écriture, à côté du carburant
  // (605300) déjà saisi dans le beforeEach, pour distinguer les deux logiques.
  beforeEach(async () => {
    await prisma.compte.create({
      data: { numero: "605100", intitule: "Eau", classeNum: 6, type: "DETAIL", reportNplus1: false, dossierId },
    });
    await creerPiece({
      dossierId, journalId: achId, numeroPiece: "ACH-EAU", datePiece: new Date("2020-01-15"),
      lignes: [
        { compteNumero: "605100", libelleLigne: "Eau", debit: 700, credit: 0 },
        { compteNumero: "401000", libelleLigne: "Fournisseur", debit: 0, credit: 700 },
      ],
    });
  });

  it("compteLie exact (605300) n'agrège que ce compte, pas les autres 605x", async () => {
    await creerPoste({ dossierId, code: "605300", libelle: "Carburant", sens: "C", prevision: 16000, compteLie: "605300" });
    const postes = await listerPostes(dossierId);
    const carburant = postes.find((p) => p.compteLie === "605300")!;
    expect(carburant.realise).toBe(2000); // 605300 seul, hors 605100 (eau)
  });

  it("compteLie exact (605100) n'agrège que l'eau, pas le carburant", async () => {
    await creerPoste({ dossierId, code: "605100", libelle: "Eau", sens: "C", prevision: 5000, compteLie: "605100" });
    const postes = await listerPostes(dossierId);
    const eau = postes.find((p) => p.compteLie === "605100")!;
    expect(eau.realise).toBe(700); // 605100 seul
  });

  it("compteLie préfixe (605) agrège tous les comptes 605x (fallback)", async () => {
    await creerPoste({ dossierId, code: "605", libelle: "Services 605", sens: "C", prevision: 30000, compteLie: "605" });
    const postes = await listerPostes(dossierId);
    const tous = postes.find((p) => p.compteLie === "605")!;
    expect(tous.realise).toBe(2700); // 605300 (2000) + 605100 (700)
  });

  it("compteLie exact sans écriture → réalisé 0 (pas de fallback préfixe)", async () => {
    await creerPoste({ dossierId, code: "607500", libelle: "Fourniture bureau", sens: "C", prevision: 4000, compteLie: "607500" });
    const postes = await listerPostes(dossierId);
    const fourniture = postes.find((p) => p.compteLie === "607500")!;
    expect(fourniture.realise).toBe(0); // 607500 absent ET aucun 607xxx
  });
});

describe("creerPoste / modifierPoste / supprimerPoste", () => {
  it("crée puis modifie un poste", async () => {
    const cree = await creerPoste({ dossierId, code: "601100", libelle: "Achats", sens: "C", prevision: 9500, compteLie: "601" });
    expect(cree.id).toBeTruthy();
    await modifierPoste(cree.id, { prevision: 12000, libelle: "Achats marchandises" });
    const postes = await listerPostes(dossierId);
    const poste = postes.find((p) => p.id === cree.id)!;
    expect(poste.prevision).toBe(12000);
    expect(poste.libelle).toBe("Achats marchandises");
  });

  it("supprime un poste", async () => {
    const cree = await creerPoste({ dossierId, code: "601100", libelle: "Achats", sens: "C", prevision: 9500, compteLie: "601" });
    await supprimerPoste(cree.id);
    const postes = await listerPostes(dossierId);
    expect(postes.find((p) => p.id === cree.id)).toBeUndefined();
  });
});
