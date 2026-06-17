# Plan comptable (incrément 1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire la première brique fonctionnelle réelle de DaCompta — un module Plan comptable SYSCOHADA persisté (seed + CRUD + import), avec de vraies règles comptables.

**Architecture:** Application Next.js (App Router) + TypeScript. La logique comptable vit dans des fonctions pures testées (TDD), au-dessus desquelles des server actions persistent en SQLite via Prisma. L'UI est volontairement sobre (pas d'investissement hi-fi) : 3 onglets Plan / Natures / Importer + un drawer de création de compte. Tout compte appartient à un `Dossier` seedé par défaut, pour que la future « configuration par pays » n'ait qu'à créer d'autres dossiers.

**Tech Stack:** Next.js 15, React 19, TypeScript, Prisma 6 + SQLite, Vitest 2, SheetJS (`xlsx`) pour parser Excel/CSV.

---

## File Structure

```
dacompta/
  package.json
  tsconfig.json
  next.config.ts
  vitest.config.ts
  .env                              # DATABASE_URL
  prisma/
    schema.prisma                   # Referentiel, Classe, Nature, Dossier, Compte, ImportLog
    seed.ts                         # seed référentiel SYSCOHADA + dossier "Les Associés SA"
  src/
    lib/
      db.ts                         # singleton PrismaClient
      syscohada/
        referentiel.ts              # données seed (classes, natures, pays) + types
        compte-logic.ts            # complétion n°, détection nature, report, validation (PUR)
        compte-logic.test.ts
        import-mapping.ts           # mapping colonnes par contenu + contrôles (PUR)
        import-mapping.test.ts
    server/
      comptes.ts                    # server actions : lister/créer/modifier/archiver
      comptes.test.ts
      import.ts                     # server actions : prévisualiser/appliquer/annuler
      import.test.ts
      test-helpers.ts               # resetDb() pour les tests d'intégration
    app/
      layout.tsx
      page.tsx                      # redirect → /plan-comptable
      globals.css
      plan-comptable/
        page.tsx                    # server component : charge données, rend le client
        PlanComptableClient.tsx     # état des onglets
        TabPlan.tsx
        TabNatures.tsx
        TabImport.tsx
        NewAccountDrawer.tsx
```

---

### Task 1: Scaffold du projet

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `.env`, `.gitignore`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

- [ ] **Step 1: Initialiser Next.js (TypeScript, App Router, sans Tailwind)**

Run (à la racine du repo, qui contient déjà `docs/` et `.git`) :
```bash
npx create-next-app@latest . --ts --app --eslint --no-tailwind --no-src-dir=false --import-alias "@/*" --use-npm --skip-install
```
Si `create-next-app` refuse un dossier non vide : créer dans un sous-dossier temporaire puis déplacer, OU créer les fichiers manuellement comme ci-dessous. L'objectif final : un projet Next.js App Router avec `src/`, alias `@/*`.

- [ ] **Step 2: Ajouter les dépendances**

Run:
```bash
npm install @prisma/client xlsx
npm install -D prisma vitest @types/node tsx
```

- [ ] **Step 3: Créer `.env`**

```
DATABASE_URL="file:./prisma/dev.db"
```

- [ ] **Step 4: Créer `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
```

- [ ] **Step 5: Ajouter les scripts dans `package.json`**

Dans `"scripts"` :
```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "test": "vitest run",
  "test:watch": "vitest",
  "db:push": "prisma db push",
  "db:seed": "tsx prisma/seed.ts"
}
```
Et ajouter à la racine du `package.json` :
```json
"prisma": { "seed": "tsx prisma/seed.ts" }
```

- [ ] **Step 6: S'assurer que `.gitignore` ignore la base et node_modules**

Ajouter à `.gitignore` si absent :
```
/node_modules
/.next
/prisma/dev.db
/prisma/test.db
```

- [ ] **Step 7: Vérifier que Vitest démarre (aucun test encore)**

Run: `npm run test`
Expected: Vitest s'exécute et indique `No test files found` (exit 0 ou message clair). Pas d'erreur de config.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js + Prisma + Vitest"
```

---

### Task 2: Schéma Prisma + client

**Files:**
- Create: `prisma/schema.prisma`, `src/lib/db.ts`

- [ ] **Step 1: Écrire `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Referentiel {
  id       String    @id @default(cuid())
  code     String    @unique // "SYSCOHADA_REVISE"
  libelle  String
  classes  Classe[]
  natures  Nature[]
  dossiers Dossier[]
}

model Classe {
  id            String      @id @default(cuid())
  numero        Int // 1..9
  libelle       String
  referentiel   Referentiel @relation(fields: [referentielId], references: [id])
  referentielId String

  @@unique([referentielId, numero])
}

model Nature {
  id            String      @id @default(cuid())
  racine        String // "40", "6", ...
  libelle       String
  famille       String // TIERS | CAPITAUX | TRESORERIE | GESTION | IMMO | STOCK
  reportNplus1  Boolean
  referentiel   Referentiel @relation(fields: [referentielId], references: [id])
  referentielId String

  @@unique([referentielId, racine])
}

model Dossier {
  id            String      @id @default(cuid())
  nom           String
  ville         String
  pays          String
  devise        String
  exercice      Int
  referentiel   Referentiel @relation(fields: [referentielId], references: [id])
  referentielId String
  comptes       Compte[]
  imports       ImportLog[]
}

model Compte {
  id           String   @id @default(cuid())
  numero       String // 6 chiffres
  intitule     String
  type         String // DETAIL | TOTAL
  classeNum    Int
  natureRacine String?
  reportNplus1 Boolean
  collectif    Boolean  @default(false)
  statut       String   @default("ACTIF") // ACTIF | ARCHIVE
  dossier      Dossier  @relation(fields: [dossierId], references: [id])
  dossierId    String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([dossierId, numero])
}

model ImportLog {
  id            String   @id @default(cuid())
  dossier       Dossier  @relation(fields: [dossierId], references: [id])
  dossierId     String
  fichierNom    String
  mode          String // FUSIONNER | REMPLACER | AJOUTER
  snapshotAvant String // JSON des comptes avant import
  compteIds     String // JSON array des ids créés/modifiés
  annule        Boolean  @default(false)
  createdAt     DateTime @default(now())
}
```

- [ ] **Step 2: Pousser le schéma vers SQLite et générer le client**

Run: `npm run db:push`
Expected: `Your database is now in sync with your Prisma schema` + client généré.

- [ ] **Step 3: Écrire `src/lib/db.ts` (singleton)**

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: prisma schema (Referentiel/Classe/Nature/Dossier/Compte/ImportLog)"
```

---

### Task 3: Données du référentiel SYSCOHADA

**Files:**
- Create: `src/lib/syscohada/referentiel.ts`

Données issues de la fiche projet « Référentiel SYSCOHADA » (faisant autorité).

- [ ] **Step 1: Écrire `referentiel.ts`**

