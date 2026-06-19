import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb } from "./test-helpers";
import { creerPiece, annulerPiece } from "./pieces";
import { getGrandLivre, getBalance } from "./balance";

let dossierId: string;
let achId: string;
let banId: string;

async function seedComptes() {
  const comptes = [
    { numero: "601000", intitule: "Achats marchandises", classeNum: 6 },
    { numero: "701000", intitule: "Ventes marchandises", classeNum: 7 },
    { numero: "401000", intitule: "Fournisseurs", classeNum: 4 },
    { numero: "411000", intitule: "Clients", classeNum: 4 },
    { numero: "521000", intitule: "Banque", classeNum: 5 },
    { numero: "101000", intitule: "Capital", classeNum: 1 },
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
  const ban = await prisma.journal.create({ data: { code: "BIMA", libelle: "Banque", dossierId } });
  achId = ach.id;
  banId = ban.id;

  // Deux achats puis un règlement fournisseur partiel.
  await creerPiece({
    dossierId, journalId: achId, numeroPiece: "ACH-001", datePiece: new Date("2020-01-05"),
    lignes: [
      { compteNumero: "601000", libelleLigne: "Achat janvier", debit: 1000, credit: 0 },
      { compteNumero: "401000", libelleLigne: "Fournisseur", debit: 0, credit: 1000 },
    ],
  });
  await creerPiece({
    dossierId, journalId: achId, numeroPiece: "ACH-002", datePiece: new Date("2020-01-10"),
    lignes: [
      { compteNumero: "601000", libelleLigne: "Achat février", debit: 500, credit: 0 },
      { compteNumero: "401000", libelleLigne: "Fournisseur", debit: 0, credit: 500 },
    ],
  });
  await creerPiece({
    dossierId, journalId: banId, numeroPiece: "BIMA-001", datePiece: new Date("2020-01-20"),
    lignes: [
      { compteNumero: "401000", libelleLigne: "Règlement fournisseur", debit: 600, credit: 0 },
      { compteNumero: "521000", libelleLigne: "Sortie banque", debit: 0, credit: 600 },
    ],
  });
});

describe("getGrandLivre", () => {
  it("regroupe les mouvements par compte avec solde cumulé et tri par date", async () => {
    const gl = await getGrandLivre(dossierId);
    const compte601 = gl.find((c) => c.compteNumero === "601000")!;
    expect(compte601.intitule).toBe("Achats marchandises");
    expect(compte601.lignes).toHaveLength(2);
    expect(compte601.lignes[0].numeroPiece).toBe("ACH-001");
    expect(compte601.lignes[0].soldeApres).toBe(1000);
    expect(compte601.lignes[1].soldeApres).toBe(1500); // cumul 1000 + 500
    expect(compte601.totalDebit).toBe(1500);
    expect(compte601.solde).toBe(1500);
  });

  it("calcule le solde cumulé d'un compte qui se débite puis se crédite", async () => {
    const gl = await getGrandLivre(dossierId);
    const compte401 = gl.find((c) => c.compteNumero === "401000")!;
    // crédit 1000, crédit 500, débit 600 (règlement) → solde créditeur 900
    expect(compte401.lignes.map((l) => l.soldeApres)).toEqual([-1000, -1500, -900]);
    expect(compte401.solde).toBe(-900);
    expect(compte401.lignes[2].journalCode).toBe("BIMA"); // le règlement vient du journal de banque
  });

  it("trie les comptes par numéro", async () => {
    const gl = await getGrandLivre(dossierId);
    const numeros = gl.map((c) => c.compteNumero);
    expect(numeros).toEqual([...numeros].sort());
  });

  it("filtre par préfixe de compte", async () => {
    const gl = await getGrandLivre(dossierId, { compteNumero: "4" });
    expect(gl.every((c) => c.compteNumero.startsWith("4"))).toBe(true);
    expect(gl.find((c) => c.compteNumero === "401000")).toBeDefined();
    expect(gl.find((c) => c.compteNumero === "601000")).toBeUndefined();
  });

  it("ignore les pièces annulées", async () => {
    const p = await creerPiece({
      dossierId, journalId: achId, numeroPiece: "ACH-099", datePiece: new Date("2020-01-25"),
      lignes: [
        { compteNumero: "601000", libelleLigne: "Achat erroné", debit: 9999, credit: 0 },
        { compteNumero: "401000", libelleLigne: "Fournisseur", debit: 0, credit: 9999 },
      ],
    });
    await annulerPiece(p.id);
    const gl = await getGrandLivre(dossierId);
    const compte601 = gl.find((c) => c.compteNumero === "601000")!;
    expect(compte601.totalDebit).toBe(1500); // inchangé
  });
});

