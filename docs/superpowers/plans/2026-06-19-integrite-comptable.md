# Intégrité comptable & solidité du schéma — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre la base et la couche service incapables de représenter un état comptable invalide, et garantir la traçabilité légale des pièces (séquence sans trou, inaltérabilité par hash, correction par extourne).

**Architecture:** Approche A — invariants en fonctions **pures** dans `src/lib/comptabilite/`, appelés par les services serveur ET prouvés par tests de propriété (`fast-check`). La base garantit ce que SQLite sait faire (FK `Restrict`, `UNIQUE`, `CHECK` mono-ligne) via **migrations Prisma**.

**Tech Stack:** Next.js 15, Prisma + SQLite, Vitest, `fast-check` (déjà installé), `node:crypto` (SHA-256).

## Global Constraints

- Code et commentaires en **français**. Commits conventionnels (`feat:`/`fix:`/`test:`/`chore:`/`docs:`).
- Montants en `Prisma.Decimal` ; arrondi **selon la devise du dossier** (XOF/XAF = 0 décimale, sinon 2). Jamais de `Math.round(x*100)/100`.
- TDD strict : test rouge avant implémentation. `npx vitest run` et `npx tsc --noEmit` doivent passer avant chaque commit.
- Base de test recréée par `src/server/test-setup.ts` ; après ce plan elle utilise `prisma migrate deploy` (plus `db push`).
- Aucune création/réparation implicite de données : la migration de données est **fail-fast** (voir Tâche 11).
- Spec de référence : `docs/superpowers/specs/2026-06-19-integrite-comptable-design.md`.

---

### Task 1: Adopter les migrations Prisma (infra)

**Files:**
- Create: `prisma/migrations/0000_init/migration.sql` (généré)
- Modify: `src/server/test-setup.ts`
- Modify: `package.json` (script `db:migrate` optionnel)

**Interfaces:**
- Produces: base de test/dev provisionnée par `prisma migrate deploy`. Les tâches suivantes ajoutent des migrations incrémentales.

- [ ] **Step 1: Geler le schéma actuel en migration initiale**

Run :
```bash
npx prisma migrate dev --name init --create-only
npx prisma migrate deploy
```
Cela crée `prisma/migrations/0000_init/migration.sql` reflétant le schéma actuel sans le modifier.

- [ ] **Step 2: Basculer le setup de test sur les migrations**

Dans `src/server/test-setup.ts`, remplacer le `db push` par un reset + deploy déterministe :
```ts
import { execSync } from "node:child_process";

export default function setup() {
  // Recrée la base de test à partir des migrations (et non plus db push),
  // pour que les contraintes CHECK définies dans les migrations soient appliquées.
  execSync("npx prisma migrate reset --force --skip-generate --skip-seed", {
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
    stdio: "inherit",
  });
}
```

- [ ] **Step 3: Vérifier la suite (régression)**

Run: `npx vitest run`
Expected: PASS (92 tests) — l'infra de migration ne change aucun comportement.

- [ ] **Step 4: Commit**

```bash
git add prisma/migrations src/server/test-setup.ts package.json
git commit -m "chore(db): adopter les migrations Prisma (remplace db push)"
```

---

### Task 2: Utilitaire d'arrondi par devise

**Files:**
- Create: `src/lib/comptabilite/devise.ts`
- Test: `src/lib/comptabilite/devise.test.ts`

**Interfaces:**
- Produces:
  - `decimalesDevise(devise: string): number`
  - `arrondiDevise(montant: Prisma.Decimal, devise: string): Prisma.Decimal`
  - `estNulDevise(montant: Prisma.Decimal, devise: string): boolean`

- [ ] **Step 1: Écrire le test rouge**

```ts
import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import { decimalesDevise, arrondiDevise, estNulDevise } from "./devise";

const D = (n: number | string) => new Prisma.Decimal(n);

describe("devise", () => {
  it("FCFA (XOF/XAF) = 0 décimale, autres = 2", () => {
    expect(decimalesDevise("XOF")).toBe(0);
    expect(decimalesDevise("XAF")).toBe(0);
    expect(decimalesDevise("EUR")).toBe(2);
  });
  it("arrondit selon la devise", () => {
    expect(arrondiDevise(D("100.4"), "XOF").toString()).toBe("100");
    expect(arrondiDevise(D("100.005"), "EUR").toString()).toBe("100.01");
  });
  it("estNulDevise tolère le sous-unité de la devise", () => {
    expect(estNulDevise(D("0.4"), "XOF")).toBe(true);   // arrondi à 0 en FCFA
    expect(estNulDevise(D("0.4"), "EUR")).toBe(false);
  });
});
```

- [ ] **Step 2: Lancer → échec**

Run: `npx vitest run src/lib/comptabilite/devise.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Implémenter**

```ts
import { Prisma } from "@prisma/client";

const SANS_DECIMALE = new Set(["XOF", "XAF", "GNF", "CDF", "JPY"]);

/** Nombre de décimales significatives d'une devise. */
export function decimalesDevise(devise: string): number {
  return SANS_DECIMALE.has((devise ?? "").toUpperCase()) ? 0 : 2;
}

/** Arrondit un montant à la précision de la devise (arrondi commercial). */
export function arrondiDevise(montant: Prisma.Decimal, devise: string): Prisma.Decimal {
  return montant.toDecimalPlaces(decimalesDevise(devise), Prisma.Decimal.ROUND_HALF_UP);
}

