# Export des états comptables (PDF / Excel) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre le téléchargement de chaque état comptable (balance générale, grand livre, bilan, compte de résultat, flux de trésorerie) en PDF et en Excel depuis la page `/etats`.

**Architecture:** Génération côté serveur via un Route Handler Next.js (`/etats/export`). Le handler réutilise les fonctions de dérivation existantes (source de vérité unique avec l'aperçu), regroupées dans un nouveau `getEtatsData(dossierId)`, puis délègue à des builders Excel (`xlsx`) et PDF (`@react-pdf/renderer`).

**Tech Stack:** TypeScript, Next.js 16 (App Router, Route Handlers), React 19, Prisma, `xlsx` (SheetJS, déjà installé), `@react-pdf/renderer` (à ajouter), Vitest.

## Global Constraints

- Runner de test : `vitest run` ; fichiers `*.test.ts` à côté du code testé.
- Devise du dossier : **XOF** (libellé devise lu depuis `dossier.devise`).
- 5 documents exportables uniquement (ceux marqués `pret: true`) : `balance-generale`, `grand-livre`, `bilan`, `compte-resultat`, `flux-tresorerie`.
- 2 formats : `pdf`, `xlsx`.
- Source de vérité unique : aucun recalcul d'état ne doit être dupliqué ; tout passe par `getEtatsData`.
- Pas de scellement légal / pas d'archivage immuable (hors périmètre).
- Import Prisma : `import { prisma } from "@/lib/db";` (pattern existant).

---

## File Structure

| Fichier | Rôle |
|---|---|
| `src/server/etats.ts` (Créer) | `getEtatsData(dossierId)` : charge dossier + balance + grand livre, dérive bilan/CR/TFT. Définit `EtatsData` et `DossierMeta`. |
| `src/lib/etats/export/types.ts` (Créer) | `DocId`, `DOC_IDS`, `ExportFormat`, `EXPORT_FORMATS`, `EtatsExportData` (alias de `EtatsData`), gardes `isDocId` / `isExportFormat`. |
| `src/lib/etats/export/naming.ts` (Créer) | `exportFilename(docId, format, dossier)` + `contentTypeFor(format)` + `slug()`. Pur, sans I/O. |
| `src/lib/etats/export/excel.ts` (Créer) | `buildExcel(docId, data): Buffer` via SheetJS. |
| `src/lib/etats/export/pdf.tsx` (Créer) | `buildPdf(docId, data): Promise<Buffer>` via `@react-pdf/renderer`. |
| `src/lib/etats/export/index.ts` (Créer) | `buildExport(docId, format, data): Promise<ExportResult>` (dispatch Excel/PDF + nommage). |
| `src/app/etats/export/route.ts` (Créer) | Route Handler `GET` : validation, chargement, dispatch, réponse fichier. |
| `src/app/etats/page.tsx` (Modifier) | Utiliser `getEtatsData` au lieu des appels inline (anti-duplication). |
| `src/app/etats/EtatsClient.tsx` (Modifier) | Activer les boutons `⬇ PDF` / `⬇ Excel` en liens de téléchargement ; importer `DocId` canonique. |

---

## Task 1: `getEtatsData` — source de vérité unique

**Files:**
- Create: `src/server/etats.ts`
- Modify: `src/app/etats/page.tsx:21-27`
- Test: `src/server/etats.test.ts`

**Interfaces:**
- Consumes (existant) :
  - `getBalance(dossierId: string): Promise<BalanceResultat>` et `getGrandLivre(dossierId: string, options?): Promise<GrandLivreCompte[]>` depuis `@/server/balance`
  - `deriverBilan(balance): Bilan`, `deriverCompteResultat(balance): CompteResultat`, `deriverFluxTresorerie(balance, grandLivre?): FluxTresorerie` depuis `@/lib/etats/etats-financiers`
  - `prisma` depuis `@/lib/db`
- Produces :
  - `interface DossierMeta { nom: string; exercice: number; devise: string }`
  - `interface EtatsData { dossier: DossierMeta; balance: BalanceResultat; grandLivre: GrandLivreCompte[]; bilan: Bilan; compteResultat: CompteResultat; fluxTresorerie: FluxTresorerie }`
  - `getEtatsData(dossierId: string): Promise<EtatsData>`

- [ ] **Step 1: Write the failing test**

```ts
// src/server/etats.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb } from "./test-helpers";
import { creerPiece, validerPiece } from "./pieces";
import { getEtatsData } from "./etats";

let dossierId: string;

beforeEach(async () => {
  dossierId = await resetDb();
  await prisma.compte.createMany({
    data: [
      { numero: "601000", intitule: "Achats", classeNum: 6, type: "DETAIL", reportNplus1: false, dossierId },
      { numero: "701000", intitule: "Ventes", classeNum: 7, type: "DETAIL", reportNplus1: false, dossierId },
      { numero: "521000", intitule: "Banque", classeNum: 5, type: "DETAIL", reportNplus1: false, dossierId },
    ],
  });
  const vt = await prisma.journal.create({ data: { code: "VT", libelle: "Ventes", dossierId } });
  const d = await creerPiece({
    dossierId, journalId: vt.id, numeroPiece: "VT-001", datePiece: new Date("2020-03-01"),
    lignes: [
      { compteNumero: "521000", libelleLigne: "Encaissement", debit: 1000, credit: 0 },
      { compteNumero: "701000", libelleLigne: "Vente", debit: 0, credit: 1000 },
    ],
  });
  await validerPiece(d.id);
});

describe("getEtatsData", () => {
  it("regroupe métadonnées, balance, grand livre et états dérivés", async () => {
    const data = await getEtatsData(dossierId);
    expect(data.dossier.devise).toBe("XOF");
    expect(typeof data.dossier.exercice).toBe("number");
    expect(data.balance.lignes.length).toBeGreaterThan(0);
    expect(data.grandLivre.length).toBeGreaterThan(0);
    expect(data.compteResultat.totalProduits).toBe(1000);
    expect(data.bilan.equilibre).toBe(true);
    expect(data.fluxTresorerie.tresorerieCloture).toBe(1000);
  });

  it("lève une erreur claire si le dossier est introuvable", async () => {
    await expect(getEtatsData("dossier-inexistant")).rejects.toThrow();
  });
});
```

> Le test suppose que `resetDb()` crée un dossier avec `devise: "XOF"`. Vérifier dans `src/server/test-helpers.ts` ; si la devise diffère, aligner l'assertion `toBe(...)` sur la valeur réellement créée (ne pas modifier le helper).

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/server/etats.test.ts`
Expected: FAIL — `Cannot find module './etats'` (ou `getEtatsData is not a function`).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/server/etats.ts
"use server";

import { prisma } from "@/lib/db";
import { getBalance, getGrandLivre, type BalanceResultat, type GrandLivreCompte } from "@/server/balance";
import {
  deriverBilan,
  deriverCompteResultat,
  deriverFluxTresorerie,
  type Bilan,
  type CompteResultat,
  type FluxTresorerie,
} from "@/lib/etats/etats-financiers";

export interface DossierMeta {
  nom: string;
  exercice: number;
  devise: string;
}

export interface EtatsData {
  dossier: DossierMeta;
  balance: BalanceResultat;
  grandLivre: GrandLivreCompte[];
  bilan: Bilan;
  compteResultat: CompteResultat;
  fluxTresorerie: FluxTresorerie;
}

/**
 * Regroupe tout le nécessaire à l'affichage et à l'export des états d'un dossier.
 * Source de vérité unique : la page /etats et la route d'export l'utilisent toutes deux.
 */
export async function getEtatsData(dossierId: string): Promise<EtatsData> {
  const [dossier, balance, grandLivre] = await Promise.all([
    prisma.dossier.findUniqueOrThrow({
      where: { id: dossierId },
      select: { nom: true, exercice: true, devise: true },
    }),
    getBalance(dossierId),
    getGrandLivre(dossierId),
  ]);

  return {
    dossier,
    balance,
    grandLivre,
    bilan: deriverBilan(balance),
    compteResultat: deriverCompteResultat(balance),
    fluxTresorerie: deriverFluxTresorerie(balance, grandLivre),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/server/etats.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Refactor `page.tsx` to use `getEtatsData`**

Remplacer dans `src/app/etats/page.tsx` les imports et le bloc de chargement (lignes ~3-4 et ~21-27) :

```tsx
// imports — remplacer les 2 lignes getBalance/deriver* par :
import { getEtatsData } from "@/server/etats";

// corps — remplacer le bloc Promise.all + dériver par :
  const { balance, grandLivre, bilan, compteResultat, fluxTresorerie } =
    await getEtatsData(dossierId);
```

Les props passées à `<EtatsClient .../>` restent identiques (mêmes noms de variables).

- [ ] **Step 6: Verify typecheck and full test suite**

Run: `npx tsc --noEmit && npm test -- src/server/etats.test.ts`
Expected: pas d'erreur de types ; tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/server/etats.ts src/server/etats.test.ts src/app/etats/page.tsx
git commit -m "feat(etats): getEtatsData, source de vérité unique pour aperçu et export"
```

---

## Task 2: Types partagés + gardes de validation

**Files:**
- Create: `src/lib/etats/export/types.ts`
- Test: `src/lib/etats/export/types.test.ts`

**Interfaces:**
- Consumes : `EtatsData` depuis `@/server/etats`
- Produces :
  - `type DocId = "balance-generale" | "grand-livre" | "bilan" | "compte-resultat" | "flux-tresorerie"`
  - `const DOC_IDS: readonly DocId[]`
  - `type ExportFormat = "pdf" | "xlsx"`
  - `const EXPORT_FORMATS: readonly ExportFormat[]`
  - `type EtatsExportData = EtatsData`
  - `isDocId(v: unknown): v is DocId`
  - `isExportFormat(v: unknown): v is ExportFormat`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/etats/export/types.test.ts
import { describe, it, expect } from "vitest";
import { DOC_IDS, EXPORT_FORMATS, isDocId, isExportFormat } from "./types";

describe("types export", () => {
  it("expose les 5 documents exportables", () => {
    expect([...DOC_IDS].sort()).toEqual(
      ["balance-generale", "bilan", "compte-resultat", "flux-tresorerie", "grand-livre"]
    );
  });

  it("expose les 2 formats", () => {
    expect([...EXPORT_FORMATS].sort()).toEqual(["pdf", "xlsx"]);
  });

  it("isDocId valide uniquement les DocId connus", () => {
    expect(isDocId("bilan")).toBe(true);
    expect(isDocId("notes")).toBe(false);
    expect(isDocId(null)).toBe(false);
  });

  it("isExportFormat valide uniquement pdf et xlsx", () => {
    expect(isExportFormat("pdf")).toBe(true);
    expect(isExportFormat("csv")).toBe(false);
    expect(isExportFormat(undefined)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/etats/export/types.test.ts`
Expected: FAIL — `Cannot find module './types'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/etats/export/types.ts
import type { EtatsData } from "@/server/etats";

export type DocId =
  | "balance-generale"
  | "grand-livre"
  | "bilan"
  | "compte-resultat"
  | "flux-tresorerie";

export const DOC_IDS: readonly DocId[] = [
  "balance-generale",
  "grand-livre",
  "bilan",
  "compte-resultat",
  "flux-tresorerie",
];

export type ExportFormat = "pdf" | "xlsx";
export const EXPORT_FORMATS: readonly ExportFormat[] = ["pdf", "xlsx"];

export type EtatsExportData = EtatsData;

export function isDocId(v: unknown): v is DocId {
  return typeof v === "string" && (DOC_IDS as readonly string[]).includes(v);
}

export function isExportFormat(v: unknown): v is ExportFormat {
  return typeof v === "string" && (EXPORT_FORMATS as readonly string[]).includes(v);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/etats/export/types.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/etats/export/types.ts src/lib/etats/export/types.test.ts
git commit -m "feat(export): types et gardes DocId/ExportFormat"
```

---

## Task 3: Nommage de fichier et content-type

**Files:**
- Create: `src/lib/etats/export/naming.ts`
- Test: `src/lib/etats/export/naming.test.ts`

**Interfaces:**
- Consumes : `DocId`, `ExportFormat` depuis `./types` ; `DossierMeta` depuis `@/server/etats`
- Produces :
  - `slug(s: string): string`
  - `contentTypeFor(format: ExportFormat): string`
  - `exportFilename(docId: DocId, format: ExportFormat, dossier: DossierMeta): string`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/etats/export/naming.test.ts
import { describe, it, expect } from "vitest";
import { slug, contentTypeFor, exportFilename } from "./naming";

const dossier = { nom: "Société Transport Bénin", exercice: 2020, devise: "XOF" };

describe("naming", () => {
  it("slug normalise accents, espaces et casse", () => {
    expect(slug("Société Transport Bénin")).toBe("societe-transport-benin");
    expect(slug("Compte de Résultat")).toBe("compte-de-resultat");
  });

  it("contentTypeFor mappe les formats", () => {
    expect(contentTypeFor("pdf")).toBe("application/pdf");
    expect(contentTypeFor("xlsx")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
  });

  it("exportFilename combine dossier, document, exercice et extension", () => {
    expect(exportFilename("bilan", "pdf", dossier)).toBe(
      "societe-transport-benin_bilan_2020.pdf"
    );
    expect(exportFilename("grand-livre", "xlsx", dossier)).toBe(
      "societe-transport-benin_grand-livre_2020.xlsx"
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/etats/export/naming.test.ts`
Expected: FAIL — `Cannot find module './naming'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/etats/export/naming.ts
import type { DocId, ExportFormat } from "./types";
import type { DossierMeta } from "@/server/etats";

/** Minuscule, sans accents, espaces/non-alphanumériques → tirets. */
export function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function contentTypeFor(format: ExportFormat): string {
  return format === "pdf"
    ? "application/pdf"
    : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
}

export function exportFilename(docId: DocId, format: ExportFormat, dossier: DossierMeta): string {
  return `${slug(dossier.nom)}_${docId}_${dossier.exercice}.${format}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/etats/export/naming.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/etats/export/naming.ts src/lib/etats/export/naming.test.ts
git commit -m "feat(export): nommage de fichier et content-type"
```

---

## Task 4: Builder Excel (`xlsx`)

**Files:**
- Create: `src/lib/etats/export/excel.ts`
- Test: `src/lib/etats/export/excel.test.ts`

**Interfaces:**
- Consumes : `DocId` depuis `./types` ; `EtatsData` depuis `@/server/etats` ; `xlsx` (SheetJS)
- Produces : `buildExcel(docId: DocId, data: EtatsData): Buffer`

**Note SheetJS :** `XLSX.utils.aoa_to_sheet(rows)` crée une feuille à partir d'un tableau de lignes (tableau de cellules). `XLSX.write(wb, { type: "buffer", bookType: "xlsx" })` renvoie un `Buffer` Node. En test, relire avec `XLSX.read(buf, { type: "buffer" })` puis `XLSX.utils.sheet_to_json(ws, { header: 1 })` (matrice de lignes).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/etats/export/excel.test.ts
import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { buildExcel } from "./excel";
import type { EtatsData } from "@/server/etats";

// Fixture minimal : 1 vente de 1000 encaissée en banque.
const data: EtatsData = {
  dossier: { nom: "Test SARL", exercice: 2020, devise: "XOF" },
  balance: {
    lignes: [
      { compteNumero: "521000", intitule: "Banque", classeNum: 5, typeCompte: "DETAIL", ouverture: 0, soldeNMoins1: 0, debit: 1000, credit: 0, soldeDebiteur: 1000, soldeCrediteur: 0 },
      { compteNumero: "701000", intitule: "Ventes", classeNum: 7, typeCompte: "DETAIL", ouverture: 0, soldeNMoins1: 0, debit: 0, credit: 1000, soldeDebiteur: 0, soldeCrediteur: 1000 },
    ],
    totaux: { debit: 1000, credit: 1000, soldeDebiteur: 1000, soldeCrediteur: 1000 },
  },
  grandLivre: [
    { compteNumero: "521000", intitule: "Banque", classeNum: 5, totalDebit: 1000, totalCredit: 0, solde: 1000, lignes: [
      { date: "2020-03-01T00:00:00.000Z", numeroPiece: "VT-001", journalCode: "VT", libelle: "Encaissement", debit: 1000, credit: 0, soldeApres: 1000 },
    ] },
  ],
  bilan: { actif: [{ compteNumero: "521000", intitule: "Banque", montant: 1000, montantNMoins1: 0 }], passif: [], totalActif: 1000, totalPassif: 1000, resultatNet: 1000, equilibre: true },
  compteResultat: { charges: [], produits: [{ compteNumero: "701000", intitule: "Ventes", montant: 1000, montantNMoins1: 0 }], totalCharges: 0, totalProduits: 1000, resultatNet: 1000, totalChargesNMoins1: 0, totalProduitsNMoins1: 0, resultatNetNMoins1: 0 },
  fluxTresorerie: { exploitation: { total: 1000, postes: [{ libelle: "Encaissements — Ventes (701000)", montant: 1000 }] }, investissement: { total: 0, postes: [] }, financement: { total: 0, postes: [] }, variationTresorerie: 1000, tresorerieOuverture: 0, tresorerieCloture: 1000 },
};

function lignes(buf: Buffer): unknown[][] {
  const wb = XLSX.read(buf, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false }) as unknown[][];
}

describe("buildExcel", () => {
  it("balance-generale : contient les comptes et le total des mouvements", () => {
    const rows = lignes(buildExcel("balance-generale", data));
    const flat = rows.flat().map(String);
    expect(flat).toContain("521000");
    expect(flat).toContain("701000");
    expect(flat).toContain("1000"); // total débit mouvements
  });

  it("bilan : porte le résultat net et l'équilibre", () => {
    const rows = lignes(buildExcel("bilan", data));
    const flat = rows.flat().map(String);
    expect(flat.some((c) => c.includes("1000"))).toBe(true);
  });

  it("compte-resultat : total produits = 1000", () => {
    const rows = lignes(buildExcel("compte-resultat", data));
    expect(rows.flat().map(String)).toContain("1000");
  });

  it("grand-livre et flux-tresorerie produisent un classeur non vide", () => {
    expect(lignes(buildExcel("grand-livre", data)).length).toBeGreaterThan(0);
    expect(lignes(buildExcel("flux-tresorerie", data)).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/etats/export/excel.test.ts`
Expected: FAIL — `Cannot find module './excel'`.

- [ ] **Step 3: Write minimal implementation**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/etats/export/excel.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/etats/export/excel.ts src/lib/etats/export/excel.test.ts
git commit -m "feat(export): builder Excel des 5 états"
```

---

## Task 5: Builder PDF (`@react-pdf/renderer`)

**Files:**
- Create: `src/lib/etats/export/pdf.tsx`
- Test: `src/lib/etats/export/pdf.test.ts`
- Modify: `package.json` (ajout dépendance)

**Interfaces:**
- Consumes : `DocId` depuis `./types` ; `EtatsData` depuis `@/server/etats` ; `@react-pdf/renderer`
- Produces : `buildPdf(docId: DocId, data: EtatsData): Promise<Buffer>`

**Note PDF :** `renderToBuffer(<Document/>)` renvoie un `Buffer` Node. La vérification du contenu textuel d'un PDF nécessiterait un parser non installé ; le test se limite donc aux octets magiques `%PDF` et à une taille non triviale. La justesse des **valeurs** est couverte par les tests Excel (Task 4) et la dérivation (`etats-financiers.test.ts`), qui partagent la même source de données.

- [ ] **Step 1: Add dependency**

Run: `npm install @react-pdf/renderer`
Expected: `package.json` mis à jour, installation sans erreur.

- [ ] **Step 2: Write the failing test**

```ts
// src/lib/etats/export/pdf.test.ts
import { describe, it, expect } from "vitest";
import { buildPdf } from "./pdf";
import type { DocId } from "./types";
import type { EtatsData } from "@/server/etats";

const data: EtatsData = {
  dossier: { nom: "Test SARL", exercice: 2020, devise: "XOF" },
  balance: {
    lignes: [
      { compteNumero: "701000", intitule: "Ventes", classeNum: 7, typeCompte: "DETAIL", ouverture: 0, soldeNMoins1: 0, debit: 0, credit: 1000, soldeDebiteur: 0, soldeCrediteur: 1000 },
    ],
    totaux: { debit: 0, credit: 1000, soldeDebiteur: 0, soldeCrediteur: 1000 },
  },
  grandLivre: [
    { compteNumero: "701000", intitule: "Ventes", classeNum: 7, totalDebit: 0, totalCredit: 1000, solde: -1000, lignes: [
      { date: "2020-03-01T00:00:00.000Z", numeroPiece: "VT-001", journalCode: "VT", libelle: "Vente", debit: 0, credit: 1000, soldeApres: -1000 },
    ] },
  ],
  bilan: { actif: [], passif: [], totalActif: 0, totalPassif: 1000, resultatNet: 1000, equilibre: false },
  compteResultat: { charges: [], produits: [{ compteNumero: "701000", intitule: "Ventes", montant: 1000, montantNMoins1: 0 }], totalCharges: 0, totalProduits: 1000, resultatNet: 1000, totalChargesNMoins1: 0, totalProduitsNMoins1: 0, resultatNetNMoins1: 0 },
  fluxTresorerie: { exploitation: { total: 1000, postes: [] }, investissement: { total: 0, postes: [] }, financement: { total: 0, postes: [] }, variationTresorerie: 1000, tresorerieOuverture: 0, tresorerieCloture: 1000 },
};

const DOCS: DocId[] = ["balance-generale", "grand-livre", "bilan", "compte-resultat", "flux-tresorerie"];

describe("buildPdf", () => {
  it.each(DOCS)("produit un PDF valide pour %s", async (docId) => {
    const buf = await buildPdf(docId, data);
    expect(buf.length).toBeGreaterThan(500);
    expect(buf.subarray(0, 4).toString("latin1")).toBe("%PDF");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- src/lib/etats/export/pdf.test.ts`
Expected: FAIL — `Cannot find module './pdf'`.

- [ ] **Step 4: Write minimal implementation**

```tsx
// src/lib/etats/export/pdf.tsx
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- src/lib/etats/export/pdf.test.ts`
Expected: PASS (5 cas).

> Si vitest échoue à transpiler le JSX du `.tsx` (ex. erreur sur `<Document>`), vérifier que `vitest.config` utilise bien le plugin React/esbuild jsx. En dernier recours, ajouter `/* @vitest-environment node */` n'est pas suffisant pour le JSX ; configurer `esbuild: { jsx: "automatic" }` dans la config vitest. Ne pas changer l'implémentation — c'est un réglage d'outillage de test.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/lib/etats/export/pdf.tsx src/lib/etats/export/pdf.test.ts
git commit -m "feat(export): builder PDF des 5 états via @react-pdf/renderer"
```

---

## Task 6: Dispatcher `buildExport`

**Files:**
- Create: `src/lib/etats/export/index.ts`
- Test: `src/lib/etats/export/index.test.ts`

**Interfaces:**
- Consumes : `buildExcel` (`./excel`), `buildPdf` (`./pdf`), `exportFilename`/`contentTypeFor` (`./naming`), types (`./types`), `EtatsData` (`@/server/etats`)
- Produces :
  - `interface ExportResult { buffer: Buffer; filename: string; contentType: string }`
  - `buildExport(docId: DocId, format: ExportFormat, data: EtatsData): Promise<ExportResult>`
  - Re-export de `DocId`, `DOC_IDS`, `ExportFormat`, `EXPORT_FORMATS`, `isDocId`, `isExportFormat`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/etats/export/index.test.ts
import { describe, it, expect } from "vitest";
import { buildExport } from "./index";
import type { EtatsData } from "@/server/etats";

const data: EtatsData = {
  dossier: { nom: "Test SARL", exercice: 2020, devise: "XOF" },
  balance: { lignes: [], totaux: { debit: 0, credit: 0, soldeDebiteur: 0, soldeCrediteur: 0 } },
  grandLivre: [],
  bilan: { actif: [], passif: [], totalActif: 0, totalPassif: 0, resultatNet: 0, equilibre: true },
  compteResultat: { charges: [], produits: [], totalCharges: 0, totalProduits: 0, resultatNet: 0, totalChargesNMoins1: 0, totalProduitsNMoins1: 0, resultatNetNMoins1: 0 },
  fluxTresorerie: { exploitation: { total: 0, postes: [] }, investissement: { total: 0, postes: [] }, financement: { total: 0, postes: [] }, variationTresorerie: 0, tresorerieOuverture: 0, tresorerieCloture: 0 },
};

describe("buildExport", () => {
  it("xlsx : nom, content-type et buffer corrects", async () => {
    const r = await buildExport("bilan", "xlsx", data);
    expect(r.filename).toBe("test-sarl_bilan_2020.xlsx");
    expect(r.contentType).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(r.buffer.length).toBeGreaterThan(0);
  });

  it("pdf : nom, content-type et octets %PDF", async () => {
    const r = await buildExport("balance-generale", "pdf", data);
    expect(r.filename).toBe("test-sarl_balance-generale_2020.pdf");
    expect(r.contentType).toBe("application/pdf");
    expect(r.buffer.subarray(0, 4).toString("latin1")).toBe("%PDF");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/etats/export/index.test.ts`
Expected: FAIL — `Cannot find module './index'` (ou `buildExport` indéfini).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/etats/export/index.ts
import type { EtatsData } from "@/server/etats";
import { buildExcel } from "./excel";
import { buildPdf } from "./pdf";
import { contentTypeFor, exportFilename } from "./naming";
import type { DocId, ExportFormat } from "./types";

export * from "./types";

export interface ExportResult {
  buffer: Buffer;
  filename: string;
  contentType: string;
}

export async function buildExport(
  docId: DocId,
  format: ExportFormat,
  data: EtatsData
): Promise<ExportResult> {
  const buffer = format === "pdf" ? await buildPdf(docId, data) : buildExcel(docId, data);
  return {
    buffer,
    filename: exportFilename(docId, format, data.dossier),
    contentType: contentTypeFor(format),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/etats/export/index.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/etats/export/index.ts src/lib/etats/export/index.test.ts
git commit -m "feat(export): dispatcher buildExport (PDF/Excel + nommage)"
```

---

## Task 7: Route Handler `/etats/export`

**Files:**
- Create: `src/app/etats/export/route.ts`
- Test: `src/app/etats/export/route.test.ts`

**Interfaces:**
- Consumes : `getDossierIdCookie` (`@/lib/dossier-context`), `getEtatsData` (`@/server/etats`), `buildExport`/`isDocId`/`isExportFormat` (`@/lib/etats/export`)
- Produces : `GET(req: Request): Promise<Response>`

- [ ] **Step 1: Write the failing test**

```ts
// src/app/etats/export/route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/dossier-context", () => ({ getDossierIdCookie: vi.fn() }));
vi.mock("@/server/etats", () => ({ getEtatsData: vi.fn() }));

import { GET } from "./route";
import { getDossierIdCookie } from "@/lib/dossier-context";
import { getEtatsData } from "@/server/etats";

const fakeData = {
  dossier: { nom: "Test SARL", exercice: 2020, devise: "XOF" },
  balance: { lignes: [], totaux: { debit: 0, credit: 0, soldeDebiteur: 0, soldeCrediteur: 0 } },
  grandLivre: [],
  bilan: { actif: [], passif: [], totalActif: 0, totalPassif: 0, resultatNet: 0, equilibre: true },
  compteResultat: { charges: [], produits: [], totalCharges: 0, totalProduits: 0, resultatNet: 0, totalChargesNMoins1: 0, totalProduitsNMoins1: 0, resultatNetNMoins1: 0 },
  fluxTresorerie: { exploitation: { total: 0, postes: [] }, investissement: { total: 0, postes: [] }, financement: { total: 0, postes: [] }, variationTresorerie: 0, tresorerieOuverture: 0, tresorerieCloture: 0 },
};

beforeEach(() => {
  vi.mocked(getDossierIdCookie).mockReset();
  vi.mocked(getEtatsData).mockReset();
});

function req(qs: string) {
  return new Request(`http://localhost/etats/export${qs}`);
}

describe("GET /etats/export", () => {
  it("400 si aucun dossier", async () => {
    vi.mocked(getDossierIdCookie).mockResolvedValue(null);
    const res = await GET(req("?doc=bilan&format=pdf"));
    expect(res.status).toBe(400);
  });

  it("400 si doc invalide", async () => {
    vi.mocked(getDossierIdCookie).mockResolvedValue("d1");
    const res = await GET(req("?doc=notes&format=pdf"));
    expect(res.status).toBe(400);
  });

  it("400 si format invalide", async () => {
    vi.mocked(getDossierIdCookie).mockResolvedValue("d1");
    const res = await GET(req("?doc=bilan&format=csv"));
    expect(res.status).toBe(400);
  });

  it("200 + en-têtes de téléchargement pour xlsx", async () => {
    vi.mocked(getDossierIdCookie).mockResolvedValue("d1");
    vi.mocked(getEtatsData).mockResolvedValue(fakeData as never);
    const res = await GET(req("?doc=bilan&format=xlsx"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    expect(res.headers.get("Content-Disposition")).toContain("test-sarl_bilan_2020.xlsx");
    expect((await res.arrayBuffer()).byteLength).toBeGreaterThan(0);
  });

  it("500 si la génération échoue", async () => {
    vi.mocked(getDossierIdCookie).mockResolvedValue("d1");
    vi.mocked(getEtatsData).mockRejectedValue(new Error("DB down"));
    const res = await GET(req("?doc=bilan&format=pdf"));
    expect(res.status).toBe(500);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/etats/export/route.test.ts`
Expected: FAIL — `Cannot find module './route'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/app/etats/export/route.ts
import { getDossierIdCookie } from "@/lib/dossier-context";
import { getEtatsData } from "@/server/etats";
import { buildExport, isDocId, isExportFormat } from "@/lib/etats/export";

// États déduits d'une base vivante : jamais figés au build.
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const dossierId = await getDossierIdCookie();
  if (!dossierId) {
    return new Response("Aucun dossier sélectionné.", { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const doc = searchParams.get("doc");
  const format = searchParams.get("format");
  if (!isDocId(doc) || !isExportFormat(format)) {
    return new Response("Paramètres « doc » ou « format » invalides.", { status: 400 });
  }

  try {
    const data = await getEtatsData(dossierId);
    const { buffer, filename, contentType } = await buildExport(doc, format, data);
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[etats/export] échec de génération", err);
    return new Response("Erreur lors de la génération du document.", { status: 500 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/app/etats/export/route.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/etats/export/route.ts src/app/etats/export/route.test.ts
git commit -m "feat(export): route handler GET /etats/export"
```

---

## Task 8: Câblage UI — activer les boutons de téléchargement

**Files:**
- Modify: `src/app/etats/EtatsClient.tsx:11` (import du type canonique) et `:182-185` (boutons → liens)

**Interfaces:**
- Consumes : `DocId` depuis `@/lib/etats/export`

- [ ] **Step 1: Remplacer le type `DocId` local par l'import canonique**

Dans `src/app/etats/EtatsClient.tsx`, supprimer la ligne 11 :

```tsx
type DocId = "balance-generale" | "grand-livre" | "bilan" | "compte-resultat" | "flux-tresorerie";
```

et l'ajouter aux imports en tête de fichier :

```tsx
import type { DocId } from "@/lib/etats/export";
```

- [ ] **Step 2: Activer les boutons en liens de téléchargement**

Remplacer le bloc (≈ lignes 182-185) :

```tsx
        <div className="row" style={{ padding: 14, borderTop: "1px solid var(--line)", gap: 8 }}>
          <button className="btn" disabled>⬇ PDF</button>
          <button className="btn" disabled>⬇ Excel</button>
        </div>
```

par :

```tsx
        <div className="row" style={{ padding: 14, borderTop: "1px solid var(--line)", gap: 8 }}>
          {docCourant?.pret ? (
            <>
              <a className="btn" href={`/etats/export?doc=${docId}&format=pdf`} download>⬇ PDF</a>
              <a className="btn" href={`/etats/export?doc=${docId}&format=xlsx`} download>⬇ Excel</a>
            </>
          ) : (
            <>
              <button className="btn" disabled>⬇ PDF</button>
              <button className="btn" disabled>⬇ Excel</button>
            </>
          )}
        </div>
```

- [ ] **Step 3: Verify typecheck, lint and build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: pas d'erreur de types, lint propre, build réussi.

- [ ] **Step 4: Manual verification (téléchargement réel)**

1. `npm run dev`, ouvrir `/etats` avec un dossier contenant des écritures (ex. après `npm run db:seed`).
2. Sélectionner « Balance générale » → « Aperçu ».
3. Cliquer `⬇ Excel` : un fichier `*_balance-generale_<exercice>.xlsx` se télécharge et s'ouvre dans un tableur.
4. Cliquer `⬇ PDF` : un fichier `*_balance-generale_<exercice>.pdf` se télécharge et s'ouvre.
5. Vérifier qu'un document « à venir » (ex. Balance des tiers) garde des boutons désactivés.

- [ ] **Step 5: Commit**

```bash
git add src/app/etats/EtatsClient.tsx
git commit -m "feat(etats): activer les téléchargements PDF/Excel dans l'aperçu"
```

---

## Task 9: Vérification finale de la suite

- [ ] **Step 1: Run the whole test suite**

Run: `npm test`
Expected: tous les fichiers `*.test.ts` PASS, dont les 6 nouveaux fichiers de test.

- [ ] **Step 2: Final typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: succès.

---

## Self-Review (effectuée à la rédaction)

- **Couverture du spec :**
  - §3 Architecture → Tasks 1-7 (tous les fichiers prévus créés).
  - §4 Flux de données → Task 7 (route) + Task 8 (lien UI).
  - §5 UI → Task 8.
  - §6 Erreurs (400 dossier/params, 500 builder, dossier vide = doc valide) → Task 7 (tests 400/500) + fixtures vides dans Tasks 6-7 (dossier sans écriture → document non vide). ✅
  - §7 Tests → un fichier `*.test.ts` par module. ✅
  - §8 Décisions (serveur + `@react-pdf/renderer`) → Tasks 5, 7. ✅
- **Écart assumé vs spec §7 :** le test PDF vérifie les octets `%PDF` + taille (pas le contenu textuel), faute de parser PDF installé ; la justesse des valeurs est couverte par les tests Excel et de dérivation partageant la même source de données. Documenté dans Task 5.
- **Cohérence des types :** `EtatsData`/`DossierMeta` (Task 1) réutilisés tels quels partout ; `DocId`/`ExportFormat` définis en Task 2 et importés par Tasks 3-8 ; `buildExcel`/`buildPdf`/`buildExport`/`exportFilename`/`contentTypeFor` aux signatures constantes entre définition et appel. ✅
- **Placeholders :** aucun TODO/TBD ; chaque étape de code montre le code complet. ✅