describe("getBalance", () => {
  it("calcule ouverture, mouvements et soldes débiteur/créditeur par compte", async () => {
    const { lignes } = await getBalance(dossierId);
    const b601 = lignes.find((l) => l.compteNumero === "601000")!;
    expect(b601.ouverture).toBe(0);
    expect(b601.debit).toBe(1500);
    expect(b601.credit).toBe(0);
    expect(b601.soldeDebiteur).toBe(1500);
    expect(b601.soldeCrediteur).toBe(0);

    const b401 = lignes.find((l) => l.compteNumero === "401000")!;
    expect(b401.debit).toBe(600);
    expect(b401.credit).toBe(1500);
    expect(b401.soldeDebiteur).toBe(0);
    expect(b401.soldeCrediteur).toBe(900);
  });

  it("trie par classe puis numéro", async () => {
    const { lignes } = await getBalance(dossierId);
    const cles = lignes.map((l) => [l.classeNum, l.compteNumero] as const);
    const triees = [...cles].sort((a, b) => (a[0] !== b[0] ? a[0] - b[0] : a[1].localeCompare(b[1])));
    expect(cles).toEqual(triees);
  });

  it("les totaux généraux s'équilibrent (débit = crédit, soldeD = soldeC)", async () => {
    const { totaux } = await getBalance(dossierId);
    expect(totaux.debit).toBe(totaux.credit);
    expect(totaux.soldeDebiteur).toBe(totaux.soldeCrediteur);
  });
});

describe("getBalance — ouverture (RAN) et N-1", () => {
  it("extrait l'ouverture des lignes du journal RAN (solde N-1) et l'exclut des mouvements", async () => {
    // Écriture d'ouverture : capital 50M (C), banque 12M (D).
    const ran = await prisma.journal.create({
      data: { code: "RAN", libelle: "Report à nouveau", dossierId },
    });
    await creerPiece({
      dossierId, journalId: ran.id, numeroPiece: "RAN-2020", datePiece: new Date("2020-01-01"),
      lignes: [
        { compteNumero: "521000", libelleLigne: "Banque (ouverture)", debit: 12_000_000, credit: 0 },
        { compteNumero: "101000", libelleLigne: "Capital (ouverture)", debit: 0, credit: 12_000_000 },
      ],
    });
    // Un mouvement d'exercice supplémentaire sur la banque : encaissement 3M.
    await creerPiece({
      dossierId, journalId: banId, numeroPiece: "BIMA-002", datePiece: new Date("2020-02-01"),
      lignes: [
        { compteNumero: "521000", libelleLigne: "Encaissement", debit: 3_000_000, credit: 0 },
        { compteNumero: "411000", libelleLigne: "Client", debit: 0, credit: 3_000_000 },
      ],
    });

    const { lignes } = await getBalance(dossierId);

    const banque = lignes.find((l) => l.compteNumero === "521000")!;
    // Ouverture (RAN) = +12M débiteur ; soldeNMoins1 reflète l'ouverture.
    expect(banque.ouverture).toBe(12_000_000);
    expect(banque.soldeNMoins1).toBe(12_000_000);
    // Les mouvements de l'exercice excluent le RAN : seul l'encaissement 3M y figure
    // (moins le règlement fournisseur 600 sorti dans le beforeEach ne touche pas 521000).
    expect(banque.debit).toBe(3_000_000);
    // Solde N = ouverture 12M + mouvements (débit 3M − crédit 600 du beforeEach) = 14 399 400.
    expect(banque.soldeDebiteur).toBe(12_000_000 + 3_000_000 - 600);

    const capital = lignes.find((l) => l.compteNumero === "101000")!;
    // Ouverture créditrice → ouverture négative (débit − crédit).
    expect(capital.ouverture).toBe(-12_000_000);
    expect(capital.soldeNMoins1).toBe(-12_000_000);
    expect(capital.soldeCrediteur).toBe(12_000_000);
  });

  it("ouverture = 0 pour les comptes sans ligne RAN", async () => {
    const { lignes } = await getBalance(dossierId);
    const ach = lignes.find((l) => l.compteNumero === "601000")!;
    expect(ach.ouverture).toBe(0);
    expect(ach.soldeNMoins1).toBe(0);
  });
});

describe("getBalance — snapshot N-1 (SoldeAnterieur)", () => {
  it("le snapshot prime sur l'ouverture pour soldeNMoins1 (comptes de gestion)", async () => {
    // 601000 a des mouvements N (beforeEach) mais aucun RAN → ouverture 0.
    await prisma.soldeAnterieur.create({
      data: { dossierId, compteNumero: "601000", montant: 7_800_000 },
    });
    const { lignes } = await getBalance(dossierId);
    const ach = lignes.find((l) => l.compteNumero === "601000")!;
    expect(ach.ouverture).toBe(0);
    expect(ach.soldeNMoins1).toBe(7_800_000); // snapshot, pas l'ouverture
    expect(ach.soldeDebiteur).toBe(1500); // solde N inchangé
  });

  it("fait apparaître un compte qui n'a qu'un snapshot N-1 (aucun mouvement N)", async () => {
    await prisma.soldeAnterieur.create({
      data: { dossierId, compteNumero: "706000", montant: -40_000_000 },
    });
    const { lignes } = await getBalance(dossierId);
    const rec = lignes.find((l) => l.compteNumero === "706000")!;
    expect(rec).toBeDefined();
    expect(rec.soldeNMoins1).toBe(-40_000_000);
    expect(rec.debit).toBe(0);
    expect(rec.credit).toBe(0);
    expect(rec.soldeDebiteur).toBe(0);
    expect(rec.soldeCrediteur).toBe(0);
  });
});