/** Vrai si le montant est nul une fois arrondi à la précision de la devise. */
export function estNulDevise(montant: Prisma.Decimal, devise: string): boolean {
  return arrondiDevise(montant, devise).isZero();
}
```

- [ ] **Step 4: Lancer → vert**

Run: `npx vitest run src/lib/comptabilite/devise.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/comptabilite/devise.ts src/lib/comptabilite/devise.test.ts
git commit -m "feat(compta): utilitaire d'arrondi par devise"
```

---

### Task 2bis: pré-requis fast-check

**Files:** none (vérification)

- [ ] **Step 1: Vérifier que fast-check est disponible**

Run: `node -e "require('fast-check'); console.log('ok')"`
Expected: `ok` (déjà dans node_modules). Sinon : `npm i -D fast-check`.

---

### Task 3: Invariants — équilibre, signe, pièce non vide, résiduel

**Files:**
- Create: `src/lib/comptabilite/integrite.ts`
- Test: `src/lib/comptabilite/integrite.test.ts`

**Interfaces:**
- Consumes: `arrondiDevise`, `estNulDevise` (Task 2).
- Produces:
  - `class ErreurIntegrite extends Error`
  - `interface LigneMontant { debit: Prisma.Decimal | number; credit: Prisma.Decimal | number }`
  - `verifierSignesLigne(ligne: LigneMontant): void`
  - `verifierPieceNonVide(lignes: LigneMontant[]): void`
  - `verifierEquilibre(lignes: LigneMontant[], devise: string): void`
  - `verifierResiduel(amountResidual, debit, credit, sommeLettree, devise): void`

- [ ] **Step 1: Écrire les tests rouges (exemples + propriété)**

```ts
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { Prisma } from "@prisma/client";
import {
  ErreurIntegrite, verifierSignesLigne, verifierPieceNonVide,
  verifierEquilibre, verifierResiduel,
} from "./integrite";

const D = (n: number | string) => new Prisma.Decimal(n);

describe("verifierSignesLigne", () => {
  it("rejette une ligne débit ET crédit > 0", () => {
    expect(() => verifierSignesLigne({ debit: 10, credit: 5 })).toThrow(ErreurIntegrite);
  });
  it("rejette un montant négatif", () => {
    expect(() => verifierSignesLigne({ debit: -1, credit: 0 })).toThrow(ErreurIntegrite);
  });
  it("accepte une ligne débit pure", () => {
    expect(() => verifierSignesLigne({ debit: 10, credit: 0 })).not.toThrow();
  });
});

describe("verifierEquilibre (propriété)", () => {
  it("toute pièce équilibrée passe ; +1 unité casse l'équilibre", () => {
    fc.assert(fc.property(fc.array(fc.integer({ min: 1, max: 1_000_000 }), { minLength: 1, maxLength: 8 }), (montants) => {
      const total = montants.reduce((s, m) => s + m, 0);
      const lignes = [
        ...montants.map((m) => ({ debit: m, credit: 0 })),
        { debit: 0, credit: total },
      ];
      verifierEquilibre(lignes, "XOF"); // ne doit pas lever
      expect(() => verifierEquilibre([...lignes, { debit: 0, credit: 1 }], "XOF")).toThrow(ErreurIntegrite);
    }));
  });
});

describe("verifierPieceNonVide", () => {
  it("rejette une pièce sans ligne ou à zéro", () => {
    expect(() => verifierPieceNonVide([])).toThrow(ErreurIntegrite);
    expect(() => verifierPieceNonVide([{ debit: 0, credit: 0 }])).toThrow(ErreurIntegrite);
  });
});

describe("verifierResiduel", () => {
  it("résiduel = |debit−credit| − Σlettré, jamais négatif", () => {
    expect(() => verifierResiduel(D(40), D(100), D(0), D(60), "XOF")).not.toThrow();
    expect(() => verifierResiduel(D(50), D(100), D(0), D(60), "XOF")).toThrow(ErreurIntegrite); // 100-60=40≠50
    expect(() => verifierResiduel(D(0), D(100), D(0), D(150), "XOF")).toThrow(ErreurIntegrite); // sur-lettrage
  });
});
```

- [ ] **Step 2: Lancer → échec**

Run: `npx vitest run src/lib/comptabilite/integrite.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Implémenter**

```ts
import { Prisma } from "@prisma/client";
import { arrondiDevise, estNulDevise } from "./devise";

export class ErreurIntegrite extends Error {
  constructor(message: string) { super(message); this.name = "ErreurIntegrite"; }
}

export interface LigneMontant { debit: Prisma.Decimal | number; credit: Prisma.Decimal | number; }

const D = (n: Prisma.Decimal | number) => new Prisma.Decimal(n);

/** I2 — Une ligne est soit au débit, soit au crédit, jamais les deux ; montants ≥ 0. */
export function verifierSignesLigne(ligne: LigneMontant): void {
  const d = D(ligne.debit), c = D(ligne.credit);
  if (d.isNegative() || c.isNegative()) {
    throw new ErreurIntegrite("Montant négatif interdit sur une ligne d'écriture.");
  }
  if (d.greaterThan(0) && c.greaterThan(0)) {
    throw new ErreurIntegrite("Une ligne ne peut être à la fois au débit et au crédit.");
  }
}

/** I3 — La pièce a au moins une ligne et un mouvement non nul. */
export function verifierPieceNonVide(lignes: LigneMontant[]): void {
  if (lignes.length === 0) throw new ErreurIntegrite("Pièce sans ligne.");
  const total = lignes.reduce((s, l) => s.plus(D(l.debit)).plus(D(l.credit)), new Prisma.Decimal(0));
  if (total.isZero()) throw new ErreurIntegrite("Pièce sans mouvement (tous les montants sont nuls).");
}

/** I1 — Partie double : Σ débits = Σ crédits (arrondi selon la devise). */
export function verifierEquilibre(lignes: LigneMontant[], devise: string): void {
  const totalD = arrondiDevise(lignes.reduce((s, l) => s.plus(D(l.debit)), new Prisma.Decimal(0)), devise);
  const totalC = arrondiDevise(lignes.reduce((s, l) => s.plus(D(l.credit)), new Prisma.Decimal(0)), devise);
  if (!estNulDevise(totalD.minus(totalC), devise)) {
    throw new ErreurIntegrite(`Pièce déséquilibrée : débit ${totalD} ≠ crédit ${totalC}.`);
  }
}

/** I5 — amountResidual = |debit − credit| − Σ(lettré), et ≥ 0. */
export function verifierResiduel(
  amountResidual: Prisma.Decimal, debit: Prisma.Decimal, credit: Prisma.Decimal,
  sommeLettree: Prisma.Decimal, devise: string,
): void {
  if (arrondiDevise(amountResidual, devise).isNegative()) {
    throw new ErreurIntegrite("Résiduel négatif.");
  }
  const attendu = D(debit).minus(D(credit)).abs().minus(sommeLettree);
  if (!estNulDevise(D(amountResidual).minus(attendu), devise)) {
    throw new ErreurIntegrite(`Résiduel incohérent : ${amountResidual} attendu ${attendu}.`);
  }
}
```

