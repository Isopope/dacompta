# Tableau de bord cockpit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer la grille plate de l'accueil par un cockpit qui agrège le travail du dossier courant (KPIs + à contrôler / à lettrer / à déclarer + prochaine action) et une vue portefeuille multi-dossier légère.

**Architecture:** Une logique pure « prochaine action » dans `src/lib/cockpit/` (testable hors DB). Deux agrégateurs serveur dans `src/server/` composant des fonctions existantes (`getDashboardStats`, `getOpenLines`, `getDeclarationTVA`, `listerDossiers`). La page d'accueil (Server Component) les consomme et rend le cockpit dans `<Shell>`, avec un composant client `MesDossiers` pour le bouton « Ouvrir ».

**Tech Stack:** Next.js 16 (App Router, Server Components, server actions), React 19, Prisma 6, vitest + jsdom, TypeScript.

## Global Constraints

- Aucune modification du schéma Prisma ni des URLs existantes.
- Pas d'OCR / IA / inbox / moteur d'échéances (hors périmètre — vision « Ma journée »).
- Un module `"use server"` ne peut exporter QUE des fonctions async ; toute logique pure/synchrone vit hors d'un tel module.
- Style : chrome existant de l'app (classes `.panel`, `.muted`, `.mono`, variables CSS `--accent`/`--panel`/`--line`). Montants formatés `toLocaleString("fr-FR")` + devise du dossier.
- Pattern page de module : envelopper dans `<Shell breadcrumb={...}>`, lire le dossier via `getDossierIdCookie()`, contenu du dossier courant sous garde `dossier &&`.
- Tests serveur : runner vitest, helpers `resetDb()` / `seedComptesStandards()` de `src/server/test-helpers.ts`. `resetDb()` crée un dossier (XOF, Lomé) et renvoie son id.
- Fait notable : `creerPiece` initialise `amountResidual = |débit − crédit|` sur CHAQUE ligne ; `getOpenLines` renvoie toute ligne non annulée à résiduel > 0 (brouillons inclus). Le cockpit reflète cette file telle quelle, sans la redéfinir.

---

### Task 1 : Logique pure « prochaine action »

**Files:**
- Create: `src/lib/cockpit/prochaine-action.ts`
- Test: `src/lib/cockpit/prochaine-action.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces:
  - `interface ProchaineAction { libelle: string; href: string; raison: "brouillons" | "lettrage" | "tva"; }`
  - `interface EtatActionnable { nbBrouillons: number; nbALettrer: number; netteDue: number; }`
  - `function prochaineActionDe(e: EtatActionnable): ProchaineAction | null`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
// src/lib/cockpit/prochaine-action.test.ts
import { describe, it, expect } from "vitest";
import { prochaineActionDe } from "./prochaine-action";

describe("prochaineActionDe", () => {
  it("priorise les brouillons à valider", () => {
    const a = prochaineActionDe({ nbBrouillons: 3, nbALettrer: 5, netteDue: 100 });
    expect(a).toEqual({ libelle: "Valider 3 pièce(s) en brouillon", href: "/ecritures", raison: "brouillons" });
  });

  it("propose le lettrage quand il n'y a plus de brouillon", () => {
    const a = prochaineActionDe({ nbBrouillons: 0, nbALettrer: 5, netteDue: 100 });
    expect(a).toEqual({ libelle: "Lettrer 5 ligne(s) de tiers", href: "/lettrage", raison: "lettrage" });
  });

  it("propose la déclaration de TVA quand brouillons et lettrage sont à zéro et la TVA est due", () => {
    const a = prochaineActionDe({ nbBrouillons: 0, nbALettrer: 0, netteDue: 100 });
    expect(a).toEqual({ libelle: "Déclarer la TVA", href: "/etats/tva", raison: "tva" });
  });

  it("ne propose pas la TVA si elle n'est pas due (crédit ou zéro)", () => {
    expect(prochaineActionDe({ nbBrouillons: 0, nbALettrer: 0, netteDue: 0 })).toBeNull();
    expect(prochaineActionDe({ nbBrouillons: 0, nbALettrer: 0, netteDue: -50 })).toBeNull();
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `cd "C:/Polytech DI/Semestre 10/dacompte" && npx vitest run src/lib/cockpit/prochaine-action.test.ts`
Expected: FAIL — `Failed to resolve import "./prochaine-action"`.

- [ ] **Step 3: Écrire l'implémentation minimale**

```ts
// src/lib/cockpit/prochaine-action.ts
// Logique PURE (hors DB, hors "use server") : déterminer l'action la plus urgente
// à partir de compteurs déjà calculés. Premier critère non vide gagne.