```ts
export type Famille =
  | "TIERS" | "CAPITAUX" | "TRESORERIE" | "GESTION" | "IMMO" | "STOCK";

export interface ClasseDef { numero: number; libelle: string; }
export interface NatureDef { racine: string; libelle: string; famille: Famille; reportNplus1: boolean; }
export interface PaysDef { pays: string; capitale: string; devise: string; tva: number; }

export const REFERENTIEL_CODE = "SYSCOHADA_REVISE";
export const REFERENTIEL_LIBELLE = "SYSCOHADA révisé (AUDCIF 2017)";

// 9 classes — colonne vertébrale du plan comptable.
export const CLASSES: ClasseDef[] = [
  { numero: 1, libelle: "Ressources durables" },
  { numero: 2, libelle: "Actif immobilisé" },
  { numero: 3, libelle: "Stocks" },
  { numero: 4, libelle: "Tiers" },
  { numero: 5, libelle: "Trésorerie" },
  { numero: 6, libelle: "Charges des activités ordinaires" },
  { numero: 7, libelle: "Produits des activités ordinaires" },
  { numero: 8, libelle: "Autres charges & produits (HAO)" },
  { numero: 9, libelle: "Analytique & engagements" },
];

// Natures auto-déduites de la racine — conformes SYSCOHADA révisé.
export const NATURES: NatureDef[] = [
  { racine: "11", libelle: "Réserves", famille: "CAPITAUX", reportNplus1: true },
  { racine: "12", libelle: "Report à nouveau", famille: "CAPITAUX", reportNplus1: true },
  { racine: "40", libelle: "Fournisseurs", famille: "TIERS", reportNplus1: false },
  { racine: "41", libelle: "Clients", famille: "TIERS", reportNplus1: false },
  { racine: "42", libelle: "Personnel", famille: "TIERS", reportNplus1: false },
  { racine: "43", libelle: "Organismes sociaux", famille: "TIERS", reportNplus1: false },
  { racine: "44", libelle: "État & collectivités", famille: "TIERS", reportNplus1: false },
  { racine: "52", libelle: "Banques", famille: "TRESORERIE", reportNplus1: true },
  { racine: "57", libelle: "Caisse", famille: "TRESORERIE", reportNplus1: true },
  { racine: "6", libelle: "Charges (activités ordinaires)", famille: "GESTION", reportNplus1: false },
  { racine: "7", libelle: "Produits (activités ordinaires)", famille: "GESTION", reportNplus1: false },
  { racine: "8", libelle: "Charges & produits HAO", famille: "GESTION", reportNplus1: false },
];

// 17 pays OHADA (pour le dossier par défaut + future config par pays).
export const PAYS: PaysDef[] = [
  { pays: "Bénin", capitale: "Cotonou", devise: "XOF", tva: 18 },
  { pays: "Burkina Faso", capitale: "Ouagadougou", devise: "XOF", tva: 18 },
  { pays: "Cameroun", capitale: "Yaoundé", devise: "XAF", tva: 19.25 },
  { pays: "Centrafrique", capitale: "Bangui", devise: "XAF", tva: 19 },
  { pays: "Comores", capitale: "Moroni", devise: "KMF", tva: 10 },
  { pays: "Congo", capitale: "Brazzaville", devise: "XAF", tva: 18.9 },
  { pays: "Côte d'Ivoire", capitale: "Abidjan", devise: "XOF", tva: 18 },
  { pays: "Gabon", capitale: "Libreville", devise: "XAF", tva: 18 },
  { pays: "Guinée", capitale: "Conakry", devise: "GNF", tva: 18 },
  { pays: "Guinée-Bissau", capitale: "Bissau", devise: "XOF", tva: 10 },
  { pays: "Guinée Équatoriale", capitale: "Malabo", devise: "XAF", tva: 15 },
  { pays: "Mali", capitale: "Bamako", devise: "XOF", tva: 18 },
  { pays: "Niger", capitale: "Niamey", devise: "XOF", tva: 19 },
  { pays: "RDC", capitale: "Kinshasa", devise: "CDF", tva: 16 },
  { pays: "Sénégal", capitale: "Dakar", devise: "XOF", tva: 18 },
  { pays: "Tchad", capitale: "N'Djamena", devise: "XAF", tva: 18 },
  { pays: "Togo", capitale: "Lomé", devise: "XOF", tva: 18 },
];

// Comptes du cas fil rouge "Les Associés SA" (numéro, intitulé, type, collectif).
export interface CompteSeed { numero: string; intitule: string; type: "DETAIL" | "TOTAL"; collectif?: boolean; }
export const COMPTES_LES_ASSOCIES: CompteSeed[] = [
  { numero: "101300", intitule: "Capital souscrit appelé versé", type: "DETAIL" },
  { numero: "120000", intitule: "Report à nouveau", type: "TOTAL" },
  { numero: "121000", intitule: "Report à nouveau créditeur", type: "DETAIL" },
  { numero: "129000", intitule: "Report à nouveau débiteur", type: "DETAIL" },
  { numero: "162000", intitule: "Emprunts auprès des établissements de crédit", type: "DETAIL" },
  { numero: "245100", intitule: "Matériel de transport", type: "DETAIL" },
  { numero: "401100", intitule: "Fournisseurs", type: "DETAIL", collectif: true },
  { numero: "411100", intitule: "Clients", type: "DETAIL", collectif: true },
  { numero: "443100", intitule: "TVA facturée (collectée)", type: "DETAIL" },
  { numero: "445100", intitule: "TVA récupérable sur immobilisations", type: "DETAIL" },
  { numero: "445200", intitule: "TVA récupérable sur achats", type: "DETAIL" },
  { numero: "521100", intitule: "Banque BIMA", type: "DETAIL" },
  { numero: "521200", intitule: "Banque BTCI", type: "DETAIL" },
  { numero: "571100", intitule: "Caisse siège", type: "DETAIL" },
  { numero: "601100", intitule: "Achats de marchandises", type: "DETAIL" },
  { numero: "661100", intitule: "Appointements et salaires", type: "DETAIL" },
];
```

- [ ] **Step 2: Vérifier la compilation TypeScript**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: données référentiel SYSCOHADA (classes, natures, pays, comptes seed)"
```

---

### Task 4: Logique comptable pure (TDD)

**Files:**
- Create: `src/lib/syscohada/compte-logic.ts`
- Test: `src/lib/syscohada/compte-logic.test.ts`

- [ ] **Step 1: Écrire les tests qui échouent**

```ts
import { describe, it, expect } from "vitest";
import {
  completerNumero, extraireClasse, deduireReport,
  detecterNature, validerNumero,
} from "./compte-logic";
import { NATURES, CLASSES } from "./referentiel";

describe("completerNumero", () => {
  it("complète une racine à 6 chiffres par des zéros à droite", () => {
    expect(completerNumero("401")).toBe("401000");
    expect(completerNumero("6")).toBe("600000");
  });
  it("laisse un numéro déjà à 6 chiffres inchangé", () => {
    expect(completerNumero("571100")).toBe("571100");
  });
  it("ignore espaces et caractères non numériques", () => {
    expect(completerNumero(" 40 1 ")).toBe("401000");
  });
  it("tronque au-delà de 6 chiffres", () => {
    expect(completerNumero("4011001")).toBe("401100");
  });
});

describe("extraireClasse", () => {
  it("renvoie le premier chiffre comme numéro de classe", () => {
    expect(extraireClasse("401100")).toBe(4);
    expect(extraireClasse("601100")).toBe(6);
  });
});

describe("deduireReport", () => {
  it("reporte les classes de bilan (1 à 5)", () => {
    for (const c of [1, 2, 3, 4, 5]) expect(deduireReport(c)).toBe(true);
  });
  it("remet à zéro les classes de gestion/HAO/analytique (6 à 9)", () => {
    for (const c of [6, 7, 8, 9]) expect(deduireReport(c)).toBe(false);
  });
});

describe("detecterNature", () => {
  it("détecte par la racine la plus longue qui correspond", () => {
    expect(detecterNature("401100", NATURES)?.libelle).toBe("Fournisseurs");
    expect(detecterNature("121000", NATURES)?.libelle).toBe("Report à nouveau");
    expect(detecterNature("601100", NATURES)?.libelle).toBe("Charges (activités ordinaires)");
  });
  it("renvoie null quand aucune nature ne correspond (ex. classe 2)", () => {
    expect(detecterNature("245100", NATURES)).toBeNull();
  });
});