- [ ] **Step 4: Lancer → vert** · Run: `npx vitest run src/lib/comptabilite/integrite.test.ts` · Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/comptabilite/integrite.ts src/lib/comptabilite/integrite.test.ts
git commit -m "feat(compta): invariants équilibre/signe/résiduel (fonctions pures)"
```

---

### Task 4: Invariant — lettrage valide

**Files:**
- Modify: `src/lib/comptabilite/integrite.ts`
- Test: `src/lib/comptabilite/integrite.test.ts`

**Interfaces:**
- Produces: `verifierLettrageValide(args: { compteDebit: string; compteCredit: string; dossierDebit: string; dossierCredit: string; dossierAttendu: string; sensDebitOk: boolean; sensCreditOk: boolean; montant: Prisma.Decimal; residuelDebit: Prisma.Decimal; residuelCredit: Prisma.Decimal; devise: string }): void`

- [ ] **Step 1: Test rouge**

```ts
import { verifierLettrageValide } from "./integrite";
const base = {
  compteDebit: "411000", compteCredit: "411000",
  dossierDebit: "d1", dossierCredit: "d1", dossierAttendu: "d1",
  sensDebitOk: true, sensCreditOk: true,
  montant: D(50), residuelDebit: D(100), residuelCredit: D(50), devise: "XOF",
};
describe("verifierLettrageValide", () => {
  it("accepte un lettrage cohérent", () => { expect(() => verifierLettrageValide(base)).not.toThrow(); });
  it("refuse des comptes différents", () => { expect(() => verifierLettrageValide({ ...base, compteCredit: "401000" })).toThrow(ErreurIntegrite); });
  it("refuse un dossier différent", () => { expect(() => verifierLettrageValide({ ...base, dossierCredit: "d2" })).toThrow(ErreurIntegrite); });
  it("refuse un montant > min(résiduels)", () => { expect(() => verifierLettrageValide({ ...base, montant: D(80) })).toThrow(ErreurIntegrite); });
  it("refuse un montant ≤ 0", () => { expect(() => verifierLettrageValide({ ...base, montant: D(0) })).toThrow(ErreurIntegrite); });
  it("refuse un sens incompatible", () => { expect(() => verifierLettrageValide({ ...base, sensDebitOk: false })).toThrow(ErreurIntegrite); });
});
```

- [ ] **Step 2: Lancer → échec** (fonction absente).

- [ ] **Step 3: Implémenter (ajout à integrite.ts)**

```ts
export interface LettrageArgs {
  compteDebit: string; compteCredit: string;
  dossierDebit: string; dossierCredit: string; dossierAttendu: string;
  sensDebitOk: boolean; sensCreditOk: boolean;
  montant: Prisma.Decimal; residuelDebit: Prisma.Decimal; residuelCredit: Prisma.Decimal;
  devise: string;
}

/** I4 — Conditions d'un lettrage valide entre une ligne débit et une ligne crédit. */
export function verifierLettrageValide(a: LettrageArgs): void {
  if (a.dossierDebit !== a.dossierAttendu || a.dossierCredit !== a.dossierAttendu) {
    throw new ErreurIntegrite("Les lignes n'appartiennent pas au dossier indiqué.");
  }
  if (a.compteDebit !== a.compteCredit) {
    throw new ErreurIntegrite(`Comptes différents (${a.compteDebit} ≠ ${a.compteCredit}).`);
  }
  if (!a.sensDebitOk || !a.sensCreditOk) {
    throw new ErreurIntegrite("Sens incompatible — il faut une ligne débit et une ligne crédit.");
  }
  const max = Prisma.Decimal.min(a.residuelDebit, a.residuelCredit);
  if (a.montant.lessThanOrEqualTo(0) || a.montant.greaterThan(max)) {
    throw new ErreurIntegrite(`Montant ${a.montant} invalide (résiduel disponible ${max}).`);
  }
}
```

- [ ] **Step 4: Lancer → vert.**
- [ ] **Step 5: Commit** — `git commit -m "feat(compta): invariant de lettrage valide"`

---

### Task 5: Invariant — inaltérabilité (hash + chaîne)

**Files:**
- Modify: `src/lib/comptabilite/integrite.ts`
- Test: `src/lib/comptabilite/integrite.test.ts`

**Interfaces:**
- Produces:
  - `interface PieceHashInput { dossierId: string; journalId: string; datePieceISO: string; exercice: number; numeroPiece: string; lignes: { compteNumero: string; debit: string; credit: string; ordre: number }[] }`
  - `calculerHash(piece: PieceHashInput, hashPrecedent: string | null): string`
  - `verifierChaine(pieces: (PieceHashInput & { hash: string; hashPrecedent: string | null })[]): void`

- [ ] **Step 1: Test rouge (propriété d'inaltérabilité)**

```ts
import { calculerHash, verifierChaine, type PieceHashInput } from "./integrite";

const p = (numero: string, debit: string): PieceHashInput => ({
  dossierId: "d1", journalId: "j1", datePieceISO: "2020-01-01T00:00:00.000Z",
  exercice: 2020, numeroPiece: numero,
  lignes: [
    { compteNumero: "411000", debit, credit: "0", ordre: 0 },
    { compteNumero: "707000", debit: "0", credit: debit, ordre: 1 },
  ],
});

describe("inaltérabilité", () => {
  it("hash déterministe", () => {
    expect(calculerHash(p("A/2020/0001", "100"), null)).toBe(calculerHash(p("A/2020/0001", "100"), null));
  });
  it("toute altération d'une ligne change le hash", () => {
    fc.assert(fc.property(fc.integer({ min: 1, max: 999999 }).filter((n) => n !== 100), (autre) => {
      expect(calculerHash(p("A/2020/0001", String(autre)), null)).not.toBe(calculerHash(p("A/2020/0001", "100"), null));
    }));
  });
  it("verifierChaine détecte une rupture", () => {
    const h1 = calculerHash(p("A/2020/0001", "100"), null);
    const h2 = calculerHash(p("A/2020/0002", "200"), h1);
    const chaine = [
      { ...p("A/2020/0001", "100"), hash: h1, hashPrecedent: null },
      { ...p("A/2020/0002", "200"), hash: h2, hashPrecedent: h1 },
    ];
    expect(() => verifierChaine(chaine)).not.toThrow();
    chaine[0].hash = "falsifié";
    expect(() => verifierChaine(chaine)).toThrow(ErreurIntegrite);
  });
});
```

- [ ] **Step 2: Lancer → échec.**

- [ ] **Step 3: Implémenter (ajout à integrite.ts)**

```ts
import { createHash } from "node:crypto";