export interface ProchaineAction {
  libelle: string;
  href: string;
  raison: "brouillons" | "lettrage" | "tva";
}

export interface EtatActionnable {
  nbBrouillons: number;
  nbALettrer: number;
  netteDue: number;
}

export function prochaineActionDe(e: EtatActionnable): ProchaineAction | null {
  if (e.nbBrouillons > 0) {
    return { libelle: `Valider ${e.nbBrouillons} pièce(s) en brouillon`, href: "/ecritures", raison: "brouillons" };
  }
  if (e.nbALettrer > 0) {
    return { libelle: `Lettrer ${e.nbALettrer} ligne(s) de tiers`, href: "/lettrage", raison: "lettrage" };
  }
  if (e.netteDue > 0) {
    return { libelle: "Déclarer la TVA", href: "/etats/tva", raison: "tva" };
  }
  return null;
}
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `cd "C:/Polytech DI/Semestre 10/dacompte" && npx vitest run src/lib/cockpit/prochaine-action.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/cockpit/prochaine-action.ts src/lib/cockpit/prochaine-action.test.ts
git commit -m "feat(cockpit): logique pure prochaine action + tests"
```

---

### Task 2 : Agrégateur `getCockpit`

**Files:**
- Create: `src/server/cockpit.ts`
- Test: `src/server/cockpit.test.ts`

**Interfaces:**
- Consumes:
  - `prochaineActionDe`, `ProchaineAction` de `@/lib/cockpit/prochaine-action` (Task 1).
  - `getDashboardStats(dossierId)` de `./dashboard` → `{ kpis: KpisGlobaux, journaux: CarteJournal[] }`.
  - `getOpenLines(dossierId)` de `./lettrage` → `OpenLineDTO[]`.
  - `getDeclarationTVA(dossierId)` de `./taxes` → `{ collectee, deductible, netteDue }`.
- Produces:
  - `interface FileCount { count: number; href: string; }`
  - `interface FileTva { netteDue: number; href: string; }`
  - `interface Cockpit { kpis: KpisGlobaux; journaux: CarteJournal[]; aControler: FileCount; aLettrer: FileCount; aDeclarer: FileTva; prochaineAction: ProchaineAction | null; }`
  - `function getCockpit(dossierId: string): Promise<Cockpit>`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
// src/server/cockpit.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb, seedComptesStandards } from "./test-helpers";
import { creerPiece, validerPiece } from "./pieces";
import { creerTaxe } from "./taxes";
import { getOpenLines } from "./lettrage";
import { getCockpit } from "./cockpit";

let dossierId: string;
let achId: string;
let vtId: string;

beforeEach(async () => {
  dossierId = await resetDb();
  await seedComptesStandards(dossierId); // 401000,411000,443100,521000,601000,701000…
  achId = (await prisma.journal.create({ data: { code: "ACH", libelle: "Achats", dossierId } })).id;
  vtId = (await prisma.journal.create({ data: { code: "VT", libelle: "Ventes", dossierId } })).id;

  // 1) Achat resté en BROUILLON (charge 500) → nbBrouillons = 1.
  await creerPiece({
    dossierId, journalId: achId, numeroPiece: "ACH-001", datePiece: new Date("2020-01-05"),
    lignes: [
      { compteNumero: "601000", libelleLigne: "Achat", debit: 500, credit: 0 },
      { compteNumero: "401000", libelleLigne: "Fournisseur", debit: 0, credit: 500 },
    ],
  });

  // 2) Vente VALIDÉE avec TVA collectée 180 (taxe de vente sur compte 443100).
  await creerTaxe({ dossierId, code: "TVA18", nom: "TVA 18%", taux: 18, usage: "sale", compteNumero: "443100" });
  const taxe = await prisma.taxe.findFirstOrThrow({ where: { dossierId, code: "TVA18" } });
  const vente = await creerPiece({
    dossierId, journalId: vtId, numeroPiece: "VT-001", datePiece: new Date("2020-01-10"),
    lignes: [
      { compteNumero: "411000", libelleLigne: "Client", debit: 1180, credit: 0 },
      { compteNumero: "701000", libelleLigne: "Vente HT", debit: 0, credit: 1000 },
      { compteNumero: "443100", libelleLigne: "TVA collectée", debit: 0, credit: 180, taxeId: taxe.id },
    ],
  });
  await validerPiece(vente.id);
});

