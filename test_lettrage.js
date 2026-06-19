const { prisma } = require("./src/lib/db");
const { creerPiece } = require("./src/server/pieces");
const { createLettrage, getOpenLines, deleteLettrage } = require("./src/server/lettrage");
const { getBalance } = require("./src/server/balance");

async function test() {
  // Reset DB
  await prisma.$executeRaw`DELETE FROM LigneEcriture;
  DELETE FROM Piece;
  DELETE FROM Journal;
  DELETE FROM Dossier;
  DELETE FROM Compte;
  DELETE FROM SoldeAnterieur;
  DELETE FROM ImportLog;
  DELETE FROM Lettrage;
  DELETE FROM RegleLettrage;`;
  // Recreate default dossier via seed? We'll just create a minimal dossier and journal.
  const dossier = await prisma.dossier.create({
    data: { nom: "Test", ville: "Test", pays: "Test", devise: "XOF", exercice: 2020 },
  });
  const journal = await prisma.journal.create({
    data: { code: "OD", libelle: "Opérations diverses", dossierId: dossier.id },
  });
  // Create comptes
  await prisma.compte.createMany({
    data: [
      { numero: "411000", intitule: "Clients", type: "DETAIL", classeNum: 4, reportNplus1: true, dossierId: dossier.id },
      { numero: "521000", intitule: "Banque", type: "DETAIL", classeNum: 5, reportNplus1: true, dossierId: dossier.id },
      { numero: "707000", intitule: "Ventes", type: "DETAIL", classeNum: 7, reportNplus1: false, dossierId: dossier.id },
    ],
  });
  // Create a facture client: débit 411000 100000, crédit 707000 100000
  const facture = await creerPiece({
    dossierId: dossier.id,
    journalId: journal.id,
    numeroPiece: "F-001",
    datePiece: new Date("2020-01-15"),
    lignes: [
      { compteNumero: "411000", debit: 100000, credit: 0, libelleLigne: "411000" },
      { compteNumero: "707000", debit: 0, credit: 100000, libelleLigne: "707000" },
    ],
  });
  // Create a paiement reçu: débit 521000 95000, crédit 411000 95000
  const paiement = await creerPiece({
    dossierId: dossier.id,
    journalId: journal.id,
    numeroPiece: "P-001",
    datePiece: new Date("2020-01-20"),
    lignes: [
      { compteNumero: "521000", debit: 95000, credit: 0, libelleLigne: "521000" },
      { compteNumero: "411000", debit: 0, credit: 95000, libelleLigne: "411000" },
    ],
  });
  console.log("Facture piece:", facture.id);
  console.log("Paiement piece:", paiement.id);
  // Get lines
  const lignes = await prisma.ligneEcriture.findMany({
    where: { pieceId: { in: [facture.id, paiement.id] } },
    include: { piece: { select: { id: true, numeroPiece: true, datePiece: true } } },
  });
  console.log("Lignes:", lignes.map(l => ({ id: l.id, pieceId: l.pieceId, compteNumero: l.compteNumero, debit: l.debit.toNumber(), credit: l.credit.toNumber(), amountResidual: l.amountResidual.toNumber() })));
  // Lettrer: ligne débit 411000 (from facture) with ligne crédit 411000 (from paiement)
  const ligneDebitFacture = lignes.find(l => l.compteNumero === "411000" && l.debit.gte(l.credit) && l.pieceId === facture.id);
  const ligneCreditPaiement = lignes.find(l => l.compteNumero === "411000" && l.credit.gte(l.debit) && l.pieceId === paiement.id);
  if (!ligneDebitFacture || !ligneCreditPaiement) {
    throw new Error("Could not find appropriate lines");
  }
  const lettrage = await createLettrage(dossier.id, ligneDebitFacture.id, ligneCreditPaiement.id, 95000);
  console.log("Lettrage créé:", lettrage);
  // Check updated lignes
  const lignesAfter = await prisma.ligneEcriture.findMany({
    where: { pieceId: { in: [facture.id, paiement.id] } },
    include: { piece: { select: { id: true, numeroPiece: true, datePiece: true } } },
  });
  console.log("Lignes après lettrage:", lignesAfter.map(l => ({ id: l.id, pieceId: l.pieceId, compteNumero: l.compteNumero, debit: l.debit.toNumber(), credit: l.credit.toNumber(), amountResidual: l.amountResidual.toNumber(), isLettres: l.isLettres })));
  // Check balance
  const balance = await getBalance(dossier.id);
  const compte411 = balance.lignes.find(l => l.compteNumero === "411000");
  console.log("Compte 411000 balance:", compte411);
  // Expected: montant = 5000 (100000 - 95000) débiteur
  if (compte411 && compte411.soldeDebiteur === 5000 && compte411.soldeCrediteur === 0) {
    console.log("✅ Test passed: compte 411000 solde débiteur 5000");
  } else {
    console.log("❌ Test failed: unexpected balance", compte411);
  }
  // Clean up
  await deleteLettrage(lettrage.id);
  console.log("Lettrage supprimé");
  const lignesAfterDelete = await prisma.ligneEcriture.findMany({
    where: { pieceId: { in: [facture.id, paiement.id] } },
    include: { piece: { select: { id: true, numeroPiece: true, datePiece: true } } },
  });
  console.log("Lignes après suppression lettrage:", lignesAfterDelete.map(l => ({ id: l.id, pieceId: l.pieceId, compteNumero: l.compteNumero, debit: l.debit.toNumber(), credit: l.credit.toNumber(), amountResidual: l.amountResidual.toNumber(), isLettres: l.isLettres })));
  await prisma.$disconnect();
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});