export interface PieceHashInput {
  dossierId: string; journalId: string; datePieceISO: string;
  exercice: number; numeroPiece: string;
  lignes: { compteNumero: string; debit: string; credit: string; ordre: number }[];
}

/** I6 — Empreinte déterministe d'une pièce validée, chaînée à la précédente. */
export function calculerHash(piece: PieceHashInput, hashPrecedent: string | null): string {
  const lignes = [...piece.lignes].sort((a, b) => a.ordre - b.ordre)
    .map((l) => [l.ordre, l.compteNumero, l.debit, l.credit]);
  const charge = JSON.stringify({
    dossierId: piece.dossierId, journalId: piece.journalId, datePieceISO: piece.datePieceISO,
    exercice: piece.exercice, numeroPiece: piece.numeroPiece, lignes, hashPrecedent,
  });
  return createHash("sha256").update(charge).digest("hex");
}

/** Rejoue et vérifie la chaîne (pièces ordonnées par numéro de séquence). */
export function verifierChaine(
  pieces: (PieceHashInput & { hash: string; hashPrecedent: string | null })[],
): void {
  let precedent: string | null = null;
  for (const p of pieces) {
    if (p.hashPrecedent !== precedent) {
      throw new ErreurIntegrite(`Rupture de chaîne sur ${p.numeroPiece} : maillon précédent incorrect.`);
    }
    if (calculerHash(p, precedent) !== p.hash) {
      throw new ErreurIntegrite(`Pièce ${p.numeroPiece} altérée : hash non reproductible.`);
    }
    precedent = p.hash;
  }
}
```

- [ ] **Step 4: Lancer → vert.**
- [ ] **Step 5: Commit** — `git commit -m "feat(compta): inaltérabilité par chaîne de hash"`

---

### Task 6: Schéma — compteId nullable, champs légaux Piece, SequencePiece

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<ts>_integrite_ajouts/migration.sql`

**Interfaces:**
- Produces: colonnes `LigneEcriture.compteId?`, `SoldeAnterieur.compteId?`, `Piece.exercice/dateValidation/hash/hashPrecedent/extourneDeId`, modèle `SequencePiece`. **Nullable** à ce stade.

- [ ] **Step 1: Modifier `schema.prisma`**

Ajouter à `Compte` les relations inverses : `lignes LigneEcriture[]` et `soldesAnterieurs SoldeAnterieur[]`.
Sur `LigneEcriture` : `compteId String?` + `compte Compte? @relation(fields: [compteId], references: [id], onDelete: Restrict)`.
Sur `SoldeAnterieur` : idem `compteId String?` + relation.
Sur `Piece` : `exercice Int?`, `dateValidation DateTime?`, `hash String?`, `hashPrecedent String?`, `extourneDeId String?`, `extourneDe Piece? @relation("Extourne", fields: [extourneDeId], references: [id])`, `extournes Piece[] @relation("Extourne")`.
Nouveau modèle :
```prisma
model SequencePiece {
  id            String @id @default(cuid())
  dossierId     String
  journalId     String
  exercice      Int
  dernierNumero Int    @default(0)
  @@unique([dossierId, journalId, exercice])
}
```

- [ ] **Step 2: Générer la migration**

Run: `npx prisma migrate dev --name integrite_ajouts`
Expected: migration créée + appliquée ; `prisma generate` régénère le client.

- [ ] **Step 3: Vérifier la suite (rien ne consomme encore ces champs)**