describe("getCockpit", () => {
  it("expose les KPIs de getDashboardStats", async () => {
    const c = await getCockpit(dossierId);
    expect(c.kpis.nbBrouillons).toBe(1);
    expect(c.kpis.nbPieces).toBe(2);
    expect(c.journaux.map((j) => j.code)).toEqual(["ACH", "VT"]);
  });

  it("branche la file 'à contrôler' sur le nombre de brouillons", () => {
    return getCockpit(dossierId).then((c) => {
      expect(c.aControler).toEqual({ count: 1, href: "/ecritures" });
    });
  });

  it("branche la file 'à lettrer' sur getOpenLines", async () => {
    const c = await getCockpit(dossierId);
    const attendu = (await getOpenLines(dossierId)).length;
    expect(c.aLettrer).toEqual({ count: attendu, href: "/lettrage" });
    expect(c.aLettrer.count).toBeGreaterThan(0);
  });

  it("branche la file 'à déclarer' sur la TVA nette due", async () => {
    const c = await getCockpit(dossierId);
    expect(c.aDeclarer).toEqual({ netteDue: 180, href: "/etats/tva" });
  });

  it("recommande de valider les brouillons en priorité", async () => {
    const c = await getCockpit(dossierId);
    expect(c.prochaineAction).toEqual({ libelle: "Valider 1 pièce(s) en brouillon", href: "/ecritures", raison: "brouillons" });
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `cd "C:/Polytech DI/Semestre 10/dacompte" && npx vitest run src/server/cockpit.test.ts`
Expected: FAIL — `Failed to resolve import "./cockpit"`.

- [ ] **Step 3: Écrire l'implémentation minimale**

```ts
// src/server/cockpit.ts
"use server";

import { getDashboardStats, type KpisGlobaux, type CarteJournal } from "./dashboard";
import { getOpenLines } from "./lettrage";
import { getDeclarationTVA } from "./taxes";
import { prochaineActionDe, type ProchaineAction } from "@/lib/cockpit/prochaine-action";

export interface FileCount {
  count: number;
  href: string;
}
export interface FileTva {
  netteDue: number;
  href: string;
}
export interface Cockpit {
  kpis: KpisGlobaux;
  journaux: CarteJournal[];
  aControler: FileCount;
  aLettrer: FileCount;
  aDeclarer: FileTva;
  prochaineAction: ProchaineAction | null;
}

/**
 * État du cockpit pour le dossier courant : KPIs + cartes journaux (via
 * getDashboardStats) + 3 files actionnables dérivées des données existantes
 * + l'action recommandée. Ne stocke rien : tout est calculé en temps réel.
 */
export async function getCockpit(dossierId: string): Promise<Cockpit> {
  const [stats, openLines, tva] = await Promise.all([
    getDashboardStats(dossierId),
    getOpenLines(dossierId),
    getDeclarationTVA(dossierId),
  ]);

  const aControler: FileCount = { count: stats.kpis.nbBrouillons, href: "/ecritures" };
  const aLettrer: FileCount = { count: openLines.length, href: "/lettrage" };
  const aDeclarer: FileTva = { netteDue: tva.netteDue, href: "/etats/tva" };

  const prochaineAction = prochaineActionDe({
    nbBrouillons: aControler.count,
    nbALettrer: aLettrer.count,
    netteDue: aDeclarer.netteDue,
  });

  return { kpis: stats.kpis, journaux: stats.journaux, aControler, aLettrer, aDeclarer, prochaineAction };
}
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `cd "C:/Polytech DI/Semestre 10/dacompte" && npx vitest run src/server/cockpit.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/server/cockpit.ts src/server/cockpit.test.ts
git commit -m "feat(cockpit): agrégateur getCockpit (KPIs + files actionnables)"
```

---

### Task 3 : Agrégateur portefeuille `getPortefeuille`

**Files:**
- Create: `src/server/portefeuille.ts`
- Test: `src/server/portefeuille.test.ts`

**Interfaces:**
- Consumes:
  - `listerDossiers()` de `./dossiers` → `{ id: string; nom: string }[]`.
  - `getOpenLines(dossierId)` de `./lettrage`, `getDeclarationTVA(dossierId)` de `./taxes`, `prisma`.
- Produces:
  - `interface ResumeDossier { id: string; nom: string; nbBrouillons: number; nbALettrer: number; tvaDue: number; }`
  - `function getPortefeuille(): Promise<ResumeDossier[]>`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
// src/server/portefeuille.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb, seedComptesStandards } from "./test-helpers";
import { creerPiece } from "./pieces";
import { getPortefeuille } from "./portefeuille";

let dossierA: string;
let dossierB: string;

beforeEach(async () => {
  // resetDb crée le dossier A + le référentiel ; on ajoute un dossier B partageant le référentiel.
  dossierA = await resetDb();
  await seedComptesStandards(dossierA);
  const ref = await prisma.referentiel.findFirstOrThrow();
  dossierB = (
    await prisma.dossier.create({
      data: { nom: "Beta SARL", ville: "Abidjan", pays: "Côte d'Ivoire", devise: "XOF", exercice: 2020, referentielId: ref.id },
    })
  ).id;
  await seedComptesStandards(dossierB);

  const jA = (await prisma.journal.create({ data: { code: "ACH", libelle: "Achats", dossierId: dossierA } })).id;
  const jB = (await prisma.journal.create({ data: { code: "ACH", libelle: "Achats", dossierId: dossierB } })).id;

  // Dossier A : 2 brouillons.
  for (const n of ["A-1", "A-2"]) {
    await creerPiece({
      dossierId: dossierA, journalId: jA, numeroPiece: n, datePiece: new Date("2020-01-05"),
      lignes: [
        { compteNumero: "601000", libelleLigne: "Achat", debit: 100, credit: 0 },
        { compteNumero: "401000", libelleLigne: "Fournisseur", debit: 0, credit: 100 },
      ],
    });
  }
  // Dossier B : 1 brouillon.
  await creerPiece({
    dossierId: dossierB, journalId: jB, numeroPiece: "B-1", datePiece: new Date("2020-01-05"),
    lignes: [
      { compteNumero: "601000", libelleLigne: "Achat", debit: 100, credit: 0 },
      { compteNumero: "401000", libelleLigne: "Fournisseur", debit: 0, credit: 100 },
    ],
  });
});

describe("getPortefeuille", () => {
  it("retourne un résumé par dossier", async () => {
    const p = await getPortefeuille();
    expect(p.map((r) => r.nom).sort()).toEqual(["Beta SARL", "Test SA"]);
  });

  it("compte les brouillons par dossier sans fuite entre dossiers", async () => {
    const p = await getPortefeuille();
    const a = p.find((r) => r.id === dossierA)!;
    const b = p.find((r) => r.id === dossierB)!;
    expect(a.nbBrouillons).toBe(2);
    expect(b.nbBrouillons).toBe(1);
  });

  it("isole les lignes à lettrer par dossier", async () => {
    const p = await getPortefeuille();
    const a = p.find((r) => r.id === dossierA)!;
    const b = p.find((r) => r.id === dossierB)!;
    // A a 2 pièces × 2 lignes ouvertes = 4 ; B a 1 pièce × 2 lignes = 2.
    expect(a.nbALettrer).toBe(4);
    expect(b.nbALettrer).toBe(2);
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `cd "C:/Polytech DI/Semestre 10/dacompte" && npx vitest run src/server/portefeuille.test.ts`
Expected: FAIL — `Failed to resolve import "./portefeuille"`.

- [ ] **Step 3: Écrire l'implémentation minimale**

```ts
// src/server/portefeuille.ts
"use server";

import { prisma } from "@/lib/db";
import { listerDossiers } from "./dossiers";
import { getOpenLines } from "./lettrage";
import { getDeclarationTVA } from "./taxes";

export interface ResumeDossier {
  id: string;
  nom: string;
  nbBrouillons: number;
  nbALettrer: number;
  tvaDue: number;
}

/**
 * Vue portefeuille multi-dossier : pour chaque dossier, des compteurs LÉGERS
 * (brouillons, lignes à lettrer, TVA nette due). Volontairement sans balance
 * complète par dossier pour rester rapide sur un cabinet de plusieurs dossiers.
 */
export async function getPortefeuille(): Promise<ResumeDossier[]> {
  const dossiers = await listerDossiers();
  return Promise.all(
    dossiers.map(async (d) => {
      const [nbBrouillons, openLines, tva] = await Promise.all([
        prisma.piece.count({ where: { dossierId: d.id, statut: "BROUILLON" } }),
        getOpenLines(d.id),
        getDeclarationTVA(d.id),
      ]);
      return { id: d.id, nom: d.nom, nbBrouillons, nbALettrer: openLines.length, tvaDue: tva.netteDue };
    })
  );
}
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `cd "C:/Polytech DI/Semestre 10/dacompte" && npx vitest run src/server/portefeuille.test.ts`
Expected: PASS (3 tests). Si `nbALettrer` diffère, ajuster l'attendu au nombre réel de lignes ouvertes (chaque ligne non lettrée à résiduel > 0 compte) — la sémantique vient de `getOpenLines`, source de vérité du module Lettrage.

- [ ] **Step 5: Commit**

```bash
git add src/server/portefeuille.ts src/server/portefeuille.test.ts
git commit -m "feat(cockpit): getPortefeuille (résumé multi-dossier léger)"
```

---

### Task 4 : Composant client `MesDossiers`

**Files:**
- Create: `src/app/MesDossiers.tsx`

**Interfaces:**
- Consumes:
  - `ResumeDossier` de `@/server/portefeuille` (Task 3).
  - `choisirDossier(id)` de `@/server/dossiers` (server action existante : pose le cookie `dossierId`).
- Produces:
  - `function MesDossiers({ dossiers, courantId }: { dossiers: ResumeDossier[]; courantId: string | null }): JSX.Element`

Pas de test unitaire (cohérent avec l'app : aucun test de composant de page). Vérification = typecheck + lint.

- [ ] **Step 1: Écrire le composant**

```tsx
// src/app/MesDossiers.tsx
"use client";
// Table portefeuille « Mes dossiers » : compteurs par dossier + bouton « Ouvrir »
// qui bascule le dossier courant (cookie) puis rafraîchit la page.
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { choisirDossier } from "@/server/dossiers";
import type { ResumeDossier } from "@/server/portefeuille";

export function MesDossiers({
  dossiers,
  courantId,
}: {
  dossiers: ResumeDossier[];
  courantId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function ouvrir(id: string) {
    startTransition(async () => {
      await choisirDossier(id);
      router.refresh();
    });
  }

  return (
    <section style={{ marginTop: 32 }}>
      <h2 style={{ fontSize: 16, marginBottom: 8 }}>Mes dossiers</h2>
      {dossiers.length === 0 ? (
        <p className="muted">Aucun dossier. Créez-en un pour commencer.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 8 }}>Société</th>
                <th style={{ textAlign: "right", padding: 8 }}>Brouillons</th>
                <th style={{ textAlign: "right", padding: 8 }}>À lettrer</th>
                <th style={{ textAlign: "right", padding: 8 }}>TVA due</th>
                <th style={{ padding: 8 }}></th>
              </tr>
            </thead>
            <tbody>
              {dossiers.map((d) => (
                <tr key={d.id} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={{ padding: 8 }}>
                    {d.nom}
                    {d.id === courantId && <span className="chip" style={{ marginLeft: 8 }}>courant</span>}
                  </td>
                  <td style={{ padding: 8, textAlign: "right" }} className="mono">{d.nbBrouillons}</td>
                  <td style={{ padding: 8, textAlign: "right" }} className="mono">{d.nbALettrer}</td>
                  <td style={{ padding: 8, textAlign: "right" }} className="mono">{d.tvaDue.toLocaleString("fr-FR")}</td>
                  <td style={{ padding: 8, textAlign: "right" }}>
                    <button onClick={() => ouvrir(d.id)} disabled={pending || d.id === courantId}>
                      Ouvrir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd "C:/Polytech DI/Semestre 10/dacompte" && npx tsc --noEmit`
Expected: aucune erreur (exit 0).

- [ ] **Step 3: Lint**

Run: `cd "C:/Polytech DI/Semestre 10/dacompte" && npx eslint src/app/MesDossiers.tsx`
Expected: aucune erreur (exit 0).

- [ ] **Step 4: Commit**

```bash
git add src/app/MesDossiers.tsx
git commit -m "feat(cockpit): composant client MesDossiers (portefeuille + Ouvrir)"
```

---

### Task 5 : Slot `horsGarde` du Shell + page d'accueil cockpit

**Files:**
- Modify: `src/components/Shell.tsx`
- Modify: `src/app/page.tsx` (réécriture complète)

**Interfaces:**
- Consumes:
  - `getCockpit(dossierId)` de `@/server/cockpit` (Task 2), `getPortefeuille()` de `@/server/portefeuille` (Task 3), `MesDossiers` de `./MesDossiers` (Task 4).
  - `Shell`, `getDossierIdCookie`, `prisma`.
- Produces: la page d'accueil (`/`) rendue comme cockpit. Pas de nouvelle interface exportée.

Rappel `Shell` actuel : `<main>{!courant ? <EcranAucunDossier/> : children}</main>` — les enfants ne s'affichent QUE si un dossier est courant. Pour afficher « Mes dossiers » même sans dossier courant (sa vocation de point d'entrée), on ajoute un slot optionnel `horsGarde` rendu dans tous les cas.

- [ ] **Step 1: Ajouter le slot `horsGarde` au Shell**

Modifier la signature et le rendu du `main`. Dans `src/components/Shell.tsx`, remplacer le bloc de props :

```tsx
export async function Shell({
  breadcrumb,
  action,
  children,
}: {
  module?: string;
  breadcrumb: { label: string; href?: string }[];
  action?: ReactNode;
  children: ReactNode;
}) {
```

par :

```tsx
export async function Shell({
  breadcrumb,
  action,
  children,
  horsGarde,
}: {
  module?: string;
  breadcrumb: { label: string; href?: string }[];
  action?: ReactNode;
  children: ReactNode;
  // Contenu rendu dans TOUS les cas, même sans dossier courant (ex. « Mes dossiers »,
  // qui sert justement à choisir un dossier). Rendu sous le contenu gardé.
  horsGarde?: ReactNode;
}) {
```

Puis remplacer la ligne du `main` :

```tsx
        <main className="container">{!courant ? <EcranAucunDossier /> : children}</main>
```

par :

```tsx
        <main className="container">
          {!courant ? <EcranAucunDossier /> : children}
          {horsGarde}
        </main>
```

- [ ] **Step 2: Réécrire la page d'accueil en cockpit**

Remplacer intégralement `src/app/page.tsx` par :

```tsx
// Tableau de bord cockpit — point d'entrée : KPIs + files actionnables du dossier
// courant + prochaine action, et une vue portefeuille multi-dossier.
import Link from "next/link";
import { Shell } from "@/components/Shell";
import { prisma } from "@/lib/db";
import { getDossierIdCookie } from "@/lib/dossier-context";
import { getCockpit } from "@/server/cockpit";
import { getPortefeuille } from "@/server/portefeuille";
import { MesDossiers } from "./MesDossiers";

// Chiffres déduits d'une base vivante : rendu dynamique, jamais figé au build.
export const dynamic = "force-dynamic";

export default async function Page() {
  const dossierId = await getDossierIdCookie();
  const dossier = dossierId
    ? await prisma.dossier.findUnique({ where: { id: dossierId } })
    : null;

  // Cockpit du dossier courant (si présent) + portefeuille (toujours).
  const [cockpit, portefeuille] = await Promise.all([
    dossier ? getCockpit(dossier.id) : Promise.resolve(null),
    getPortefeuille(),
  ]);

  const fmt = (n: number) => n.toLocaleString("fr-FR");
  const devise = dossier?.devise ?? "";

  return (
    <Shell
      breadcrumb={[{ label: "Tableau de bord" }]}
      horsGarde={<MesDossiers dossiers={portefeuille} courantId={dossierId} />}
    >
      {cockpit && dossier && (
        <>
          {/* Zone 1 — actions primaires */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <Link href="/ecritures" className="panel" style={{ padding: "8px 14px", textDecoration: "none", color: "inherit", fontWeight: 700 }}>
              + Saisir une pièce
            </Link>
            <Link href="/ventes/factures/nouvelle" className="panel" style={{ padding: "8px 14px", textDecoration: "none", color: "inherit" }}>
              Nouvelle facture
            </Link>
          </div>

          {/* Zone 2 — prochaine action + files à traiter */}
          {cockpit.prochaineAction ? (
            <Link
              href={cockpit.prochaineAction.href}
              className="panel"
              style={{ display: "block", padding: 16, marginBottom: 12, borderLeft: "3px solid var(--accent)", textDecoration: "none", color: "inherit" }}
            >
              <span className="muted" style={{ fontSize: 12 }}>Prochaine action</span>
              <div style={{ fontWeight: 700 }}>{cockpit.prochaineAction.libelle} →</div>
            </Link>
          ) : (
            <div className="panel" style={{ padding: 16, marginBottom: 12 }}>
              <span className="muted">Rien d'urgent.</span>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12, marginBottom: 24 }}>
            <Link href={cockpit.aControler.href} className="panel" style={{ padding: 16, textDecoration: "none", color: "inherit" }}>
              <div className="muted" style={{ fontSize: 12 }}>À contrôler</div>
              <div className="mono" style={{ fontSize: 24 }}>{cockpit.aControler.count}</div>
              <div className="muted" style={{ fontSize: 12 }}>pièces en brouillon</div>
            </Link>
            <Link href={cockpit.aLettrer.href} className="panel" style={{ padding: 16, textDecoration: "none", color: "inherit" }}>
              <div className="muted" style={{ fontSize: 12 }}>À lettrer</div>
              <div className="mono" style={{ fontSize: 24 }}>{cockpit.aLettrer.count}</div>
              <div className="muted" style={{ fontSize: 12 }}>lignes ouvertes</div>
            </Link>
            <Link href={cockpit.aDeclarer.href} className="panel" style={{ padding: 16, textDecoration: "none", color: "inherit" }}>
              <div className="muted" style={{ fontSize: 12 }}>À déclarer</div>
              <div className="mono" style={{ fontSize: 24 }}>{fmt(cockpit.aDeclarer.netteDue)} {devise}</div>
              <div className="muted" style={{ fontSize: 12 }}>TVA nette due</div>
            </Link>
          </div>

          {/* Zone 3 — KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Résultat net", v: cockpit.kpis.resultatNet },
              { label: "Trésorerie", v: cockpit.kpis.tresorerie },
              { label: "Chiffre d'affaires", v: cockpit.kpis.chiffreAffaires },
              { label: "Charges", v: cockpit.kpis.totalCharges },
            ].map((k) => (
              <div key={k.label} className="panel" style={{ padding: 16 }}>
                <div className="muted" style={{ fontSize: 12 }}>{k.label}</div>
                <div className="mono" style={{ fontSize: 20 }}>{fmt(k.v)} {devise}</div>
              </div>
            ))}
          </div>

          {/* Zone 5 — journaux */}
          <h2 style={{ fontSize: 16, marginBottom: 8 }}>Journaux</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12 }}>
            {cockpit.journaux.map((j) => (
              <Link key={j.code} href="/ecritures" className="panel" style={{ padding: 12, textDecoration: "none", color: "inherit" }}>
                <div style={{ fontWeight: 700 }}>{j.code} — {j.libelle}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {j.nbPieces} pièce(s){j.nbBrouillons > 0 ? ` · ${j.nbBrouillons} brouillon(s)` : ""}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </Shell>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `cd "C:/Polytech DI/Semestre 10/dacompte" && npx tsc --noEmit`
Expected: aucune erreur (exit 0).

- [ ] **Step 4: Lint**

Run: `cd "C:/Polytech DI/Semestre 10/dacompte" && npx eslint src/components/Shell.tsx src/app/page.tsx`
Expected: aucune erreur (exit 0).

- [ ] **Step 5: Suite de tests complète (anti-régression)**

Run: `cd "C:/Polytech DI/Semestre 10/dacompte" && npx vitest run`
Expected: tous les tests passent (236 existants + nouveaux des tâches 1-3).

- [ ] **Step 6: Build (vérifie le rendu serveur de la page)**

Run: `cd "C:/Polytech DI/Semestre 10/dacompte" && npx next build`
Expected: build réussi, route `/` compilée sans erreur.

- [ ] **Step 7: Commit**

```bash
git add src/components/Shell.tsx src/app/page.tsx
git commit -m "feat(cockpit): accueil cockpit (KPIs + files + portefeuille) via Shell"
```

---

## Notes d'intégration

- **Bascule de dossier** : `MesDossiers` appelle la server action `choisirDossier` (cookie) puis `router.refresh()` — le cockpit et les pages se rechargent sur le nouveau dossier.
- **Cas aucun dossier courant** : `Shell` affiche `EcranAucunDossier` dans la zone gardée ; « Mes dossiers » s'affiche en dessous (slot `horsGarde`) pour choisir un dossier.
- **Cas aucun dossier en base** : `MesDossiers` affiche son état vide ; le cockpit ne s'affiche pas.
- **Anti-régression Shell** : `horsGarde` est optionnel ; les ~14 appels existants à `<Shell>` restent valides sans changement.
