import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { DocId } from "./types";
import type { EtatsData } from "@/server/etats";

const fmt = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const s = StyleSheet.create({
  page: { padding: 28, fontSize: 9, fontFamily: "Helvetica" },
  h1: { fontSize: 15, marginBottom: 4, fontFamily: "Helvetica-Bold" },
  meta: { fontSize: 9, color: "#555", marginBottom: 12 },
  h2: { fontSize: 11, marginTop: 10, marginBottom: 4, fontFamily: "Helvetica-Bold" },
  row: { flexDirection: "row", borderBottom: "1px solid #eee", paddingVertical: 2 },
  cell: { flex: 1, paddingRight: 4 },
  cellNum: { flex: 1, paddingRight: 4, textAlign: "right" },
  total: { fontFamily: "Helvetica-Bold" },
});

function Entete({ data, titre }: { data: EtatsData; titre: string }) {
  return (
    <View>
      <Text style={s.h1}>{titre}</Text>
      <Text style={s.meta}>
        {data.dossier.nom} · Exercice {data.dossier.exercice} · {data.dossier.devise}
      </Text>
    </View>
  );
}

function Ligne({ cells, total }: { cells: (string | number)[]; total?: boolean }) {
  return (
    <View style={s.row}>
      {cells.map((c, i) => (
        <Text key={i} style={[i === 0 ? s.cell : s.cellNum, ...(total ? [s.total] : [])]}>
          {typeof c === "number" ? fmt(c) : c}
        </Text>
      ))}
    </View>
  );
}

function corps(docId: DocId, data: EtatsData) {
  switch (docId) {
    case "balance-generale":
      return (
        <View>
          <Ligne cells={["Compte / Intitulé", "Débit", "Crédit", "Solde Db", "Solde Cr"]} total />
          {data.balance.lignes.map((l) => (
            <Ligne key={l.compteNumero} cells={[`${l.compteNumero} ${l.intitule}`, l.debit, l.credit, l.soldeDebiteur, l.soldeCrediteur]} />
          ))}
          <Ligne cells={["TOTAL", data.balance.totaux.debit, data.balance.totaux.credit, data.balance.totaux.soldeDebiteur, data.balance.totaux.soldeCrediteur]} total />
        </View>
      );
    case "grand-livre":
      return (
        <View>
          {data.grandLivre.map((c) => (
            <View key={c.compteNumero} wrap={false}>
              <Text style={s.h2}>{c.compteNumero} — {c.intitule}</Text>
              <Ligne cells={["Date / Pièce / Libellé", "Débit", "Crédit", "Solde"]} total />
              {c.lignes.map((l, i) => (
                <Ligne key={i} cells={[`${l.date.slice(0, 10)} ${l.numeroPiece} ${l.libelle}`, l.debit, l.credit, l.soldeApres]} />
              ))}
            </View>
          ))}
        </View>
      );
    case "bilan":
      return (
        <View>
          <Text style={s.h2}>ACTIF</Text>
          {data.bilan.actif.map((a) => <Ligne key={a.compteNumero} cells={[`${a.compteNumero} ${a.intitule}`, a.montant]} />)}
          <Ligne cells={["TOTAL ACTIF", data.bilan.totalActif]} total />
          <Text style={s.h2}>PASSIF</Text>
          {data.bilan.passif.map((p) => <Ligne key={p.compteNumero} cells={[`${p.compteNumero} ${p.intitule}`, p.montant]} />)}
          <Ligne cells={["Résultat net", data.bilan.resultatNet]} />
          <Ligne cells={["TOTAL PASSIF", data.bilan.totalPassif]} total />
        </View>
      );
    case "compte-resultat":
      return (
        <View>
          <Text style={s.h2}>PRODUITS</Text>
          {data.compteResultat.produits.map((p) => <Ligne key={p.compteNumero} cells={[`${p.compteNumero} ${p.intitule}`, p.montant]} />)}
          <Ligne cells={["TOTAL PRODUITS", data.compteResultat.totalProduits]} total />
          <Text style={s.h2}>CHARGES</Text>
          {data.compteResultat.charges.map((c) => <Ligne key={c.compteNumero} cells={[`${c.compteNumero} ${c.intitule}`, c.montant]} />)}
          <Ligne cells={["TOTAL CHARGES", data.compteResultat.totalCharges]} total />
          <Ligne cells={["RÉSULTAT NET", data.compteResultat.resultatNet]} total />
        </View>
      );
    case "flux-tresorerie": {
      const tft = data.fluxTresorerie;
      const bloc = (titre: string, cat: { total: number; postes: { libelle: string; montant: number }[] }) => (
        <View>
          <Text style={s.h2}>{titre}</Text>
          {cat.postes.map((p, i) => <Ligne key={i} cells={[p.libelle, p.montant]} />)}
          <Ligne cells={[`Total ${titre}`, cat.total]} total />
        </View>
      );
      return (
        <View>
          <Ligne cells={["Trésorerie d'ouverture", tft.tresorerieOuverture]} />
          {bloc("Exploitation", tft.exploitation)}
          {bloc("Investissement", tft.investissement)}
          {bloc("Financement", tft.financement)}
          <Ligne cells={["Variation de trésorerie", tft.variationTresorerie]} total />
          <Ligne cells={["Trésorerie de clôture", tft.tresorerieCloture]} total />
        </View>
      );
    }
  }
}

const TITRES: Record<DocId, string> = {
  "balance-generale": "Balance générale",
  "grand-livre": "Grand livre",
  bilan: "Bilan",
  "compte-resultat": "Compte de résultat",
  "flux-tresorerie": "Tableau des flux de trésorerie",
};

export function buildPdf(docId: DocId, data: EtatsData): Promise<Buffer> {
  return renderToBuffer(
    <Document>
      <Page size="A4" style={s.page}>
        <Entete data={data} titre={TITRES[docId]} />
        {corps(docId, data)}
      </Page>
    </Document>
  );
}