Run: `npx vitest run` puis `npx tsc --noEmit`
Expected: PASS (les nouveaux champs sont nullable/optionnels).

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): champs d'intégrité (compteId, légaux pièce, SequencePiece) nullable"
```

---

### Task 7: FK appliquée — creerPiece résout compteId + seed comptes dans les tests

**Files:**
- Modify: `src/server/pieces.ts`
- Modify: `src/server/test-helpers.ts` (ajout `seedComptesStandards`)
- Modify: `src/server/pieces.test.ts`, `src/server/audit-comptable.test.ts`, `src/server/lettrage.test.ts` (seed comptes)
- Create: `prisma/migrations/<ts>_compteid_non_null/migration.sql`

**Interfaces:**
- Consumes: invariants `verifierSignesLigne`, `verifierEquilibre`, `verifierPieceNonVide` (Tasks 3).
- Produces: `seedComptesStandards(dossierId: string): Promise<void>` ; `creerPiece` exige désormais que chaque `compteNumero` corresponde à un `Compte` du dossier et pose `compteId`.

- [ ] **Step 1: Test rouge — creerPiece refuse un compte inexistant**

Dans `pieces.test.ts`, ajouter dans le `beforeEach` l'appel `await seedComptesStandards(dossierId);` PUIS le test :
```ts
it("refuse une ligne sur un compte inexistant", async () => {
  await expect(creerPiece({
    dossierId, journalId, numeroPiece: "ACH-X",
    lignes: [
      { compteNumero: "999999", libelleLigne: "Inconnu", debit: 100, credit: 0 },
      { compteNumero: "401000", libelleLigne: "Fournisseur", debit: 0, credit: 100 },
    ],
  })).rejects.toThrow(/compte.*inexistant|introuvable/i);
});
```

- [ ] **Step 2: Lancer → échec** (`seedComptesStandards` absent / pas de contrôle).

- [ ] **Step 3: Ajouter le helper de seed**

Dans `src/server/test-helpers.ts` :
```ts
const COMPTES_STD: { numero: string; intitule: string; classeNum: number }[] = [
  { numero: "101000", intitule: "Capital", classeNum: 1 },
  { numero: "162000", intitule: "Emprunts", classeNum: 1 },
  { numero: "401000", intitule: "Fournisseurs", classeNum: 4 },
  { numero: "411000", intitule: "Clients", classeNum: 4 },
  { numero: "443100", intitule: "TVA collectée", classeNum: 4 },
  { numero: "445660", intitule: "TVA déductible", classeNum: 4 },
  { numero: "521000", intitule: "Banque", classeNum: 5 },
  { numero: "601000", intitule: "Achats marchandises", classeNum: 6 },
  { numero: "605100", intitule: "Eau", classeNum: 6 },
  { numero: "605300", intitule: "Carburant", classeNum: 6 },
  { numero: "701000", intitule: "Ventes marchandises", classeNum: 7 },
  { numero: "706100", intitule: "Recette transport", classeNum: 7 },
  { numero: "707000", intitule: "Ventes", classeNum: 7 },
];
export async function seedComptesStandards(dossierId: string): Promise<void> {
  await prisma.compte.createMany({
    data: COMPTES_STD.map((c) => ({ ...c, type: "DETAIL", reportNplus1: false, dossierId })),
  });
}
```

- [ ] **Step 4: Durcir `creerPiece`**

Dans `src/server/pieces.ts`, avant la création : charger les comptes du dossier, valider les invariants, et poser `compteId`.
```ts
import { verifierEquilibre, verifierPieceNonVide, verifierSignesLigne } from "@/lib/comptabilite/integrite";
// ...
export async function creerPiece(input: CreerPieceInput) {
  const lignes = input.lignes ?? [];

  // Devise du dossier (pour l'arrondi des invariants).
  const dossier = await prisma.dossier.findUniqueOrThrow({
    where: { id: input.dossierId }, select: { devise: true },
  });

  // Invariants métier (lèvent ErreurIntegrite sinon).
  verifierPieceNonVide(lignes);
  for (const l of lignes) verifierSignesLigne(l);
  verifierEquilibre(lignes, dossier.devise);

  // Résolution stricte des comptes → compteId (FK).
  const comptes = await prisma.compte.findMany({
    where: { dossierId: input.dossierId, numero: { in: lignes.map((l) => l.compteNumero) } },
    select: { id: true, numero: true },
  });
  const parNumero = new Map(comptes.map((c) => [c.numero, c.id]));
  for (const l of lignes) {
    if (!parNumero.has(l.compteNumero)) {
      throw new Error(`Compte inexistant dans ce dossier : ${l.compteNumero}.`);
    }
  }
  // ... calcul TVA/HT/TTC inchangé ...
  return prisma.piece.create({
    data: {
      // ... champs existants ...
      lignes: {
        create: lignes.map((l, i) => ({
          compteId: parNumero.get(l.compteNumero)!,
          compteNumero: l.compteNumero,
          libelleLigne: l.libelleLigne,
          debit: D(l.debit), credit: D(l.credit), ordre: i,
          sectionAnalytique: l.sectionAnalytique ?? null,
          amountResidual: D(Math.abs(l.debit - l.credit)),
          isLettres: false,
        })),
      },
    },
    include: { lignes: { orderBy: { ordre: "asc" } } },
  });
}
```
*(La vérification d'équilibre redondante en tête de `creerPiece` remplace l'ancien `if (!totalDebit.equals(totalCredit))`.)*

- [ ] **Step 5: Seeder les comptes dans les autres suites**

Dans `audit-comptable.test.ts` et `lettrage.test.ts`, ajouter `await seedComptesStandards(dossierId);` dans le `beforeEach` (remplacer les `createMany` ad hoc de `lettrage.test.ts`). `balance.test.ts` et `budget.test.ts` ont déjà leur `seedComptes` — les laisser, ou les remplacer par `seedComptesStandards` si tous les comptes utilisés y figurent (vérifier 162000/521000/443100).

- [ ] **Step 6: Lancer → vert** · Run: `npx vitest run` · Expected: PASS (toutes suites).

- [ ] **Step 7: Rendre compteId non-nullable + FK**

Modifier `schema.prisma` : `compteId String` (sans `?`) et `compte Compte @relation(...)` (sans `?`) sur `LigneEcriture` et `SoldeAnterieur`.
Run: `npx prisma migrate dev --name compteid_non_null`
Expected: migration appliquée (base de test recréée vide → pas de données à back-filler).

- [ ] **Step 8: Lancer → vert + typecheck** · Run: `npx vitest run && npx tsc --noEmit`

- [ ] **Step 9: Commit**

```bash
git add src/server/pieces.ts src/server/test-helpers.ts src/server/*.test.ts prisma/schema.prisma prisma/migrations
git commit -m "feat(compta): FK compteId appliquée + invariants à la création des pièces"
```

---

### Task 8: Contraintes CHECK mono-ligne (migration SQL manuelle)

**Files:**
- Create: `prisma/migrations/<ts>_check_constraints/migration.sql`
- Test: `src/server/contraintes-db.test.ts`

**Interfaces:**
- Produces: la base rejette au niveau SQL les lignes invalides (signe, domaines).

> Note SQLite : on ne peut pas `ALTER ADD CONSTRAINT`. La migration **reconstruit** les tables concernées (`CREATE TABLE ..._new` avec `CHECK`, copie, drop, rename) — pattern standard SQLite. Écrire le SQL à la main dans la migration (Prisma ne génère pas les `CHECK`).

- [ ] **Step 1: Test rouge — la base refuse une ligne débit&crédit**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb, seedComptesStandards } from "./test-helpers";

let dossierId: string;
beforeEach(async () => { dossierId = await resetDb(); await seedComptesStandards(dossierId); });

describe("contraintes CHECK", () => {
  it("rejette une ligne debit>0 ET credit>0 au niveau base", async () => {
    const j = await prisma.journal.create({ data: { code: "OD", libelle: "OD", dossierId } });
    const compte = await prisma.compte.findFirstOrThrow({ where: { dossierId, numero: "411000" } });
    const piece = await prisma.piece.create({ data: { numeroPiece: "RAW-1", datePiece: new Date(), journalId: j.id, dossierId } });
    await expect(prisma.ligneEcriture.create({
      data: { pieceId: piece.id, compteId: compte.id, compteNumero: "411000", libelleLigne: "x", debit: 10, credit: 5, ordre: 0, amountResidual: 5 },
    })).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Lancer → échec** (la base accepte encore).

- [ ] **Step 3: Écrire la migration SQL (reconstruction des tables)**

`npx prisma migrate dev --create-only --name check_constraints`, puis éditer le `migration.sql` pour reconstruire chaque table avec ses `CHECK` :
```sql
-- LigneEcriture : signe + résiduel
PRAGMA foreign_keys=OFF;
CREATE TABLE "LigneEcriture_new" (
  /* … colonnes identiques … */
  CONSTRAINT "ck_ligne_debit_pos"   CHECK ("debit"  >= 0),
  CONSTRAINT "ck_ligne_credit_pos"  CHECK ("credit" >= 0),
  CONSTRAINT "ck_ligne_sens"        CHECK (NOT ("debit" > 0 AND "credit" > 0)),
  CONSTRAINT "ck_ligne_residuel"    CHECK ("amountResidual" >= 0)
);
INSERT INTO "LigneEcriture_new" SELECT * FROM "LigneEcriture";
DROP TABLE "LigneEcriture"; ALTER TABLE "LigneEcriture_new" RENAME TO "LigneEcriture";
-- Lettrage : CHECK ("montant" > 0)
-- Piece :    CHECK ("statut" IN ('BROUILLON','VALIDEE','ANNULEE'))
-- Compte :   CHECK ("statut" IN ('ACTIF','ARCHIVE')) , CHECK ("type" IN ('DETAIL','TOTAL'))
-- BudgetPoste: CHECK ("sens" IN ('P','C'))
PRAGMA foreign_keys=ON;
```
*(Reprendre la définition exacte des colonnes/index depuis la migration précédente pour chaque table reconstruite.)*
Run: `npx prisma migrate dev` (applique) puis `npx prisma migrate reset --force` côté test via la suite.

- [ ] **Step 4: Lancer → vert** · Run: `npx vitest run src/server/contraintes-db.test.ts`

- [ ] **Step 5: Commit** — `git add prisma/migrations src/server/contraintes-db.test.ts && git commit -m "feat(db): contraintes CHECK mono-ligne (signe, domaines)"`

---

### Task 9: validerPiece durci — séquence + hash + gel

**Files:**
- Modify: `src/server/pieces.ts`
- Test: `src/server/validation.test.ts`

**Interfaces:**
- Consumes: `verifierEquilibre`, `verifierPieceNonVide`, `calculerHash` (Tasks 3, 5).
- Produces: `validerPiece(id)` attribue `numeroPiece = CODE/EXERCICE/NNNN`, pose `exercice/dateValidation/hash/hashPrecedent`, `statut=VALIDEE`. `annulerPiece` refuse une pièce `VALIDEE`. Helper interne `assertModifiable(piece)`.

- [ ] **Step 1: Tests rouges**

```ts
describe("validerPiece — séquence & hash", () => {
  it("attribue un numéro CODE/EXERCICE/NNNN sans trou par journal+exercice", async () => {
    const p1 = await creerPiece({ /* ACH, datePiece 2020, équilibrée */ });
    const p2 = await creerPiece({ /* ACH, 2020 */ });
    const v1 = await validerPiece(p1.id);
    const v2 = await validerPiece(p2.id);
    expect(v1.numeroPiece).toBe("ACH/2020/0001");
    expect(v2.numeroPiece).toBe("ACH/2020/0002");
    expect(v2.hashPrecedent).toBe(v1.hash);
  });
  it("refuse de modifier/annuler une pièce validée", async () => {
    const p = await creerPiece({ /* équilibrée */ });
    await validerPiece(p.id);
    await expect(annulerPiece(p.id)).rejects.toThrow(/validée|immuable/i);
  });
});
```
*(Construire les pièces avec `seedComptesStandards` + un journal `ACH`.)*

- [ ] **Step 2: Lancer → échec.**

- [ ] **Step 3: Implémenter `validerPiece` + gel**

```ts
import { calculerHash, verifierEquilibre, verifierPieceNonVide, ErreurIntegrite } from "@/lib/comptabilite/integrite";

