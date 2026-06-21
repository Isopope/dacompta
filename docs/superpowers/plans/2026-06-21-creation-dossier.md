# Création de dossier (onboarding) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre de créer un dossier opérationnel depuis l'application via un assistant 3 étapes qui amorce atomiquement dossier + journaux + plan SYSCOHADA de base + TVA du pays.

**Architecture:** Une donnée de référence `COMPTES_BASE_SYSCOHADA` (plan curé) dans `src/lib/syscohada/referentiel.ts` ; une server action `creerDossier` dans `src/server/dossiers.ts` qui amorce tout dans un seul `prisma.$transaction` en réutilisant les helpers `compte-logic` existants ; un assistant client 3 étapes (`/dossiers/nouveau`) ; des points d'entrée depuis le cockpit et le `DossierSwitcher`.

**Tech Stack:** Next.js 16 (App Router, Server Components, server actions), React 19, Prisma 6, vitest + jsdom, TypeScript.

## Global Constraints

- Aucune modification du schéma Prisma, aucune migration.
- Seul le référentiel `SYSCOHADA_REVISE` existe ; le pays doit appartenir à `PAYS` (`src/lib/syscohada/referentiel.ts`).
- Amorçage **atomique** : dossier + journaux + comptes + taxes dans un seul `prisma.$transaction`. Toute erreur annule tout.
- Le plan de base est une **donnée de référence propre** (`COMPTES_BASE_SYSCOHADA`), distincte de la démo `COMPTES_LES_ASSOCIES`.
- Dérivations des comptes via les helpers existants `src/lib/syscohada/compte-logic.ts` (`extraireClasse`, `detecterNature`, `deduireReport`, `deduireAccountType`, `deduireReconciliable`) — mêmes règles que `prisma/seed.ts`.
- Journaux standards créés : `ACH`/Achats/purchase, `VT`/Ventes/sale, `CAI`/Caisse/cash, `BIMA`/Banque/bank, `OD`/Opérations diverses/misc, `RAN`/Report à nouveau/misc (6 journaux).
- Taxes créées : `TVA-VENTE` (usage `sale`, compte `443100`) et `TVA-ACHAT` (usage `purchase`, compte `445200`), taux = `PAYS[pays].tva`.
- Modèle `Dossier` inchangé (champs : nom, ville, pays, devise, exercice, referentielId). Pas de champs d'identité étendus.
- Style = chrome existant (`.panel`/`.card`/`.chip`/`.muted`/`.input`). Pas de test de rendu de composant (l'app n'en a aucun).
- Tests serveur : vitest, helper `resetDb()` de `src/server/test-helpers.ts` (crée le référentiel SYSCOHADA + un dossier « Test SA », sans comptes ni journaux ; renvoie son id).

---

### Task 1 : Donnée de référence `COMPTES_BASE_SYSCOHADA`