describe("validerNumero", () => {
  it("accepte un numéro de 6 chiffres dans une classe connue", () => {
    expect(validerNumero("401100", CLASSES).ok).toBe(true);
  });
  it("refuse une classe inconnue (0)", () => {
    expect(validerNumero("001100", CLASSES).ok).toBe(false);
  });
  it("refuse une longueur invalide", () => {
    expect(validerNumero("40", CLASSES).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier l'échec**

Run: `npx vitest run src/lib/syscohada/compte-logic.test.ts`
Expected: FAIL (`completerNumero is not a function` / module introuvable).

- [ ] **Step 3: Implémenter `compte-logic.ts`**

```ts
import type { ClasseDef, NatureDef } from "./referentiel";

/** Complète une saisie en un numéro de compte à 6 chiffres (zéros à droite). */
export function completerNumero(saisie: string): string {
  const chiffres = (saisie ?? "").replace(/\D/g, "");
  return chiffres.padEnd(6, "0").slice(0, 6);
}

/** Numéro de classe = premier chiffre. */
export function extraireClasse(numero: string): number {
  return Number(numero.charAt(0));
}

/** Report N+1 : classes de bilan (1-5) reportées, gestion (6-9) remises à zéro. */
export function deduireReport(classe: number): boolean {
  return classe >= 1 && classe <= 5;
}

/** Détecte la nature par la racine la plus longue qui préfixe le numéro. */
export function detecterNature(numero: string, natures: NatureDef[]): NatureDef | null {
  const candidates = natures
    .filter((n) => numero.startsWith(n.racine))
    .sort((a, b) => b.racine.length - a.racine.length);
  return candidates[0] ?? null;
}

export interface ValidationResult { ok: boolean; raison?: string; }

/** Valide un numéro : 6 chiffres, classe connue. */
export function validerNumero(numero: string, classes: ClasseDef[]): ValidationResult {
  if (!/^\d{6}$/.test(numero)) return { ok: false, raison: "Le numéro doit comporter 6 chiffres." };
  const classe = extraireClasse(numero);
  if (!classes.some((c) => c.numero === classe)) {
    return { ok: false, raison: `Classe ${classe} inconnue dans le référentiel.` };
  }
  return { ok: true };
}
```

- [ ] **Step 4: Lancer les tests pour vérifier le succès**

Run: `npx vitest run src/lib/syscohada/compte-logic.test.ts`
Expected: PASS (tous les tests verts).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: logique comptable pure (complétion, nature, report, validation)"
```

---

### Task 5: Mapping d'import par contenu (TDD)

**Files:**
- Create: `src/lib/syscohada/import-mapping.ts`
- Test: `src/lib/syscohada/import-mapping.test.ts`

- [ ] **Step 1: Écrire les tests qui échouent**

```ts
import { describe, it, expect } from "vitest";
import { detecterRolesColonnes, construireLignesImport } from "./import-mapping";
import { NATURES, CLASSES } from "./referentiel";

const lignes = [
  ["Note interne", "401100", "Fournisseurs", "D"],
  ["x", "411100", "Clients", "D"],
  ["y", "120000", "Report à nouveau", "T"],
];

describe("detecterRolesColonnes", () => {
  it("reconnaît n°, intitulé et type quel que soit l'ordre des colonnes", () => {
    const roles = detecterRolesColonnes(lignes);
    expect(roles[1]).toBe("NUMERO");
    expect(roles[2]).toBe("INTITULE");
    expect(roles[3]).toBe("TYPE");
    expect(roles[0]).toBe("IGNORER");
  });
});

describe("construireLignesImport", () => {
  it("construit des lignes complètes avec nature/report déduits", () => {
    const roles = detecterRolesColonnes(lignes);
    const out = construireLignesImport(lignes, roles, NATURES, CLASSES, new Set());
    const fourn = out.find((l) => l.numero === "401100")!;
    expect(fourn.intitule).toBe("Fournisseurs");
    expect(fourn.natureRacine).toBe("40");
    expect(fourn.reportNplus1).toBe(false);
    expect(fourn.controle).toBe("ok");
  });
  it("signale un doublon par rapport aux comptes existants", () => {
    const roles = detecterRolesColonnes(lignes);
    const out = construireLignesImport(lignes, roles, NATURES, CLASSES, new Set(["401100"]));
    expect(out.find((l) => l.numero === "401100")!.controle).toBe("doublon");
  });
  it("signale un compte hors SYSCOHADA (classe inconnue)", () => {
    const horsCadre = [["x", "001000", "Compte interne", "D"]];
    const roles = detecterRolesColonnes(lignes); // mêmes positions de colonnes
    const out = construireLignesImport(horsCadre, roles, NATURES, CLASSES, new Set());
    expect(out[0].controle).toBe("hors-syscohada");
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier l'échec**

Run: `npx vitest run src/lib/syscohada/import-mapping.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Implémenter `import-mapping.ts`**

```ts
import type { ClasseDef, NatureDef } from "./referentiel";
import { completerNumero, detecterNature, deduireReport, extraireClasse, validerNumero } from "./compte-logic";

export type RoleColonne = "NUMERO" | "INTITULE" | "TYPE" | "IGNORER";
export type Controle = "ok" | "doublon" | "hors-syscohada";

export interface LigneImport {
  numero: string;
  intitule: string;
  type: "DETAIL" | "TOTAL";
  natureRacine: string | null;
  reportNplus1: boolean;
  controle: Controle;
}

const RE_NUM = /^\d{2,6}$/;
const TYPE_TOTAL = new Set(["t", "total", "σ"]);
const TYPE_DETAIL = new Set(["d", "détail", "detail"]);

function ratio(cells: string[], pred: (c: string) => boolean): number {
  const nonEmpty = cells.filter((c) => c.trim() !== "");
  if (nonEmpty.length === 0) return 0;
  return nonEmpty.filter(pred).length / nonEmpty.length;
}

/** Devine le rôle de chaque colonne par le contenu (ordre indépendant). */
export function detecterRolesColonnes(lignes: string[][]): RoleColonne[] {
  const nbCols = Math.max(0, ...lignes.map((l) => l.length));
  const roles: RoleColonne[] = [];
  for (let c = 0; c < nbCols; c++) {
    const col = lignes.map((l) => (l[c] ?? "").toString().trim());
    if (ratio(col, (v) => RE_NUM.test(v)) >= 0.6) roles.push("NUMERO");
    else if (ratio(col, (v) => TYPE_TOTAL.has(v.toLowerCase()) || TYPE_DETAIL.has(v.toLowerCase())) >= 0.6) roles.push("TYPE");
    else if (ratio(col, (v) => /[a-zA-ZÀ-ÿ]/.test(v)) >= 0.6) roles.push("INTITULE");
    else roles.push("IGNORER");
  }
  // garder un seul NUMERO / INTITULE / TYPE (le premier rencontré)
  const vus = new Set<RoleColonne>();
  return roles.map((r) => {
    if (r === "IGNORER") return r;
    if (vus.has(r)) return "IGNORER";
    vus.add(r);
    return r;
  });
}

function lireType(v: string | undefined): "DETAIL" | "TOTAL" {
  if (v && TYPE_TOTAL.has(v.trim().toLowerCase())) return "TOTAL";
  return "DETAIL";
}

/** Construit les lignes d'import normalisées avec contrôles. */
export function construireLignesImport(
  lignes: string[][],
  roles: RoleColonne[],
  natures: NatureDef[],
  classes: ClasseDef[],
  numerosExistants: Set<string>,
): LigneImport[] {
  const idxNum = roles.indexOf("NUMERO");
  const idxLib = roles.indexOf("INTITULE");
  const idxType = roles.indexOf("TYPE");
  const vusDansFichier = new Set<string>();
  const out: LigneImport[] = [];

  for (const ligne of lignes) {
    const brut = idxNum >= 0 ? (ligne[idxNum] ?? "") : "";
    if (brut.toString().trim() === "") continue;
    const numero = completerNumero(brut.toString());
    const intitule = (idxLib >= 0 ? ligne[idxLib] : "")?.toString().trim() || "(sans intitulé)";
    const type = lireType(idxType >= 0 ? ligne[idxType]?.toString() : undefined);

    const valide = validerNumero(numero, classes).ok;
    let controle: Controle = "ok";
    if (!valide) controle = "hors-syscohada";
    else if (numerosExistants.has(numero) || vusDansFichier.has(numero)) controle = "doublon";
    vusDansFichier.add(numero);

    const nature = detecterNature(numero, natures);
    out.push({
      numero, intitule, type,
      natureRacine: nature?.racine ?? null,
      reportNplus1: deduireReport(extraireClasse(numero)),
      controle,
    });
  }
  return out;
}
```

- [ ] **Step 4: Lancer les tests pour vérifier le succès**

Run: `npx vitest run src/lib/syscohada/import-mapping.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: mapping d'import par contenu + contrôles (doublon, hors-SYSCOHADA)"
```

---

### Task 6: Script de seed

**Files:**
- Create: `prisma/seed.ts`

- [ ] **Step 1: Écrire `prisma/seed.ts`**

```ts
import { PrismaClient } from "@prisma/client";
import {
  REFERENTIEL_CODE, REFERENTIEL_LIBELLE, CLASSES, NATURES,
  COMPTES_LES_ASSOCIES,
} from "../src/lib/syscohada/referentiel";
import { detecterNature, deduireReport, extraireClasse } from "../src/lib/syscohada/compte-logic";

const prisma = new PrismaClient();

async function main() {
  const ref = await prisma.referentiel.upsert({
    where: { code: REFERENTIEL_CODE },
    update: { libelle: REFERENTIEL_LIBELLE },
    create: { code: REFERENTIEL_CODE, libelle: REFERENTIEL_LIBELLE },
  });

  for (const c of CLASSES) {
    await prisma.classe.upsert({
      where: { referentielId_numero: { referentielId: ref.id, numero: c.numero } },
      update: { libelle: c.libelle },
      create: { numero: c.numero, libelle: c.libelle, referentielId: ref.id },
    });
  }

  for (const n of NATURES) {
    await prisma.nature.upsert({
      where: { referentielId_racine: { referentielId: ref.id, racine: n.racine } },
      update: { libelle: n.libelle, famille: n.famille, reportNplus1: n.reportNplus1 },
      create: { ...n, referentielId: ref.id },
    });
  }

  const dossier = await prisma.dossier.findFirst({ where: { nom: "Les Associés SA" } })
    ?? await prisma.dossier.create({
      data: {
        nom: "Les Associés SA", ville: "Lomé", pays: "Togo",
        devise: "XOF", exercice: 2020, referentielId: ref.id,
      },
    });

  for (const c of COMPTES_LES_ASSOCIES) {
    const nature = detecterNature(c.numero, NATURES);
    await prisma.compte.upsert({
      where: { dossierId_numero: { dossierId: dossier.id, numero: c.numero } },
      update: { intitule: c.intitule },
      create: {
        numero: c.numero, intitule: c.intitule, type: c.type,
        classeNum: extraireClasse(c.numero),
        natureRacine: nature?.racine ?? null,
        reportNplus1: deduireReport(extraireClasse(c.numero)),
        collectif: c.collectif ?? false,
        dossierId: dossier.id,
      },
    });
  }

  console.log(`Seed OK — référentiel ${ref.code}, dossier ${dossier.nom}, ${COMPTES_LES_ASSOCIES.length} comptes.`);
}

main().finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Lancer le seed**

Run: `npm run db:seed`
Expected: `Seed OK — référentiel SYSCOHADA_REVISE, dossier Les Associés SA, 16 comptes.`

- [ ] **Step 3: Vérifier les données**

Run: `npx prisma studio` (ouvrir, vérifier les tables Compte/Classe/Nature), OU :
```bash
node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.compte.count().then(n=>{console.log('comptes:',n);return p.$disconnect()})"
```
Expected: `comptes: 16`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: seed référentiel SYSCOHADA + dossier Les Associés SA"
```

---

### Task 7: Server actions — CRUD comptes (TDD)

**Files:**
- Create: `src/server/comptes.ts`, `src/server/test-helpers.ts`
- Test: `src/server/comptes.test.ts`

- [ ] **Step 1: Écrire `src/server/test-helpers.ts`**

```ts
import { prisma } from "@/lib/db";
import {
  REFERENTIEL_CODE, REFERENTIEL_LIBELLE, CLASSES, NATURES,
} from "@/lib/syscohada/referentiel";

/** Vide la base et reseed le référentiel + un dossier de test. Renvoie le dossierId. */
export async function resetDb(): Promise<string> {
  await prisma.importLog.deleteMany();
  await prisma.compte.deleteMany();
  await prisma.dossier.deleteMany();
  await prisma.nature.deleteMany();
  await prisma.classe.deleteMany();
  await prisma.referentiel.deleteMany();

  const ref = await prisma.referentiel.create({
    data: { code: REFERENTIEL_CODE, libelle: REFERENTIEL_LIBELLE },
  });
  await prisma.classe.createMany({
    data: CLASSES.map((c) => ({ ...c, referentielId: ref.id })),
  });
  await prisma.nature.createMany({
    data: NATURES.map((n) => ({ ...n, referentielId: ref.id })),
  });
  const dossier = await prisma.dossier.create({
    data: { nom: "Test SA", ville: "Lomé", pays: "Togo", devise: "XOF", exercice: 2020, referentielId: ref.id },
  });
  return dossier.id;
}
```

- [ ] **Step 2: Écrire les tests qui échouent**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { resetDb } from "./test-helpers";
import { creerCompte, listerComptes, modifierCompte, archiverCompte } from "./comptes";

let dossierId: string;
beforeEach(async () => { dossierId = await resetDb(); });

describe("creerCompte", () => {
  it("complète le n°, déduit nature et report depuis la racine", async () => {
    const c = await creerCompte({ dossierId, numeroSaisi: "401", intitule: "Fournisseur ACI" });
    expect(c.numero).toBe("401000");
    expect(c.natureRacine).toBe("40");
    expect(c.reportNplus1).toBe(false);
  });
  it("refuse un doublon", async () => {
    await creerCompte({ dossierId, numeroSaisi: "571100", intitule: "Caisse" });
    await expect(creerCompte({ dossierId, numeroSaisi: "571100", intitule: "Caisse bis" }))
      .rejects.toThrow(/existe déjà/);
  });
  it("refuse un compte hors SYSCOHADA", async () => {
    await expect(creerCompte({ dossierId, numeroSaisi: "001100", intitule: "X" }))
      .rejects.toThrow(/Classe 0/);
  });
});

describe("listerComptes", () => {
  it("ne renvoie que les comptes actifs, filtrés", async () => {
    await creerCompte({ dossierId, numeroSaisi: "411100", intitule: "Clients" });
    await creerCompte({ dossierId, numeroSaisi: "601100", intitule: "Achats marchandises" });
    const tous = await listerComptes(dossierId, {});
    expect(tous).toHaveLength(2);
    const f = await listerComptes(dossierId, { texte: "client" });
    expect(f).toHaveLength(1);
    const c4 = await listerComptes(dossierId, { classe: 6 });
    expect(c4[0].numero).toBe("601100");
  });
});

describe("archiverCompte", () => {
  it("archive sans supprimer", async () => {
    const c = await creerCompte({ dossierId, numeroSaisi: "521100", intitule: "Banque" });
    await archiverCompte(c.id);
    expect(await listerComptes(dossierId, {})).toHaveLength(0);
  });
});

describe("modifierCompte", () => {
  it("renomme librement", async () => {
    const c = await creerCompte({ dossierId, numeroSaisi: "411100", intitule: "Clients" });
    const u = await modifierCompte(c.id, { intitule: "Clients divers" });
    expect(u.intitule).toBe("Clients divers");
  });
});
```

- [ ] **Step 3: Lancer les tests pour vérifier l'échec**

Run: `npx vitest run src/server/comptes.test.ts`
Expected: FAIL (module `./comptes` introuvable).

- [ ] **Step 4: Implémenter `src/server/comptes.ts`**

```ts
"use server";

import { prisma } from "@/lib/db";
import { NATURES, CLASSES } from "@/lib/syscohada/referentiel";
import {
  completerNumero, detecterNature, deduireReport, extraireClasse, validerNumero,
} from "@/lib/syscohada/compte-logic";

export interface CreerCompteInput {
  dossierId: string;
  numeroSaisi: string;
  intitule: string;
  type?: "DETAIL" | "TOTAL";
  collectif?: boolean;
}

export async function creerCompte(input: CreerCompteInput) {
  const numero = completerNumero(input.numeroSaisi);
  const validation = validerNumero(numero, CLASSES);
  if (!validation.ok) throw new Error(validation.raison ?? "Numéro invalide.");

  const existe = await prisma.compte.findUnique({
    where: { dossierId_numero: { dossierId: input.dossierId, numero } },
  });
  if (existe) throw new Error(`Le compte ${numero} existe déjà dans ce dossier.`);

  const nature = detecterNature(numero, NATURES);
  return prisma.compte.create({
    data: {
      numero,
      intitule: input.intitule.trim() || "(sans intitulé)",
      type: input.type ?? "DETAIL",
      classeNum: extraireClasse(numero),
      natureRacine: nature?.racine ?? null,
      reportNplus1: deduireReport(extraireClasse(numero)),
      collectif: input.collectif ?? false,
      dossierId: input.dossierId,
    },
  });
}

export interface FiltreComptes { texte?: string; classe?: number; }

export async function listerComptes(dossierId: string, filtre: FiltreComptes) {
  return prisma.compte.findMany({
    where: {
      dossierId,
      statut: "ACTIF",
      ...(filtre.classe ? { classeNum: filtre.classe } : {}),
      ...(filtre.texte
        ? {
            OR: [
              { numero: { contains: filtre.texte } },
              { intitule: { contains: filtre.texte } },
            ],
          }
        : {}),
    },
    orderBy: { numero: "asc" },
  });
}

export async function modifierCompte(id: string, data: { intitule?: string; type?: "DETAIL" | "TOTAL" }) {
  return prisma.compte.update({ where: { id }, data });
}

export async function archiverCompte(id: string) {
  return prisma.compte.update({ where: { id }, data: { statut: "ARCHIVE" } });
}
```

Note : SQLite `contains` est sensible à la casse par défaut. Pour le test « client » → « Clients », normaliser : stocker la recherche en l'état et, si besoin, comparer en minuscules côté applicatif. Pour rester simple et faire passer le test, remplacer le filtre `texte` par un filtre applicatif :

```ts
// Variante robuste à la casse (remplace le bloc OR ci-dessus) :
export async function listerComptes(dossierId: string, filtre: FiltreComptes) {
  const comptes = await prisma.compte.findMany({
    where: { dossierId, statut: "ACTIF", ...(filtre.classe ? { classeNum: filtre.classe } : {}) },
    orderBy: { numero: "asc" },
  });
  if (!filtre.texte) return comptes;
  const t = filtre.texte.toLowerCase();
  return comptes.filter((c) => c.numero.includes(t) || c.intitule.toLowerCase().includes(t));
}
```
Garder **uniquement** la variante robuste à la casse.

- [ ] **Step 5: Lancer les tests pour vérifier le succès**

Run: `npx vitest run src/server/comptes.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: server actions CRUD comptes (créer/lister/modifier/archiver)"
```

---

### Task 8: Server actions — import (TDD)

**Files:**
- Create: `src/server/import.ts`
- Test: `src/server/import.test.ts`

- [ ] **Step 1: Écrire les tests qui échouent**

```ts
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
```

- [ ] **Step 2: Lancer les tests pour vérifier l'échec**

Run: `npx vitest run src/server/import.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Implémenter `src/server/import.ts`**

```ts
"use server";

import * as XLSX from "xlsx";
import { prisma } from "@/lib/db";
import { NATURES, CLASSES } from "@/lib/syscohada/referentiel";
import { detecterRolesColonnes, construireLignesImport, type LigneImport } from "@/lib/syscohada/import-mapping";

export type ModeImport = "FUSIONNER" | "REMPLACER" | "AJOUTER";

/** Parse un contenu CSV ou un buffer Excel base64 en lignes de cellules. */
function parseFichier(contenu: string): string[][] {
  // CSV brut (séparateur ; ou ,) si pas du base64 binaire
  if (contenu.includes("\n") && (contenu.includes(";") || contenu.includes(","))) {
    return contenu.trim().split(/\r?\n/).map((l) => l.split(/[;,]/).map((c) => c.trim()));
  }
  // sinon : base64 d'un classeur Excel
  const wb = XLSX.read(contenu, { type: "base64" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, raw: false, defval: "" });
}

export async function previsualiserImport(dossierId: string, fichierNom: string, contenu: string) {
  let lignes = parseFichier(contenu);
  // retirer une éventuelle ligne d'en-tête (aucune cellule numérique de compte)
  const roles0 = detecterRolesColonnes(lignes);
  const idxNum = roles0.indexOf("NUMERO");
  if (idxNum >= 0 && lignes[0] && !/^\d{2,6}$/.test((lignes[0][idxNum] ?? "").toString().trim())) {
    lignes = lignes.slice(1);
  }
  const roles = detecterRolesColonnes(lignes);
  const existants = new Set(
    (await prisma.compte.findMany({ where: { dossierId }, select: { numero: true } })).map((c) => c.numero),
  );
  const out = construireLignesImport(lignes, roles, NATURES, CLASSES, existants);
  return { fichierNom, roles, lignes: out };
}

export async function appliquerImport(
  dossierId: string, fichierNom: string, lignes: LigneImport[], mode: ModeImport,
) {
  const avant = await prisma.compte.findMany({ where: { dossierId } });
  const affectes: string[] = [];

  await prisma.$transaction(async (tx) => {
    if (mode === "REMPLACER") {
      await tx.compte.updateMany({ where: { dossierId }, data: { statut: "ARCHIVE" } });
    }
    for (const l of lignes) {
      if (l.controle === "hors-syscohada") continue;            // jamais importé
      if (l.controle === "doublon" && mode === "AJOUTER") continue; // ignoré en mode ajout
      const compte = await tx.compte.upsert({
        where: { dossierId_numero: { dossierId, numero: l.numero } },
        update: { intitule: l.intitule, type: l.type, statut: "ACTIF" },
        create: {
          numero: l.numero, intitule: l.intitule, type: l.type,
          classeNum: Number(l.numero.charAt(0)),
          natureRacine: l.natureRacine, reportNplus1: l.reportNplus1, dossierId,
        },
      });
      affectes.push(compte.id);
    }
  });

  const log = await prisma.importLog.create({
    data: {
      dossierId, fichierNom, mode,
      snapshotAvant: JSON.stringify(avant),
      compteIds: JSON.stringify(affectes),
    },
  });
  return { importLogId: log.id, nbImportes: affectes.length };
}

/** Annule un import : restaure l'état des comptes capturé avant. */
export async function annulerImport(importLogId: string): Promise<boolean> {
  const log = await prisma.importLog.findUnique({ where: { id: importLogId } });
  if (!log || log.annule) return false;
  const avant = JSON.parse(log.snapshotAvant) as Array<{ id: string }>;
  const idsAvant = new Set(avant.map((c) => c.id));
  const affectes = JSON.parse(log.compteIds) as string[];

  await prisma.$transaction(async (tx) => {
    // supprimer les comptes créés par cet import (absents de l'état d'avant)
    const aSupprimer = affectes.filter((id) => !idsAvant.has(id));
    if (aSupprimer.length) await tx.compte.deleteMany({ where: { id: { in: aSupprimer } } });
    // restaurer l'intitulé/type/statut des comptes préexistants
    for (const c of avant as Array<{ id: string; intitule: string; type: string; statut: string }>) {
      await tx.compte.update({ where: { id: c.id }, data: { intitule: c.intitule, type: c.type, statut: c.statut } }).catch(() => {});
    }
    await tx.importLog.update({ where: { id: importLogId }, data: { annule: true } });
  });
  return true;
}
```

- [ ] **Step 4: Lancer les tests pour vérifier le succès**

Run: `npx vitest run src/server/import.test.ts`
Expected: PASS.

- [ ] **Step 5: Lancer toute la suite**

Run: `npm run test`
Expected: tous les fichiers de test PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: server actions import (prévisualiser/appliquer/annuler)"
```

---

### Task 9: UI — page Plan comptable + onglet Plan

**Files:**
- Create: `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/plan-comptable/page.tsx`, `src/app/plan-comptable/PlanComptableClient.tsx`, `src/app/plan-comptable/TabPlan.tsx`

UI sobre et fonctionnelle (pas de hi-fi). CSS minimal lisible.

- [ ] **Step 1: `globals.css` (minimal)**

```css
:root { --ink:#1f2328; --muted:#6b7280; --line:#e5e7eb; --accent:#0f766e; --bg:#f8f9fa; --panel:#fff; }
* { box-sizing:border-box; }
body { margin:0; font-family:system-ui,sans-serif; color:var(--ink); background:var(--bg); }
a { color:var(--accent); }
.container { max-width:1100px; margin:0 auto; padding:24px; }
.tabs { display:flex; gap:8px; border-bottom:2px solid var(--line); margin-bottom:20px; }
.tab { padding:10px 16px; border:none; background:none; cursor:pointer; font-size:15px; border-bottom:2px solid transparent; margin-bottom:-2px; }
.tab.active { color:var(--accent); border-bottom-color:var(--accent); font-weight:600; }
.row { display:flex; gap:12px; align-items:center; }
.grow { flex:1; }
.btn { padding:8px 14px; border:1px solid var(--line); background:#fff; border-radius:8px; cursor:pointer; font-size:14px; }
.btn.primary { background:var(--accent); color:#fff; border-color:var(--accent); }
.input { padding:8px 12px; border:1px solid var(--line); border-radius:8px; font-size:14px; width:100%; }
table { width:100%; border-collapse:collapse; background:var(--panel); border:1px solid var(--line); border-radius:8px; overflow:hidden; }
th { text-align:left; font-size:12px; text-transform:uppercase; color:var(--muted); padding:10px 12px; border-bottom:1px solid var(--line); }
td { padding:10px 12px; border-bottom:1px solid var(--line); font-size:14px; }
tr:last-child td { border-bottom:none; }
.mono { font-family:ui-monospace,monospace; }
.badge { font-size:12px; padding:2px 8px; border-radius:999px; background:#eef2f1; color:var(--accent); }
.badge.warn { background:#fde8e4; color:#b3391f; }
.muted { color:var(--muted); }
.classes { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:16px; }
.chip { padding:6px 10px; border:1px solid var(--line); border-radius:8px; background:#fff; cursor:pointer; font-size:13px; }
.chip.active { background:var(--accent); color:#fff; border-color:var(--accent); }
.drawer-scrim { position:fixed; inset:0; background:rgba(0,0,0,.3); }
.drawer { position:fixed; top:0; right:0; height:100%; width:380px; background:#fff; padding:24px; box-shadow:-4px 0 20px rgba(0,0,0,.1); overflow:auto; }
.field { margin-bottom:14px; display:flex; flex-direction:column; gap:5px; }
.field label { font-size:12px; text-transform:uppercase; color:var(--muted); }
.seg { display:flex; gap:6px; }
.seg button { flex:1; padding:8px; border:1px solid var(--line); background:#fff; border-radius:8px; cursor:pointer; }
.seg button.on { background:var(--accent); color:#fff; border-color:var(--accent); }
```

- [ ] **Step 2: `layout.tsx`**

```tsx
import "./globals.css";
import type { ReactNode } from "react";

export const metadata = { title: "DaCompta — Plan comptable" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr"><body>{children}</body></html>
  );
}
```

- [ ] **Step 3: `page.tsx` (redirect)**

```tsx
import { redirect } from "next/navigation";
export default function Home() { redirect("/plan-comptable"); }
```

- [ ] **Step 4: `plan-comptable/page.tsx` (server component)**

```tsx
import { prisma } from "@/lib/db";
import { listerComptes } from "@/server/comptes";
import { CLASSES, NATURES } from "@/lib/syscohada/referentiel";
import PlanComptableClient from "./PlanComptableClient";

export default async function PlanComptablePage() {
  const dossier = await prisma.dossier.findFirstOrThrow();
  const comptes = await listerComptes(dossier.id, {});
  return (
    <div className="container">
      <h1>Plan comptable — {dossier.nom}</h1>
      <p className="muted">{dossier.ville}, {dossier.pays} · {dossier.devise} · exercice {dossier.exercice} · SYSCOHADA révisé</p>
      <PlanComptableClient
        dossierId={dossier.id}
        comptesInitiaux={comptes}
        classes={CLASSES}
        natures={NATURES}
      />
    </div>
  );
}
```

- [ ] **Step 5: `plan-comptable/PlanComptableClient.tsx`**

```tsx
"use client";
import { useState } from "react";
import type { ClasseDef, NatureDef } from "@/lib/syscohada/referentiel";
import TabPlan from "./TabPlan";
import TabNatures from "./TabNatures";
import TabImport from "./TabImport";

type Compte = Awaited<ReturnType<typeof import("@/server/comptes").listerComptes>>[number];

export default function PlanComptableClient(props: {
  dossierId: string;
  comptesInitiaux: Compte[];
  classes: ClasseDef[];
  natures: NatureDef[];
}) {
  const [onglet, setOnglet] = useState<"plan" | "natures" | "import">("plan");
  return (
    <>
      <div className="tabs">
        <button className={"tab" + (onglet === "plan" ? " active" : "")} onClick={() => setOnglet("plan")}>Plan comptable</button>
        <button className={"tab" + (onglet === "natures" ? " active" : "")} onClick={() => setOnglet("natures")}>Natures</button>
        <button className={"tab" + (onglet === "import" ? " active" : "")} onClick={() => setOnglet("import")}>Importer</button>
      </div>
      {onglet === "plan" && <TabPlan dossierId={props.dossierId} comptesInitiaux={props.comptesInitiaux} classes={props.classes} natures={props.natures} />}
      {onglet === "natures" && <TabNatures natures={props.natures} />}
      {onglet === "import" && <TabImport dossierId={props.dossierId} />}
    </>
  );
}
```

- [ ] **Step 6: `plan-comptable/TabPlan.tsx`**

```tsx
"use client";
import { useState } from "react";
import type { ClasseDef, NatureDef } from "@/lib/syscohada/referentiel";
import { listerComptes, archiverCompte } from "@/server/comptes";
import NewAccountDrawer from "./NewAccountDrawer";

type Compte = Awaited<ReturnType<typeof listerComptes>>[number];

export default function TabPlan(props: {
  dossierId: string; comptesInitiaux: Compte[]; classes: ClasseDef[]; natures: NatureDef[];
}) {
  const [comptes, setComptes] = useState<Compte[]>(props.comptesInitiaux);
  const [texte, setTexte] = useState("");
  const [classe, setClasse] = useState<number | null>(null);
  const [drawer, setDrawer] = useState(false);

  async function rafraichir(t = texte, c = classe) {
    setComptes(await listerComptes(props.dossierId, { texte: t || undefined, classe: c ?? undefined }));
  }

  return (
    <>
      <div className="classes">
        <button className={"chip" + (classe === null ? " active" : "")} onClick={() => { setClasse(null); rafraichir(texte, null); }}>Toutes</button>
        {props.classes.map((c) => (
          <button key={c.numero} className={"chip" + (classe === c.numero ? " active" : "")}
            onClick={() => { setClasse(c.numero); rafraichir(texte, c.numero); }}>
            {c.numero} · {c.libelle}
          </button>
        ))}
      </div>
      <div className="row" style={{ marginBottom: 14 }}>
        <input className="input" placeholder="Filtrer (n° ou intitulé)…" value={texte}
          onChange={(e) => { setTexte(e.target.value); rafraichir(e.target.value, classe); }} style={{ maxWidth: 360 }} />
        <div className="grow" />
        <button className="btn primary" onClick={() => setDrawer(true)}>＋ Nouveau compte</button>
      </div>
      <table>
        <thead><tr><th>N°</th><th>Intitulé</th><th>Type</th><th>Nature</th><th>Report N+1</th><th /></tr></thead>
        <tbody>
          {comptes.map((c) => (
            <tr key={c.id}>
              <td className="mono">{c.numero}</td>
              <td>{c.intitule}{c.collectif && <span className="badge" style={{ marginLeft: 8 }}>collectif</span>}</td>
              <td>{c.type === "TOTAL" ? "Σ Total" : "Détail"}</td>
              <td>{c.natureRacine ? <span className="badge">{props.natures.find((n) => n.racine === c.natureRacine)?.libelle}</span> : <span className="muted">—</span>}</td>
              <td>{c.reportNplus1 ? <span className="badge">reporté</span> : <span className="muted">remis à 0</span>}</td>
              <td><button className="btn" onClick={async () => { await archiverCompte(c.id); rafraichir(); }}>Archiver</button></td>
            </tr>
          ))}
          {comptes.length === 0 && <tr><td colSpan={6} className="muted">Aucun compte.</td></tr>}
        </tbody>
      </table>
      {drawer && (
        <NewAccountDrawer
          dossierId={props.dossierId} natures={props.natures} classes={props.classes}
          onClose={() => setDrawer(false)}
          onCreated={() => { setDrawer(false); rafraichir(); }}
        />
      )}
    </>
  );
}
```

- [ ] **Step 7: Vérification manuelle**

Run: `npm run dev`, ouvrir `http://localhost:3000`.
Expected: redirection vers `/plan-comptable` ; les 16 comptes seedés s'affichent ; le filtre texte et les puces de classe filtrent la liste ; « Archiver » retire une ligne.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: UI page Plan comptable + onglet Plan (liste/filtre/archive)"
```

---

### Task 10: UI — drawer Nouveau compte

**Files:**
- Create: `src/app/plan-comptable/NewAccountDrawer.tsx`

- [ ] **Step 1: Implémenter `NewAccountDrawer.tsx`**

```tsx
"use client";
import { useState } from "react";
import type { ClasseDef, NatureDef } from "@/lib/syscohada/referentiel";
import { completerNumero, detecterNature, deduireReport, extraireClasse, validerNumero } from "@/lib/syscohada/compte-logic";
import { creerCompte } from "@/server/comptes";

export default function NewAccountDrawer(props: {
  dossierId: string; natures: NatureDef[]; classes: ClasseDef[];
  onClose: () => void; onCreated: () => void;
}) {
  const [saisi, setSaisi] = useState("");
  const [intitule, setIntitule] = useState("");
  const [type, setType] = useState<"DETAIL" | "TOTAL">("DETAIL");
  const [erreur, setErreur] = useState<string | null>(null);

  const numero = saisi ? completerNumero(saisi) : "";
  const nature = numero ? detecterNature(numero, props.natures) : null;
  const report = numero ? deduireReport(extraireClasse(numero)) : false;
  const validation = numero ? validerNumero(numero, props.classes) : { ok: false as const };

  async function creer() {
    setErreur(null);
    try {
      await creerCompte({ dossierId: props.dossierId, numeroSaisi: saisi, intitule, type });
      props.onCreated();
    } catch (e) { setErreur(e instanceof Error ? e.message : "Erreur"); }
  }

  return (
    <>
      <div className="drawer-scrim" onClick={props.onClose} />
      <div className="drawer">
        <div className="row"><b style={{ fontSize: 18 }}>Nouveau compte</b><div className="grow" /><button className="btn" onClick={props.onClose}>✕</button></div>

        <div className="field" style={{ marginTop: 16 }}>
          <label>N° de compte</label>
          <input className="input mono" placeholder="ex. 401" value={saisi} onChange={(e) => setSaisi(e.target.value)} />
          {numero && <span className="muted">→ complété : <b className="mono">{numero}</b></span>}
        </div>

        {numero && (
          <div style={{ background: "#f1f5f4", borderRadius: 8, padding: 12, marginBottom: 14 }}>
            <div>Nature détectée : {nature ? <b>{nature.libelle}</b> : <span className="muted">non spécifiée</span>}</div>
            <div className="muted">Report N+1 : {report ? "oui (reporté)" : "non (remis à 0)"} · classe {extraireClasse(numero)}</div>
            {!validation.ok && <div className="badge warn" style={{ marginTop: 6 }}>{("raison" in validation && validation.raison) || "Numéro invalide"}</div>}
          </div>
        )}

        <div className="field">
          <label>Intitulé</label>
          <input className="input" value={intitule} onChange={(e) => setIntitule(e.target.value)} />
        </div>

        <div className="field">
          <label>Type</label>
          <div className="seg">
            <button className={type === "DETAIL" ? "on" : ""} onClick={() => setType("DETAIL")}>Détail</button>
            <button className={type === "TOTAL" ? "on" : ""} onClick={() => setType("TOTAL")}>Σ Total</button>
          </div>
        </div>

        {erreur && <div className="badge warn" style={{ marginBottom: 12 }}>{erreur}</div>}
        <button className="btn primary" style={{ width: "100%" }} disabled={!validation.ok || !intitule} onClick={creer}>Créer le compte</button>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Vérification manuelle**

Run: `npm run dev`. Ouvrir le drawer, taper `401` → voit `401000`, nature « Fournisseurs », report non. Créer → la ligne apparaît. Taper `001` → badge d'erreur, bouton désactivé. Re-taper un n° existant → erreur « existe déjà ».

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: UI drawer création de compte (complétion + nature + report en direct)"
```

---

### Task 11: UI — onglet Natures

**Files:**
- Create: `src/app/plan-comptable/TabNatures.tsx`

- [ ] **Step 1: Implémenter `TabNatures.tsx`**

```tsx
"use client";
import type { NatureDef } from "@/lib/syscohada/referentiel";

export default function TabNatures({ natures }: { natures: NatureDef[] }) {
  return (
    <>
      <p className="muted">Mapping racine → nature, déjà conforme SYSCOHADA révisé — rien à reparamétrer.</p>
      <table>
        <thead><tr><th>Racine</th><th>Nature</th><th>Famille</th><th>Report N+1</th></tr></thead>
        <tbody>
          {natures.map((n) => (
            <tr key={n.racine}>
              <td className="mono">{n.racine}</td>
              <td>{n.libelle}</td>
              <td><span className="badge">{n.famille}</span></td>
              <td>{n.reportNplus1 ? "Oui — soldes reportés" : <span className="muted">Non — remis à zéro</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
```

- [ ] **Step 2: Vérification manuelle**

Onglet « Natures » : affiche les 12 natures avec familles et report.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: UI onglet Natures (table de référence)"
```

---

### Task 12: UI — onglet Importer

**Files:**
- Create: `src/app/plan-comptable/TabImport.tsx`

- [ ] **Step 1: Implémenter `TabImport.tsx`**

```tsx
"use client";
import { useState } from "react";
import { previsualiserImport, appliquerImport, annulerImport, type ModeImport } from "@/server/import";
import type { LigneImport } from "@/lib/syscohada/import-mapping";

export default function TabImport({ dossierId }: { dossierId: string }) {
  const [nom, setNom] = useState("");
  const [lignes, setLignes] = useState<LigneImport[] | null>(null);
  const [mode, setMode] = useState<ModeImport>("FUSIONNER");
  const [logId, setLogId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function onFichier(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setNom(f.name);
    const estCsv = f.name.toLowerCase().endsWith(".csv");
    const contenu = estCsv ? await f.text() : btoa(String.fromCharCode(...new Uint8Array(await f.arrayBuffer())));
    const res = await previsualiserImport(dossierId, f.name, contenu);
    setLignes(res.lignes); setLogId(null); setMsg(null);
  }

  async function lancer() {
    if (!lignes) return;
    const res = await appliquerImport(dossierId, nom, lignes, mode);
    setLogId(res.importLogId);
    setMsg(`${res.nbImportes} comptes importés. Rechargez l'onglet Plan pour les voir.`);
  }

  async function annuler() {
    if (!logId) return;
    await annulerImport(logId);
    setMsg("Import annulé."); setLogId(null); setLignes(null);
  }

  const compteur = (c: LigneImport["controle"]) => lignes?.filter((l) => l.controle === c).length ?? 0;

  return (
    <>
      <p className="muted">Excel (.xlsx) ou CSV — déposez le fichier tel quel, l'ordre des colonnes n'a pas d'importance.</p>
      <input type="file" accept=".csv,.xlsx,.xls" onChange={onFichier} />

      {lignes && (
        <>
          <div className="row" style={{ margin: "16px 0" }}>
            <span className="badge">{lignes.length} lignes</span>
            <span className="badge">{compteur("ok")} prêtes</span>
            <span className="badge">{compteur("doublon")} doublons</span>
            <span className="badge warn">{compteur("hors-syscohada")} hors-SYSCOHADA</span>
          </div>
          <table>
            <thead><tr><th>N°</th><th>Intitulé</th><th>Type</th><th>Contrôle</th></tr></thead>
            <tbody>
              {lignes.map((l, i) => (
                <tr key={i}>
                  <td className="mono">{l.numero}</td><td>{l.intitule}</td><td>{l.type}</td>
                  <td>{l.controle === "ok" ? <span className="badge">OK</span>
                    : l.controle === "doublon" ? <span className="badge">doublon</span>
                    : <span className="badge warn">hors-SYSCOHADA</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="row" style={{ marginTop: 16 }}>
            <span>Mode :</span>
            <div className="seg" style={{ maxWidth: 360 }}>
              {(["FUSIONNER", "REMPLACER", "AJOUTER"] as ModeImport[]).map((m) => (
                <button key={m} className={mode === m ? "on" : ""} onClick={() => setMode(m)}>{m}</button>
              ))}
            </div>
            <div className="grow" />
            {!logId && <button className="btn primary" onClick={lancer}>Lancer l'import</button>}
            {logId && <button className="btn" onClick={annuler}>Annuler l'import</button>}
          </div>
        </>
      )}
      {msg && <p style={{ marginTop: 14 }}>{msg}</p>}
    </>
  );
}
```

- [ ] **Step 2: Vérification manuelle**

Créer un CSV de test `plan-test.csv` :
```
note;numero;intitule;type
x;601200;Achats matières;D
y;411100;Clients;D
z;001000;Compte interne;D
```
Importer : voir 3 lignes, compteurs (2 OK/doublon + 1 hors-SYSCOHADA), choisir un mode, lancer, puis annuler. Vérifier l'onglet Plan après rechargement.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: UI onglet Importer (upload, mapping, contrôles, modes, annulation)"
```

---

### Task 13: Vérification finale & build

- [ ] **Step 1: Suite de tests complète**

Run: `npm run test`
Expected: tous PASS.

- [ ] **Step 2: Typecheck + build de production**

Run: `npx tsc --noEmit && npm run build`
Expected: build Next.js réussi, aucune erreur de type.

- [ ] **Step 3: Reseed propre + smoke test manuel**

Run: `npm run db:push && npm run db:seed && npm run dev`
Vérifier les 4 critères de succès de la spec (plan seedé visible, création avec déduction auto + refus doublon/hors-cadre, archivage, import réversible, persistance après redémarrage).

- [ ] **Step 4: Commit final**

```bash
git add -A
git commit -m "chore: vérification finale incrément Plan comptable (tests + build)"
```

---

## Self-Review

**Spec coverage :**
- Onglet Plan (arbre classes + table + create/edit/archive) → Tasks 9, 10.
- Logique n° (complétion, nature auto, report) → Task 4 (pur) + Tasks 7/10 (appliqué).
- Onglet Natures (seedé, lecture) → Tasks 6, 11. _(Édition des bornes « avancé » explicitement optionnelle dans la spec — volontairement hors plan.)_
- Onglet Importer (upload, mapping par contenu, aperçu/contrôles, modes, réversible) → Tasks 5, 8, 12.
- Règles d'intégrité (renommage libre, unicité, archivage au lieu de suppression, validation SYSCOHADA) → Tasks 4, 7.
- Modèle de données (Dossier/Referentiel/Classe/Nature/Compte/ImportLog) → Task 2.
- Seed depuis le Référentiel SYSCOHADA → Tasks 3, 6.
- Persistance SQLite/Prisma → Tasks 1, 2.
- Critères de succès → Task 13.

**Placeholder scan :** aucun TBD/TODO ; tout le code est fourni en entier. La note du Task 7 demande de garder **uniquement** la variante de `listerComptes` robuste à la casse (lever toute ambiguïté).

**Type consistency :** `LigneImport`, `RoleColonne`, `ModeImport`, `Controle` définis en Task 5 et réutilisés tels quels en Tasks 8/12. Signatures `creerCompte/listerComptes/modifierCompte/archiverCompte` (Task 7) et `previsualiserImport/appliquerImport/annulerImport` (Task 8) identiques côté UI (Tasks 9/10/12). `detecterNature/deduireReport/extraireClasse/completerNumero/validerNumero` (Task 4) réutilisés en Tasks 5/6/7/10.