export async function validerPiece(id: string) {
  return prisma.$transaction(async (tx) => {
    const piece = await tx.piece.findUniqueOrThrow({
      where: { id }, include: { lignes: { orderBy: { ordre: "asc" } }, journal: true, dossier: true },
    });
    if (piece.statut !== "BROUILLON") throw new ErreurIntegrite("Seule une pièce BROUILLON peut être validée.");
    verifierPieceNonVide(piece.lignes);
    verifierEquilibre(piece.lignes, piece.dossier.devise);

    const exercice = piece.datePiece.getFullYear();

    // Compteur (dossier, journal, exercice) — incrément atomique dans la transaction.
    const seq = await tx.sequencePiece.upsert({
      where: { dossierId_journalId_exercice: { dossierId: piece.dossierId, journalId: piece.journalId, exercice } },
      update: { dernierNumero: { increment: 1 } },
      create: { dossierId: piece.dossierId, journalId: piece.journalId, exercice, dernierNumero: 1 },
    });
    const numeroPiece = `${piece.journal.code}/${exercice}/${String(seq.dernierNumero).padStart(4, "0")}`;

    // Hash chaîné : dernière pièce validée du même (journal, exercice).
    const precedente = await tx.piece.findFirst({
      where: { dossierId: piece.dossierId, journalId: piece.journalId, exercice, statut: "VALIDEE" },
      orderBy: { dateValidation: "desc" }, select: { hash: true },
    });
    const hashPrecedent = precedente?.hash ?? null;
    const hash = calculerHash({
      dossierId: piece.dossierId, journalId: piece.journalId,
      datePieceISO: piece.datePiece.toISOString(), exercice, numeroPiece,
      lignes: piece.lignes.map((l) => ({ compteNumero: l.compteNumero, debit: l.debit.toString(), credit: l.credit.toString(), ordre: l.ordre })),
    }, hashPrecedent);

    return tx.piece.update({
      where: { id },
      data: { statut: "VALIDEE", numeroPiece, exercice, dateValidation: new Date(), hash, hashPrecedent },
    });
  });
}
```
Et durcir `annulerPiece` (au début) :
```ts
const cible = await prisma.piece.findUniqueOrThrow({ where: { id }, select: { statut: true } });
if (cible.statut === "VALIDEE") {
  throw new ErreurIntegrite("Une pièce validée est immuable : utilisez l'extourne.");
}
```

- [ ] **Step 4: Lancer → vert** · Run: `npx vitest run src/server/validation.test.ts && npx vitest run`

- [ ] **Step 5: Commit** — `git commit -m "feat(compta): validerPiece — séquence légale, hash chaîné, gel des pièces validées"`

---

### Task 10: extournerPiece (contre-passation)

**Files:**
- Modify: `src/server/pieces.ts`
- Test: `src/server/extourne.test.ts`

**Interfaces:**
- Consumes: `validerPiece` (Task 9), `getBalance` (vérif test).
- Produces: `extournerPiece(id: string, dateExtourne?: Date)` → pièce d'extourne validée, `extourneDeId` posé.

- [ ] **Step 1: Tests rouges**

```ts
describe("extournerPiece", () => {
  it("crée une pièce inverse validée et remet la balance à l'identique", async () => {
    const p = await creerPiece({ /* 601000 D 1000 / 401000 C 1000, journal ACH 2020 */ });
    await validerPiece(p.id);
    const avant = await getBalance(dossierId); // après validation
    const ext = await extournerPiece(p.id);
    expect(ext.extourneDeId).toBe(p.id);
    const apres = await getBalance(dossierId);
    const solde401 = (b) => b.lignes.find((l) => l.compteNumero === "401000")?.soldeCrediteur ?? 0;
    expect(solde401(apres)).toBe(0); // l'extourne annule le mouvement d'origine
  });
  it("refuse une 2ᵉ extourne de la même pièce", async () => {
    const p = await creerPiece({ /* équilibrée */ });
    await validerPiece(p.id);
    await extournerPiece(p.id);
    await expect(extournerPiece(p.id)).rejects.toThrow(/déjà extournée/i);
  });
  it("refuse d'extourner une pièce non validée", async () => {
    const p = await creerPiece({ /* équilibrée */ });
    await expect(extournerPiece(p.id)).rejects.toThrow(/validée/i);
  });
});
```

- [ ] **Step 2: Lancer → échec.**

- [ ] **Step 3: Implémenter**

```ts
export async function extournerPiece(id: string, dateExtourne?: Date) {
  const origine = await prisma.piece.findUniqueOrThrow({
    where: { id }, include: { lignes: { orderBy: { ordre: "asc" } } },
  });
  if (origine.statut !== "VALIDEE") throw new ErreurIntegrite("Seule une pièce validée peut être extournée.");
  const dejaExtournee = await prisma.piece.findFirst({ where: { extourneDeId: id }, select: { id: true } });
  if (dejaExtournee) throw new ErreurIntegrite("Pièce déjà extournée.");

  // Brouillon inverse (debit ↔ credit), même journal, daté du jour par défaut.
  const brouillon = await prisma.piece.create({
    data: {
      numeroPiece: `EXT-${origine.id.slice(0, 8)}`,
      datePiece: dateExtourne ?? new Date(),
      journalId: origine.journalId, dossierId: origine.dossierId,
      extourneDeId: origine.id,
      lignes: {
        create: origine.lignes.map((l) => ({
          compteId: l.compteId, compteNumero: l.compteNumero,
          libelleLigne: `Extourne — ${l.libelleLigne}`,
          debit: l.credit, credit: l.debit, ordre: l.ordre,
          amountResidual: l.credit.minus(l.debit).abs(), isLettres: false,
        })),
      },
    },
  });
  return validerPiece(brouillon.id); // l'extourne reçoit son propre numéro + hash
}
```

- [ ] **Step 4: Lancer → vert** · Run: `npx vitest run src/server/extourne.test.ts && npx vitest run`

- [ ] **Step 5: Commit** — `git commit -m "feat(compta): extournerPiece (contre-passation des pièces validées)"`

---

### Task 11: Garde-fou archivage + migration de données fail-fast

**Files:**
- Modify: `src/server/comptes.ts` (garde archivage)
- Create: `src/server/migration-integrite.ts` (pré-vol + renumérotation + réconciliation)
- Test: `src/server/migration-integrite.test.ts`
- Modify: `prisma/seed.ts` (compteId + passage par validerPiece)

**Interfaces:**
- Consumes: `getBalance` (Task balance), `verifierChaine` (Task 5).
- Produces:
  - `archiverCompte(id)` refuse si le compte a des lignes.
  - `preVolMigration(dossierId): Promise<Anomalie[]>` (lecture seule).
  - `executerMigration(dossierId): Promise<{ balanceIdentique: boolean }>` (abandonne si anomalies).

- [ ] **Step 1: Tests rouges**

```ts
describe("garde archivage", () => {
  it("refuse d'archiver un compte mouvementé", async () => {
    // créer une pièce sur 601000 puis :
    const c = await prisma.compte.findFirstOrThrow({ where: { dossierId, numero: "601000" } });
    await expect(archiverCompte(c.id)).rejects.toThrow(/mouvement|écriture/i);
  });
});