**Files:**
- Modify: `src/lib/syscohada/referentiel.ts` (ajout d'un export, après `COMPTES_LES_ASSOCIES`)
- Test: `src/lib/syscohada/comptes-base.test.ts` (créer)

**Interfaces:**
- Consumes: type `CompteSeed` existant (`{ numero: string; intitule: string; type: "DETAIL"|"TOTAL"; collectif?: boolean }`), `CLASSES` existant.
- Produces: `export const COMPTES_BASE_SYSCOHADA: CompteSeed[]`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
// src/lib/syscohada/comptes-base.test.ts
import { describe, it, expect } from "vitest";
import { COMPTES_BASE_SYSCOHADA, CLASSES } from "./referentiel";

describe("COMPTES_BASE_SYSCOHADA", () => {
  it("est un plan curé de taille raisonnable (60-100 comptes)", () => {
    expect(COMPTES_BASE_SYSCOHADA.length).toBeGreaterThanOrEqual(60);
    expect(COMPTES_BASE_SYSCOHADA.length).toBeLessThanOrEqual(100);
  });

  it("n'a que des numéros à 6 chiffres, sans doublon", () => {
    const numeros = COMPTES_BASE_SYSCOHADA.map((c) => c.numero);
    for (const n of numeros) expect(n).toMatch(/^\d{6}$/);
    expect(new Set(numeros).size).toBe(numeros.length);
  });

  it("contient les comptes requis par les taxes et la trésorerie", () => {
    const numeros = new Set(COMPTES_BASE_SYSCOHADA.map((c) => c.numero));
    for (const requis of ["443100", "445200", "401000", "411000", "521000", "571000", "601000", "701000"]) {
      expect(numeros.has(requis)).toBe(true);
    }
  });

  it("marque 401000 et 411000 comme collectifs", () => {
    const c401 = COMPTES_BASE_SYSCOHADA.find((c) => c.numero === "401000");
    const c411 = COMPTES_BASE_SYSCOHADA.find((c) => c.numero === "411000");
    expect(c401?.collectif).toBe(true);
    expect(c411?.collectif).toBe(true);
  });

  it("couvre les classes 1 à 7", () => {
    const classes = new Set(COMPTES_BASE_SYSCOHADA.map((c) => Number(c.numero[0])));
    for (const cl of [1, 2, 3, 4, 5, 6, 7]) expect(classes.has(cl)).toBe(true);
    // toutes les classes utilisées sont déclarées dans CLASSES
    const connues = new Set(CLASSES.map((c) => c.numero));
    for (const cl of classes) expect(connues.has(cl)).toBe(true);
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `cd "C:/Polytech DI/Semestre 10/dacompte" && npx vitest run src/lib/syscohada/comptes-base.test.ts`
Expected: FAIL — `COMPTES_BASE_SYSCOHADA` n'est pas exporté.

- [ ] **Step 3: Ajouter la donnée de référence**

Dans `src/lib/syscohada/referentiel.ts`, après le tableau `COMPTES_LES_ASSOCIES`, ajouter :

```ts
// Plan SYSCOHADA de base, générique et réutilisable pour tout NOUVEAU dossier.
// Donnée de référence propre — à NE PAS confondre avec COMPTES_LES_ASSOCIES (démo
// spécifique au cas « Les Associés SA »). classeNum/natureRacine/accountType, etc.
// sont DÉRIVÉS à la création (voir creerDossier), pas stockés ici.
export const COMPTES_BASE_SYSCOHADA: CompteSeed[] = [
  // Classe 1 — Ressources durables
  { numero: "101000", intitule: "Capital social", type: "DETAIL" },
  { numero: "106000", intitule: "Réserves", type: "DETAIL" },
  { numero: "120000", intitule: "Report à nouveau", type: "DETAIL" },
  { numero: "130000", intitule: "Résultat net de l'exercice", type: "DETAIL" },
  { numero: "162000", intitule: "Emprunts auprès des établissements de crédit", type: "DETAIL" },
  { numero: "165000", intitule: "Dépôts et cautionnements reçus", type: "DETAIL" },
  // Classe 2 — Actif immobilisé
  { numero: "213000", intitule: "Logiciels", type: "DETAIL" },
  { numero: "220000", intitule: "Terrains", type: "DETAIL" },
  { numero: "231000", intitule: "Bâtiments", type: "DETAIL" },
  { numero: "241000", intitule: "Matériel et outillage", type: "DETAIL" },
  { numero: "244000", intitule: "Matériel et mobilier de bureau", type: "DETAIL" },
  { numero: "245000", intitule: "Matériel de transport", type: "DETAIL" },
  { numero: "275000", intitule: "Dépôts et cautionnements versés", type: "DETAIL" },
  { numero: "281000", intitule: "Amortissements des bâtiments", type: "DETAIL" },
  { numero: "284400", intitule: "Amortissements du matériel et mobilier de bureau", type: "DETAIL" },
  { numero: "284500", intitule: "Amortissements du matériel de transport", type: "DETAIL" },
  // Classe 3 — Stocks
  { numero: "311000", intitule: "Marchandises", type: "DETAIL" },
  { numero: "321000", intitule: "Matières premières et fournitures", type: "DETAIL" },
  { numero: "351000", intitule: "Produits finis", type: "DETAIL" },
  { numero: "388000", intitule: "Stocks en cours de route", type: "DETAIL" },
  // Classe 4 — Tiers
  { numero: "401000", intitule: "Fournisseurs", type: "DETAIL", collectif: true },
  { numero: "408000", intitule: "Fournisseurs, factures non parvenues", type: "DETAIL" },
  { numero: "409000", intitule: "Fournisseurs débiteurs, avances et acomptes", type: "DETAIL" },
  { numero: "411000", intitule: "Clients", type: "DETAIL", collectif: true },
  { numero: "416000", intitule: "Clients douteux ou litigieux", type: "DETAIL" },
  { numero: "418000", intitule: "Clients, produits à recevoir", type: "DETAIL" },
  { numero: "421000", intitule: "Personnel, rémunérations dues", type: "DETAIL" },
  { numero: "431000", intitule: "Sécurité sociale (CNSS)", type: "DETAIL" },
  { numero: "441000", intitule: "État, impôt sur les bénéfices", type: "DETAIL" },
  { numero: "443100", intitule: "État, TVA facturée (collectée)", type: "DETAIL" },
  { numero: "445100", intitule: "État, TVA récupérable sur immobilisations", type: "DETAIL" },
  { numero: "445200", intitule: "État, TVA récupérable sur achats (déductible)", type: "DETAIL" },
  { numero: "447000", intitule: "État, autres impôts et taxes", type: "DETAIL" },
  { numero: "471000", intitule: "Comptes d'attente", type: "DETAIL" },
  { numero: "476000", intitule: "Charges constatées d'avance", type: "DETAIL" },
  { numero: "477000", intitule: "Produits constatés d'avance", type: "DETAIL" },
  // Classe 5 — Trésorerie
  { numero: "521000", intitule: "Banques (comptes locaux)", type: "DETAIL" },
  { numero: "531000", intitule: "Chèques postaux", type: "DETAIL" },
  { numero: "571000", intitule: "Caisse", type: "DETAIL" },
  { numero: "585000", intitule: "Virements internes / de fonds", type: "DETAIL" },
  // Classe 6 — Charges
  { numero: "601000", intitule: "Achats de marchandises", type: "DETAIL" },
  { numero: "602000", intitule: "Achats de matières premières", type: "DETAIL" },
  { numero: "604000", intitule: "Achats stockés de matières et fournitures", type: "DETAIL" },
  { numero: "605000", intitule: "Autres achats (eau, électricité, carburant)", type: "DETAIL" },
  { numero: "608000", intitule: "Achats d'emballages", type: "DETAIL" },
  { numero: "611000", intitule: "Transports", type: "DETAIL" },
  { numero: "622000", intitule: "Locations et charges locatives", type: "DETAIL" },
  { numero: "624000", intitule: "Entretien, réparations et maintenance", type: "DETAIL" },
  { numero: "625000", intitule: "Primes d'assurance", type: "DETAIL" },
  { numero: "627000", intitule: "Publicité, relations publiques", type: "DETAIL" },
  { numero: "628000", intitule: "Frais de télécommunications", type: "DETAIL" },
  { numero: "631000", intitule: "Frais bancaires", type: "DETAIL" },
  { numero: "632000", intitule: "Rémunérations d'intermédiaires et de conseils", type: "DETAIL" },
  { numero: "641000", intitule: "Impôts et taxes directs", type: "DETAIL" },
  { numero: "661000", intitule: "Rémunérations directes versées au personnel", type: "DETAIL" },
  { numero: "663000", intitule: "Charges sociales", type: "DETAIL" },
  { numero: "671000", intitule: "Intérêts des emprunts et dettes", type: "DETAIL" },
  { numero: "681000", intitule: "Dotations aux amortissements d'exploitation", type: "DETAIL" },
  // Classe 7 — Produits
  { numero: "701000", intitule: "Ventes de marchandises", type: "DETAIL" },
  { numero: "702000", intitule: "Ventes de produits finis", type: "DETAIL" },
  { numero: "706000", intitule: "Services vendus", type: "DETAIL" },
  { numero: "707000", intitule: "Produits accessoires", type: "DETAIL" },
  { numero: "711000", intitule: "Subventions d'exploitation", type: "DETAIL" },
  { numero: "758000", intitule: "Produits divers de gestion courante", type: "DETAIL" },
  { numero: "771000", intitule: "Revenus financiers et assimilés", type: "DETAIL" },
  { numero: "781000", intitule: "Reprises d'amortissements et provisions", type: "DETAIL" },
  // Classe 8 — HAO
  { numero: "812000", intitule: "Valeurs comptables des cessions d'immobilisations", type: "DETAIL" },
  { numero: "822000", intitule: "Produits des cessions d'immobilisations", type: "DETAIL" },
];
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `cd "C:/Polytech DI/Semestre 10/dacompte" && npx vitest run src/lib/syscohada/comptes-base.test.ts`
Expected: PASS (5 tests). La liste compte ~70 comptes, tous à 6 chiffres, sans doublon, classes 1-8.

- [ ] **Step 5: Commit**

```bash
git add src/lib/syscohada/referentiel.ts src/lib/syscohada/comptes-base.test.ts
git commit -m "feat(dossier): plan SYSCOHADA de base (donnée de référence) + tests"
```

---

### Task 2 : Server action `creerDossier`

**Files:**
- Modify: `src/server/dossiers.ts` (ajout de `creerDossier` + constante journaux)
- Test: `src/server/dossiers.test.ts` (ajouter un bloc `describe`)

**Interfaces:**
- Consumes: `prisma`, `Prisma` (de `@prisma/client`), `REFERENTIEL_CODE`/`NATURES`/`PAYS`/`COMPTES_BASE_SYSCOHADA` (de `@/lib/syscohada/referentiel`), helpers de `@/lib/syscohada/compte-logic`.
- Produces:
  - `interface CreerDossierInput { nom: string; ville: string; pays: string; devise: string; exercice: number; }`
  - `function creerDossier(input: CreerDossierInput): Promise<{ id: string }>`

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter en haut de `src/server/dossiers.test.ts` les imports manquants (`prisma` depuis `@/lib/db`, `resetDb` depuis `./test-helpers`, `COMPTES_BASE_SYSCOHADA` depuis `@/lib/syscohada/referentiel`, `creerDossier` depuis `./dossiers`) s'ils n'y sont pas déjà, puis ajouter ce bloc :

```ts
describe("creerDossier", () => {
  beforeEach(async () => {
    await resetDb(); // crée le référentiel SYSCOHADA + un dossier "Test SA" (sans comptes/journaux)
  });

  it("amorce un dossier opérationnel : 6 journaux, le plan de base, 2 taxes", async () => {
    const { id } = await creerDossier({ nom: "Nouvelle SARL", ville: "Dakar", pays: "Sénégal", devise: "XOF", exercice: 2026 });
    expect(await prisma.journal.count({ where: { dossierId: id } })).toBe(6);
    expect(await prisma.compte.count({ where: { dossierId: id } })).toBe(COMPTES_BASE_SYSCOHADA.length);
    expect(await prisma.taxe.count({ where: { dossierId: id } })).toBe(2);
    const tva = await prisma.compte.findMany({ where: { dossierId: id, numero: { in: ["443100", "445200"] } } });
    expect(tva).toHaveLength(2);
  });

  it("dérive les attributs comptables (collectif, reconciliable, classeNum)", async () => {
    const { id } = await creerDossier({ nom: "X SA", ville: "Lomé", pays: "Togo", devise: "XOF", exercice: 2026 });
    const c401 = await prisma.compte.findUniqueOrThrow({ where: { dossierId_numero: { dossierId: id, numero: "401000" } } });
    expect(c401.collectif).toBe(true);
    expect(c401.reconciliable).toBe(true);
    const c601 = await prisma.compte.findUniqueOrThrow({ where: { dossierId_numero: { dossierId: id, numero: "601000" } } });
    expect(c601.classeNum).toBe(6);
  });

  it("applique le taux de TVA du pays", async () => {
    const { id } = await creerDossier({ nom: "Cam SA", ville: "Douala", pays: "Cameroun", devise: "XAF", exercice: 2026 });
    const vente = await prisma.taxe.findUniqueOrThrow({ where: { dossierId_code: { dossierId: id, code: "TVA-VENTE" } } });
    expect(vente.usage).toBe("sale");
    expect(Number(vente.taux)).toBe(19.25); // TVA Cameroun
  });

  it("isole le nouveau dossier (n'affecte pas les comptes des autres)", async () => {
    const avant = await prisma.compte.count();
    const { id } = await creerDossier({ nom: "Iso", ville: "Abidjan", pays: "Côte d'Ivoire", devise: "XOF", exercice: 2026 });
    expect(await prisma.compte.count({ where: { dossierId: { not: id } } })).toBe(avant);
  });

  it("est atomique : un input invalide ne crée aucun dossier", async () => {
    const avant = await prisma.dossier.count();
    await expect(
      creerDossier({ nom: "   ", ville: "X", pays: "Togo", devise: "XOF", exercice: 2026 })
    ).rejects.toThrow();
    expect(await prisma.dossier.count()).toBe(avant);
  });

  it("rejette un pays non supporté", async () => {
    await expect(
      creerDossier({ nom: "Y", ville: "Z", pays: "France", devise: "EUR", exercice: 2026 })
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `cd "C:/Polytech DI/Semestre 10/dacompte" && npx vitest run src/server/dossiers.test.ts`
Expected: FAIL — `creerDossier` n'est pas exporté.

- [ ] **Step 3: Implémenter `creerDossier`**

Dans `src/server/dossiers.ts`, ajouter les imports nécessaires en tête (le fichier a déjà `"use server"` et importe `prisma`) :

```ts
import { Prisma } from "@prisma/client";
import {
  REFERENTIEL_CODE, NATURES, PAYS, COMPTES_BASE_SYSCOHADA,
} from "@/lib/syscohada/referentiel";
import {
  extraireClasse, detecterNature, deduireReport, deduireAccountType, deduireReconciliable,
} from "@/lib/syscohada/compte-logic";
```

Puis ajouter, à la fin du fichier :

```ts
export interface CreerDossierInput {
  nom: string;
  ville: string;
  pays: string;
  devise: string;
  exercice: number;
}

// Journaux standards créés à l'ouverture d'un dossier (codes SYSCOHADA usuels).
const JOURNAUX_STANDARD = [
  { code: "ACH", libelle: "Achats", type: "purchase" },
  { code: "VT", libelle: "Ventes", type: "sale" },
  { code: "CAI", libelle: "Caisse", type: "cash" },
  { code: "BIMA", libelle: "Banque", type: "bank" },
  { code: "OD", libelle: "Opérations diverses", type: "misc" },
  { code: "RAN", libelle: "Report à nouveau", type: "misc" },
];

/**
 * Crée un dossier OPÉRATIONNEL : la ligne Dossier + journaux standards + plan
 * SYSCOHADA de base + taxes TVA du pays, le tout dans une transaction atomique.
 * Les attributs comptables des comptes sont dérivés (mêmes règles que le seed).
 */
export async function creerDossier(input: CreerDossierInput): Promise<{ id: string }> {
  const nom = input.nom?.trim();
  if (!nom) throw new Error("Le nom du dossier est obligatoire.");
  if (!Number.isInteger(input.exercice) || input.exercice < 2000 || input.exercice > 2100) {
    throw new Error("Exercice invalide (année attendue entre 2000 et 2100).");
  }
  const paysDef = PAYS.find((p) => p.pays === input.pays);
  if (!paysDef) throw new Error(`Pays non supporté : ${input.pays}.`);
  const devise = input.devise?.trim();
  if (!devise) throw new Error("La devise est obligatoire.");

  const ref = await prisma.referentiel.findFirst({ where: { code: REFERENTIEL_CODE } });
  if (!ref) throw new Error("Référentiel SYSCOHADA introuvable : lancez `npm run db:seed`.");

  const dossier = await prisma.$transaction(async (tx) => {
    const d = await tx.dossier.create({
      data: {
        nom,
        ville: input.ville?.trim() ?? "",
        pays: input.pays,
        devise,
        exercice: input.exercice,
        referentielId: ref.id,
      },
    });

    await tx.journal.createMany({
      data: JOURNAUX_STANDARD.map((j) => ({ ...j, dossierId: d.id })),
    });

    await tx.compte.createMany({
      data: COMPTES_BASE_SYSCOHADA.map((c) => {
        const nature = detecterNature(c.numero, NATURES);
        const reportNplus1 = nature ? nature.reportNplus1 : deduireReport(extraireClasse(c.numero));
        const accountType = deduireAccountType(c.numero);
        return {
          numero: c.numero,
          intitule: c.intitule,
          type: c.type,
          classeNum: extraireClasse(c.numero),
          natureRacine: nature?.racine ?? null,
          reportNplus1,
          collectif: c.collectif ?? false,
          accountType,
          reconciliable: deduireReconciliable(accountType),
          dossierId: d.id,
        };
      }),
    });

    await tx.taxe.createMany({
      data: [
        {
          dossierId: d.id, code: "TVA-VENTE", nom: `TVA ${paysDef.tva}% (collectée)`,
          taux: new Prisma.Decimal(paysDef.tva), usage: "sale", compteNumero: "443100",
        },
        {
          dossierId: d.id, code: "TVA-ACHAT", nom: `TVA ${paysDef.tva}% (déductible)`,
          taux: new Prisma.Decimal(paysDef.tva), usage: "purchase", compteNumero: "445200",
        },
      ],
    });

    return d;
  });

  return { id: dossier.id };
}
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `cd "C:/Polytech DI/Semestre 10/dacompte" && npx vitest run src/server/dossiers.test.ts`
Expected: PASS (les 6 nouveaux tests + les tests existants du fichier).

- [ ] **Step 5: Commit**

```bash
git add src/server/dossiers.ts src/server/dossiers.test.ts
git commit -m "feat(dossier): creerDossier — amorçage atomique journaux + plan + TVA"
```

---

### Task 3 : Assistant client 3 étapes

**Files:**
- Create: `src/app/dossiers/nouveau/page.tsx`
- Create: `src/app/dossiers/nouveau/NouveauDossierWizard.tsx`

**Interfaces:**
- Consumes: `creerDossier` + `choisirDossier` (de `@/server/dossiers`, Task 2 + existant), `PAYS` (de `@/lib/syscohada/referentiel`).
- Produces: la route `/dossiers/nouveau`. Pas de nouvelle interface exportée.

Pas de test unitaire (cohérent avec l'app). Vérification = typecheck + lint. La page est **autonome** (pas de `Shell`, car elle doit fonctionner sans dossier courant).

- [ ] **Step 1: Créer la page serveur**

```tsx
// src/app/dossiers/nouveau/page.tsx
// Page autonome de création de dossier (ne requiert pas de dossier courant).
import { PAYS } from "@/lib/syscohada/referentiel";
import { NouveauDossierWizard } from "./NouveauDossierWizard";

export const dynamic = "force-dynamic";

export default function Page() {
  // On ne passe au client que les champs utiles (donnée statique).
  const pays = PAYS.map((p) => ({ pays: p.pays, devise: p.devise, tva: p.tva }));
  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <h1>Nouveau dossier</h1>
      <NouveauDossierWizard pays={pays} />
    </div>
  );
}
```

- [ ] **Step 2: Créer l'assistant client**

```tsx
// src/app/dossiers/nouveau/NouveauDossierWizard.tsx
"use client";
// Assistant 3 étapes : ① Pays & identité → ② Exercice & devise → ③ Préparation.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { creerDossier, choisirDossier } from "@/server/dossiers";

interface PaysOption {
  pays: string;
  devise: string;
  tva: number;
}

export function NouveauDossierWizard({ pays }: { pays: PaysOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [etape, setEtape] = useState(1);
  const [erreur, setErreur] = useState<string | null>(null);

  const [paysSel, setPaysSel] = useState(pays[0]?.pays ?? "");
  const [nom, setNom] = useState("");
  const [ville, setVille] = useState("");
  const paysDef = pays.find((p) => p.pays === paysSel);
  const [devise, setDevise] = useState(paysDef?.devise ?? "");
  const [exercice, setExercice] = useState<number>(new Date().getFullYear());

  function choisirPays(p: string) {
    setPaysSel(p);
    const def = pays.find((x) => x.pays === p);
    if (def) setDevise(def.devise);
  }

  function creer() {
    setErreur(null);
    startTransition(async () => {
      try {
        const { id } = await creerDossier({ nom, ville, pays: paysSel, devise, exercice });
        await choisirDossier(id);
        router.push("/");
      } catch (e) {
        setErreur(e instanceof Error ? e.message : "Échec de la création du dossier.");
      }
    });
  }

  const tvaPct = paysDef?.tva ?? 0;

  return (
    <div className="panel" style={{ padding: 20, marginTop: 12 }}>
      <div className="muted" style={{ fontSize: 12, marginBottom: 12 }}>Étape {etape} sur 3</div>

      {etape === 1 && (
        <div>
          <h2 style={{ fontSize: 16 }}>Pays & identité</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 8, margin: "12px 0" }}>
            {pays.map((p) => (
              <button
                key={p.pays}
                type="button"
                onClick={() => choisirPays(p.pays)}
                className="card"
                style={{
                  padding: 10, textAlign: "left", cursor: "pointer",
                  borderColor: p.pays === paysSel ? "var(--accent)" : undefined,
                  background: p.pays === paysSel ? "var(--bg)" : undefined,
                }}
              >
                <div style={{ fontWeight: 700 }}>{p.pays}</div>
                <div className="muted" style={{ fontSize: 12 }}>{p.devise} · TVA {p.tva}%</div>
              </button>
            ))}
          </div>
          <label style={{ display: "block", marginBottom: 8 }}>
            <div className="muted" style={{ fontSize: 12 }}>Raison sociale</div>
            <input className="input" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex. Nouvelle SARL" />
          </label>
          <label style={{ display: "block", marginBottom: 8 }}>
            <div className="muted" style={{ fontSize: 12 }}>Ville</div>
            <input className="input" value={ville} onChange={(e) => setVille(e.target.value)} placeholder="Ex. Dakar" />
          </label>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Link href="/" className="chip">Annuler</Link>
            <div style={{ flex: 1 }} />
            <button type="button" onClick={() => setEtape(2)} disabled={!nom.trim()}>Continuer →</button>
          </div>
        </div>
      )}

      {etape === 2 && (
        <div>
          <h2 style={{ fontSize: 16 }}>Exercice & devise</h2>
          <label style={{ display: "block", margin: "12px 0 8px" }}>
            <div className="muted" style={{ fontSize: 12 }}>Exercice (année)</div>
            <input className="input" type="number" value={exercice}
              onChange={(e) => setExercice(Number(e.target.value))} />
          </label>
          <label style={{ display: "block", marginBottom: 8 }}>
            <div className="muted" style={{ fontSize: 12 }}>Devise</div>
            <input className="input" value={devise} onChange={(e) => setDevise(e.target.value)} />
          </label>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button type="button" onClick={() => setEtape(1)}>← Retour</button>
            <div style={{ flex: 1 }} />
            <button type="button" onClick={() => setEtape(3)} disabled={!devise.trim()}>Continuer →</button>
          </div>
        </div>
      )}

      {etape === 3 && (
        <div>
          <h2 style={{ fontSize: 16 }}>Préparation</h2>
          <p className="muted" style={{ fontSize: 13 }}>
            DaCompta va créer le dossier <strong>{nom || "(sans nom)"}</strong> ({paysSel} · {devise} ·
            exercice {exercice}) et amorcer automatiquement :
          </p>
          <ul style={{ fontSize: 14 }}>
            <li>6 journaux de saisie (Achats, Ventes, Caisse, Banque, OD, Report à nouveau)</li>
            <li>un plan comptable SYSCOHADA de base</li>
            <li>la TVA du pays (collectée &amp; déductible, {tvaPct}%)</li>
          </ul>
          {erreur && <p style={{ color: "var(--warn, #c2410c)" }}>{erreur}</p>}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button type="button" onClick={() => setEtape(2)} disabled={pending}>← Retour</button>
            <div style={{ flex: 1 }} />
            <button type="button" onClick={creer} disabled={pending} style={{ fontWeight: 700 }}>
              {pending ? "Création…" : "Créer & ouvrir ✓"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `cd "C:/Polytech DI/Semestre 10/dacompte" && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Lint**

Run: `cd "C:/Polytech DI/Semestre 10/dacompte" && npx eslint src/app/dossiers/nouveau/page.tsx src/app/dossiers/nouveau/NouveauDossierWizard.tsx`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/app/dossiers/nouveau/page.tsx src/app/dossiers/nouveau/NouveauDossierWizard.tsx
git commit -m "feat(dossier): assistant 3 étapes /dossiers/nouveau"
```

---

### Task 4 : Points d'entrée (cockpit + DossierSwitcher)

**Files:**
- Modify: `src/app/MesDossiers.tsx`
- Modify: `src/components/DossierSwitcher.tsx`

**Interfaces:**
- Consumes: la route `/dossiers/nouveau` (Task 3).
- Produces: rien de nouveau.

Pas de test unitaire. Vérification = typecheck + lint + suite vitest complète + build.

- [ ] **Step 1: Lien « + Nouveau dossier » dans MesDossiers**

Dans `src/app/MesDossiers.tsx` : ajouter l'import `Link` s'il n'est pas déjà présent —
`import Link from "next/link";` (en tête, sous `"use client";`).

Remplacer l'en-tête de section et l'état vide. Trouver :

```tsx
      <h2 id="mes-dossiers-titre" style={{ fontSize: 16, marginBottom: 8 }}>Mes dossiers</h2>
      {dossiers.length === 0 ? (
        <p className="muted">Aucun dossier. Créez-en un pour commencer.</p>
      ) : (
```

et remplacer par :

```tsx
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <h2 id="mes-dossiers-titre" style={{ fontSize: 16, margin: 0 }}>Mes dossiers</h2>
        <div style={{ flex: 1 }} />
        <Link href="/dossiers/nouveau" className="chip">+ Nouveau dossier</Link>
      </div>
      {dossiers.length === 0 ? (
        <p className="muted">Aucun dossier pour l'instant.</p>
      ) : (
```

- [ ] **Step 2: Lien « + Nouveau dossier » dans DossierSwitcher**

Dans `src/components/DossierSwitcher.tsx` : ajouter l'import `Link` (`import Link from "next/link";`)
sous les imports existants. Envelopper le `<select>` rendu dans un conteneur flex et ajouter le lien.
Remplacer le `return (` … `);` pour que le rendu soit :

```tsx
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <select
        className="input"
        value={courantId ?? ""}
        onChange={async (e) => {
          try {
            await choisirDossier(e.target.value);
            router.refresh();
          } catch (err) {
            console.error("Échec du changement de dossier :", err);
          }
        }}
        style={{ flex: 1 }}
      >
        {!courantId && <option value="">— choisir un dossier —</option>}
        {dossiers.map((d) => (
          <option key={d.id} value={d.id}>
            {d.nom}
          </option>
        ))}
      </select>
      <Link href="/dossiers/nouveau" className="chip" title="Nouveau dossier">＋</Link>
    </div>
  );
```

(Conserver le `"use client"`, les imports et la signature existants ; seul le JSX retourné change, avec l'ajout de `style={{ flex: 1 }}` sur le `<select>`.)

- [ ] **Step 3: Typecheck + Lint**

Run: `cd "C:/Polytech DI/Semestre 10/dacompte" && npx tsc --noEmit && npx eslint src/app/MesDossiers.tsx src/components/DossierSwitcher.tsx`
Expected: exit 0 pour les deux.

- [ ] **Step 4: Suite de tests complète (anti-régression)**

Run: `cd "C:/Polytech DI/Semestre 10/dacompte" && npx vitest run`
Expected: tous les tests passent (suite existante + nouveaux des tâches 1-2).

- [ ] **Step 5: Build (vérifie le rendu serveur des nouvelles routes)**

Run: `cd "C:/Polytech DI/Semestre 10/dacompte" && npx next build`
Expected: build réussi, route `/dossiers/nouveau` compilée.

- [ ] **Step 6: Commit**

```bash
git add src/app/MesDossiers.tsx src/components/DossierSwitcher.tsx
git commit -m "feat(dossier): points d'entrée création (cockpit + DossierSwitcher)"
```

---

## Notes d'intégration

- **Après création** : `creerDossier` → `choisirDossier(id)` (cookie) → `router.push("/")` ; le cockpit s'ouvre sur le nouveau dossier (vide → « Rien à contrôler/lettrer/déclarer », prochaine action nulle).
- **Référentiel requis** : `creerDossier` suppose le référentiel SYSCOHADA seedé (toujours vrai après `npm run db:seed`). En son absence, erreur explicite affichée par le wizard.
- **Cohérence des numéros** : les comptes de TVA `443100`/`445200` du plan de base sont exactement ceux référencés par les taxes créées — garanti par le test de Task 1.
- **Pas de migration** : seules des lignes de données sont créées au runtime ; le schéma est inchangé.
