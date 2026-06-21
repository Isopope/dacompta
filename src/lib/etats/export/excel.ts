// src/lib/etats/export/excel.ts
import * as XLSX from "xlsx";
import type { DocId } from "./types";
import type { EtatsData } from "@/server/etats";

type Row = (string | number)[];

function sheetFromRows(rows: Row[], sheetName: string): Buffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

function entete(data: EtatsData, titre: string): Row[] {
  return [
    [titre],
    [`Dossier : ${data.dossier.nom}`, `Exercice : ${data.dossier.exercice}`, `Devise : ${data.dossier.devise}`],
    [],
  ];
}

function balanceRows(data: EtatsData): Row[] {
  const rows: Row[] = entete(data, "Balance générale");
  rows.push(["Compte", "Intitulé", "Solde N-1", "Débit", "Crédit", "Solde débiteur", "Solde créditeur"]);
  for (const l of data.balance.lignes) {
    rows.push([l.compteNumero, l.intitule, l.soldeNMoins1, l.debit, l.credit, l.soldeDebiteur, l.soldeCrediteur]);
  }
  const t = data.balance.totaux;
  rows.push(["TOTAL", "", "", t.debit, t.credit, t.soldeDebiteur, t.soldeCrediteur]);
  return rows;
}

function grandLivreRows(data: EtatsData): Row[] {
  const rows: Row[] = entete(data, "Grand livre");
  for (const c of data.grandLivre) {
    rows.push([`Compte ${c.compteNumero} — ${c.intitule}`]);
    rows.push(["Date", "Pièce", "Journal", "Libellé", "Débit", "Crédit", "Solde cumulé"]);
    for (const l of c.lignes) {
      rows.push([l.date.slice(0, 10), l.numeroPiece, l.journalCode, l.libelle, l.debit, l.credit, l.soldeApres]);
    }
    rows.push(["", "", "", "Totaux", c.totalDebit, c.totalCredit, c.solde]);
    rows.push([]);
  }
  return rows;
}

function bilanRows(data: EtatsData): Row[] {
  const rows: Row[] = entete(data, "Bilan");
  rows.push(["ACTIF", "", ""]);
  rows.push(["Compte", "Intitulé", "Montant N", "Montant N-1"]);
  for (const a of data.bilan.actif) rows.push([a.compteNumero, a.intitule, a.montant, a.montantNMoins1]);
  rows.push(["TOTAL ACTIF", "", data.bilan.totalActif]);
  rows.push([]);
  rows.push(["PASSIF", "", ""]);
  rows.push(["Compte", "Intitulé", "Montant N", "Montant N-1"]);
  for (const p of data.bilan.passif) rows.push([p.compteNumero, p.intitule, p.montant, p.montantNMoins1]);
  rows.push(["Résultat net de l'exercice", "", data.bilan.resultatNet]);
  rows.push(["TOTAL PASSIF", "", data.bilan.totalPassif]);
  rows.push(["Équilibre", data.bilan.equilibre ? "OK" : "DÉSÉQUILIBRE"]);
  return rows;
}

function compteResultatRows(data: EtatsData): Row[] {
  const cr = data.compteResultat;
  const rows: Row[] = entete(data, "Compte de résultat");
  rows.push(["PRODUITS", "", ""]);
  rows.push(["Compte", "Intitulé", "Montant N", "Montant N-1"]);
  for (const p of cr.produits) rows.push([p.compteNumero, p.intitule, p.montant, p.montantNMoins1]);
  rows.push(["TOTAL PRODUITS", "", cr.totalProduits, cr.totalProduitsNMoins1]);
  rows.push([]);
  rows.push(["CHARGES", "", ""]);
  rows.push(["Compte", "Intitulé", "Montant N", "Montant N-1"]);
  for (const c of cr.charges) rows.push([c.compteNumero, c.intitule, c.montant, c.montantNMoins1]);
  rows.push(["TOTAL CHARGES", "", cr.totalCharges, cr.totalChargesNMoins1]);
  rows.push(["RÉSULTAT NET", "", cr.resultatNet]);
  return rows;
}

function fluxRows(data: EtatsData): Row[] {
  const tft = data.fluxTresorerie;
  const rows: Row[] = entete(data, "Tableau des flux de trésorerie");
  rows.push(["Trésorerie d'ouverture", tft.tresorerieOuverture]);
  rows.push([]);
  const bloc = (titre: string, cat: { total: number; postes: { libelle: string; montant: number }[] }) => {
    rows.push([titre]);
    for (const p of cat.postes) rows.push([p.libelle, p.montant]);
    rows.push([`Total ${titre}`, cat.total]);
    rows.push([]);
  };
  bloc("Exploitation", tft.exploitation);
  bloc("Investissement", tft.investissement);
  bloc("Financement", tft.financement);
  rows.push(["Variation de trésorerie", tft.variationTresorerie]);
  rows.push(["Trésorerie de clôture", tft.tresorerieCloture]);
  return rows;
}

export function buildExcel(docId: DocId, data: EtatsData): Buffer {
  switch (docId) {
    case "balance-generale": return sheetFromRows(balanceRows(data), "Balance");
    case "grand-livre": return sheetFromRows(grandLivreRows(data), "Grand livre");
    case "bilan": return sheetFromRows(bilanRows(data), "Bilan");
    case "compte-resultat": return sheetFromRows(compteResultatRows(data), "Résultat");
    case "flux-tresorerie": return sheetFromRows(fluxRows(data), "Flux trésorerie");
  }
}