describe("migration fail-fast", () => {
  it("le pré-vol détecte une pièce VALIDEE déséquilibrée et la migration avorte", async () => {
    // insérer en base brute une pièce VALIDEE déséquilibrée (contournant creerPiece)
    // … setup …
    const anomalies = await preVolMigration(dossierId);
    expect(anomalies.some((a) => a.type === "PIECE_DESEQUILIBREE")).toBe(true);
    await expect(executerMigration(dossierId)).rejects.toThrow(/pré-vol|anomalie/i);
  });
  it("sur base saine : balance identique avant/après + idempotent", async () => {
    // pièces saines validées …
    const avant = await getBalance(dossierId);
    const r1 = await executerMigration(dossierId);
    expect(r1.balanceIdentique).toBe(true);
    const r2 = await executerMigration(dossierId); // idempotent
    expect(r2.balanceIdentique).toBe(true);
    const apres = await getBalance(dossierId);
    expect(apres.totaux).toEqual(avant.totaux);
  });
});
```

- [ ] **Step 2: Lancer → échec.**

- [ ] **Step 3: Implémenter le garde archivage** (`comptes.ts`)

```ts
export async function archiverCompte(id: string) {
  const compte = await prisma.compte.findUniqueOrThrow({ where: { id }, select: { id: true } });
  const nb = await prisma.ligneEcriture.count({ where: { compteId: compte.id } });
  if (nb > 0) throw new Error("Impossible d'archiver un compte ayant des écritures.");
  return prisma.compte.update({ where: { id }, data: { statut: "ARCHIVE" } });
}
```

- [ ] **Step 4: Implémenter la migration fail-fast** (`migration-integrite.ts`)

```ts
import { prisma } from "@/lib/db";
import { getBalance } from "./balance";

export type Anomalie =
  | { type: "COMPTE_ORPHELIN"; compteNumero: string }
  | { type: "PIECE_DESEQUILIBREE"; pieceId: string }
  | { type: "LIGNE_SIGNE"; ligneId: string }
  | { type: "LETTRAGE_INTERDOSSIER"; lettrageId: string };

/** Phase 0 — pré-vol en lecture seule : remonte toutes les anomalies bloquantes. */
export async function preVolMigration(dossierId: string): Promise<Anomalie[]> {
  const anomalies: Anomalie[] = [];
  // Comptes orphelins
  const lignes = await prisma.ligneEcriture.findMany({
    where: { piece: { dossierId } }, select: { id: true, compteNumero: true, debit: true, credit: true, pieceId: true },
  });
  const numeros = [...new Set(lignes.map((l) => l.compteNumero))];
  const comptes = new Set((await prisma.compte.findMany({
    where: { dossierId, numero: { in: numeros } }, select: { numero: true },
  })).map((c) => c.numero));
  for (const n of numeros) if (!comptes.has(n)) anomalies.push({ type: "COMPTE_ORPHELIN", compteNumero: n });
  for (const l of lignes) {
    if (Number(l.debit) > 0 && Number(l.credit) > 0) anomalies.push({ type: "LIGNE_SIGNE", ligneId: l.id });
  }
  // Pièces VALIDEE déséquilibrées
  const pieces = await prisma.piece.findMany({
    where: { dossierId, statut: "VALIDEE" }, include: { lignes: true },
  });
  for (const p of pieces) {
    const d = p.lignes.reduce((s, l) => s + Number(l.debit), 0);
    const c = p.lignes.reduce((s, l) => s + Number(l.credit), 0);
    if (d !== c) anomalies.push({ type: "PIECE_DESEQUILIBREE", pieceId: p.id });
  }
  // Lettrages inter-dossier
  const lettrages = await prisma.lettrage.findMany({
    where: { dossierId }, include: { ligneDebit: { include: { piece: true } }, ligneCredit: { include: { piece: true } } },
  });
  for (const lt of lettrages) {
    if (lt.ligneDebit.piece.dossierId !== dossierId || lt.ligneCredit.piece.dossierId !== dossierId) {
      anomalies.push({ type: "LETTRAGE_INTERDOSSIER", lettrageId: lt.id });
    }
  }
  return anomalies;
}

/** Phases 2-3 — migre si et seulement si le pré-vol est vert ; réconcilie la balance. */
export async function executerMigration(dossierId: string): Promise<{ balanceIdentique: boolean }> {
  const anomalies = await preVolMigration(dossierId);
  if (anomalies.length > 0) {
    throw new Error(`Migration refusée : ${anomalies.length} anomalie(s) au pré-vol. ${JSON.stringify(anomalies)}`);
  }
  const avant = await getBalance(dossierId);
  // Renumérotation + back-fill exercice (idempotent : ne retouche pas une pièce déjà conforme).
  // … (renumérotation des VALIDEE par (journal, exercice, datePiece, createdAt), pose exercice ;
  //     BROUILLON-<id> / ANNULEE-<id> pour les autres ; en transaction) …
  const apres = await getBalance(dossierId);
  const balanceIdentique =
    apres.totaux.debit === avant.totaux.debit && apres.totaux.credit === avant.totaux.credit;
  if (!balanceIdentique) throw new Error("Réconciliation échouée : la balance a changé après migration.");
  return { balanceIdentique };
}
```
*(Compléter la renumérotation en transaction — réutiliser la logique de séquence/hash de `validerPiece`.)*

- [ ] **Step 5: Mettre à jour `prisma/seed.ts`**

Le seed doit créer les comptes AVANT les pièces, passer par `creerPiece` (qui pose `compteId`) puis `validerPiece` pour les pièces validées. Vérifier que `npx prisma db seed` (sur dev.db) passe.

- [ ] **Step 6: Lancer → vert** · Run: `npx vitest run && npx tsc --noEmit`

- [ ] **Step 7: Commit**

```bash
git add src/server/comptes.ts src/server/migration-integrite.ts src/server/migration-integrite.test.ts prisma/seed.ts
git commit -m "feat(compta): garde archivage + migration de données fail-fast"
```

---

### Task 12: Vérification finale & mise à jour doc

**Files:**
- Modify: `CLAUDE.md` (nombre de tests, mention intégrité)
- Modify: `docs/DETTE-COMPTABLE.md` (marquer #4/#10 traités)

- [ ] **Step 1: Suite complète + typecheck + build**

Run: `npx vitest run && npx tsc --noEmit && npm run build`
Expected: tout vert.

- [ ] **Step 2: Audit d'inaltérabilité de bout en bout**

Écrire un test d'intégration : créer plusieurs pièces validées, lancer `verifierChaine` sur chaque (journal, exercice) → aucune rupture.

- [ ] **Step 3: Mettre à jour la doc**

`CLAUDE.md` : corriger le nombre de tests, citer le module `src/lib/comptabilite/integrite.ts`. `docs/DETTE-COMPTABLE.md` : marquer #4 et #10 comme traités, renvoyer vers le spec.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md docs/DETTE-COMPTABLE.md src/server/*.test.ts
git commit -m "docs: intégrité comptable traitée (#4/#10) + audit d'inaltérabilité"
```

---

## Notes de séquencement & dépendances

- Tasks 2→5 (lib pure) sont indépendantes du schéma → réalisables d'abord, sans risque.
- Task 1 (migrations) est un pré-requis pour 6, 7, 8.
- Task 7 est le point sensible (FK + refonte des seeds de test) : à reviewer avec soin.
- Task 8 (CHECK) implique du SQL SQLite manuel (reconstruction de tables) — pas d'auto-génération Prisma.
- Tasks 9, 10 dépendent des invariants (3, 5) et du schéma légal (6).
- Task 11 (migration de données) réutilise la séquence/hash de Task 9.
