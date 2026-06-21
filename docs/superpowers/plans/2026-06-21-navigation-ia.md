# Refonte Navigation & IA (tranche 1/3) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer la barre de navigation Odoo actuelle par une sidebar gauche persistante organisant toutes les pages existantes selon le cycle comptable, exposant les pages orphelines et supprimant les liens morts.

**Architecture:** Le composant serveur `Shell` (qui charge dossiers + dossier courant) délègue la navigation à un nouveau composant client `Sidebar`. `Sidebar` définit la structure de navigation (`NAV_GROUPS`) et dérive l'entrée active du pathname courant via `usePathname()`. Aucune URL ne change ; les appels existants à `Shell` restent compatibles (`module` devient optionnel).

**Tech Stack:** TypeScript, Next.js 16 (App Router, RSC + client components), React 19, Vitest + jsdom + @testing-library/react.

## Global Constraints

- Cible : comptable/cabinet ; colonne vertébrale = cycle comptable.
- 4 groupes de navigation, **10 entrées au total**, tous les groupes peuplés, **aucun lien `href="#"`**.
- Mapping exact :
  - **Dossier & paramétrage** : Plan comptable `/plan-comptable` · Tiers `/tiers`
  - **Saisie** : Écritures `/ecritures` · Factures clients `/ventes/factures` · Paiements `/ventes/paiements`
  - **Contrôle** : Lettrage `/lettrage` · Balance âgée `/ventes/balance-agee`
  - **États & déclarations** : États & documents `/etats` · Déclaration TVA `/etats/tva` · Budget `/budget`
- Les URLs existantes ne changent pas ; pas de pages-de-phase ; pas de dashboard (tranches suivantes).
- Conserver : `DossierSwitcher`, écran « aucun dossier », `breadcrumb`, slot `action`.
- `module` : prop de `Shell` rendue **optionnelle** (rétro-compatible, non utilisée par la nav).
- État actif : correspondance par préfixe segmenté, **la plus longue** gagne (`/etats/tva` ne doit pas activer `/etats`).
- Styles : inline (cohérent avec le `Shell`/composants existants) ; classes CSS disponibles : `panel`, `chip`, `input`, `muted`, `container` ; variables `--line`, `--panel`, `--bg`, `--accent`, `--ink`, `--muted`.
- Copy en français.
- Tests : `vitest run`, composants clients testés avec `// @vitest-environment jsdom` en 1re ligne.
- Prisma non sollicité dans les tests de `Sidebar` (mocker `./DossierSwitcher`).

---

## File Structure

| Fichier | Rôle |
|---|---|
| `src/components/Sidebar.tsx` (Créer) | Composant client : `NAV_GROUPS` (structure de nav), `hrefActif()` (logique d'état actif), et le rendu de la sidebar (logo, DossierSwitcher, groupes, chip). |
| `src/components/Sidebar.test.tsx` (Créer) | Tests jsdom : couverture IA, état actif, spécificité de préfixe, sous-chemin, anti-lien-mort, pathname inconnu. |
| `src/components/Shell.tsx` (Modifier) | Remplacer l'en-tête de modules + sous-menu par le layout sidebar + contenu ; rendre `<Sidebar/>` ; `module` optionnel ; conserver breadcrumb + écran « aucun dossier ». |

---

## Task 1: Composant `Sidebar` + structure de navigation

**Files:**
- Create: `src/components/Sidebar.tsx`
- Test: `src/components/Sidebar.test.tsx`

**Interfaces:**
- Consumes : `DossierSwitcher` (`./DossierSwitcher`, props `{ dossiers: {id;nom}[]; courantId: string|null }`) ; `usePathname` (`next/navigation`).
- Produces :
  - `interface NavEntree { label: string; href: string }`
  - `interface NavGroupe { titre: string; entrees: NavEntree[] }`
  - `const NAV_GROUPS: NavGroupe[]`
  - `function hrefActif(pathname: string): string | null`
  - `function Sidebar({ dossiers, courantId }: { dossiers: {id:string;nom:string}[]; courantId: string | null }): JSX.Element`

- [ ] **Step 1: Write the failing test**

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));
vi.mock("./DossierSwitcher", () => ({ DossierSwitcher: () => <div data-testid="switcher" /> }));

import { Sidebar, NAV_GROUPS } from "./Sidebar";
import { usePathname } from "next/navigation";

const mockPath = (p: string) => vi.mocked(usePathname).mockReturnValue(p);

beforeEach(() => {
  vi.mocked(usePathname).mockReset();
});

describe("Sidebar", () => {
  it("rend les 4 groupes et les 10 liens attendus avec leurs href", () => {
    mockPath("/");
    render(<Sidebar dossiers={[]} courantId={null} />);
    for (const g of NAV_GROUPS) expect(screen.getByText(g.titre)).toBeTruthy();
    const entrees = NAV_GROUPS.flatMap((g) => g.entrees);
    expect(entrees).toHaveLength(10);
    for (const e of entrees) {
      const lien = screen.getByText(e.label).closest("a");
      expect(lien?.getAttribute("href")).toBe(e.href);
    }
  });

  it("marque l'entrée active via aria-current=page", () => {
    mockPath("/lettrage");
    render(<Sidebar dossiers={[]} courantId={null} />);
    expect(screen.getByText("Lettrage").closest("a")?.getAttribute("aria-current")).toBe("page");
    expect(screen.getByText("Tiers").closest("a")?.getAttribute("aria-current")).toBeNull();
  });

  it("choisit l'entrée la plus spécifique entre préfixes (/etats/tva, pas /etats)", () => {
    mockPath("/etats/tva");
    render(<Sidebar dossiers={[]} courantId={null} />);
    expect(screen.getByText("Déclaration TVA").closest("a")?.getAttribute("aria-current")).toBe("page");
    expect(screen.getByText("États & documents").closest("a")?.getAttribute("aria-current")).toBeNull();
  });

  it("active l'entrée parente sur un sous-chemin", () => {
    mockPath("/ventes/factures/nouvelle");
    render(<Sidebar dossiers={[]} courantId={null} />);
    expect(screen.getByText("Factures clients").closest("a")?.getAttribute("aria-current")).toBe("page");
  });

  it("ne contient aucun lien mort href=#", () => {
    mockPath("/");
    const { container } = render(<Sidebar dossiers={[]} courantId={null} />);
    expect(container.querySelector('a[href="#"]')).toBeNull();
  });

  it("ne marque aucune entrée active sur un pathname inconnu", () => {
    mockPath("/inconnu");
    const { container } = render(<Sidebar dossiers={[]} courantId={null} />);
    expect(container.querySelector('[aria-current="page"]')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/Sidebar.test.tsx`
Expected: FAIL — `Cannot find module './Sidebar'`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/Sidebar.tsx
"use client";
// Sidebar de navigation — organise les pages selon le cycle comptable.
import { usePathname } from "next/navigation";
import { DossierSwitcher } from "./DossierSwitcher";

export interface NavEntree {
  label: string;
  href: string;
}
export interface NavGroupe {
  titre: string;
  entrees: NavEntree[];
}

// Source unique de la navigation : 4 groupes du cycle comptable, 10 entrées.
export const NAV_GROUPS: NavGroupe[] = [
  {
    titre: "Dossier & paramétrage",
    entrees: [
      { label: "Plan comptable", href: "/plan-comptable" },
      { label: "Tiers", href: "/tiers" },
    ],
  },
  {
    titre: "Saisie",
    entrees: [
      { label: "Écritures", href: "/ecritures" },
      { label: "Factures clients", href: "/ventes/factures" },
      { label: "Paiements", href: "/ventes/paiements" },
    ],
  },
  {
    titre: "Contrôle",
    entrees: [
      { label: "Lettrage", href: "/lettrage" },
      { label: "Balance âgée", href: "/ventes/balance-agee" },
    ],
  },
  {
    titre: "États & déclarations",
    entrees: [
      { label: "États & documents", href: "/etats" },
      { label: "Déclaration TVA", href: "/etats/tva" },
      { label: "Budget", href: "/budget" },
    ],
  },
];

// Un href correspond au pathname s'il est égal OU parent (préfixe segmenté).
function correspond(href: string, pathname: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

/** href actif le plus spécifique (le plus long) pour un pathname, ou null. */
export function hrefActif(pathname: string): string | null {
  const candidats = NAV_GROUPS.flatMap((g) => g.entrees.map((e) => e.href)).filter((h) =>
    correspond(h, pathname)
  );
  if (candidats.length === 0) return null;
  return candidats.sort((a, b) => b.length - a.length)[0];
}

export function Sidebar({
  dossiers,
  courantId,
}: {
  dossiers: { id: string; nom: string }[];
  courantId: string | null;
}) {
  const pathname = usePathname() ?? "";
  const actif = hrefActif(pathname);
  return (
    <aside
      style={{
        width: 240,
        flexShrink: 0,
        borderRight: "1px solid var(--line)",
        background: "var(--panel)",
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        padding: "12px 0",
      }}
    >
      <a
        href="/"
        style={{
          fontWeight: 700,
          fontFamily: "'Space Mono', monospace",
          color: "inherit",
          textDecoration: "none",
          padding: "4px 16px 12px",
        }}
      >
        DaCompta
      </a>
      <div style={{ padding: "0 16px 12px" }}>
        <DossierSwitcher dossiers={dossiers} courantId={courantId} />
      </div>
      <nav style={{ flex: 1 }}>
        {NAV_GROUPS.map((g) => (
          <div key={g.titre} style={{ marginBottom: 8 }}>
            <div
              className="muted"
              style={{ padding: "8px 16px 2px", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}
            >
              {g.titre}
            </div>
            {g.entrees.map((e) => {
              const estActif = e.href === actif;
              return (
                <a
                  key={e.href}
                  href={e.href}
                  aria-current={estActif ? "page" : undefined}
                  style={{
                    display: "block",
                    padding: "6px 16px",
                    color: "inherit",
                    textDecoration: "none",
                    borderLeft: `3px solid ${estActif ? "var(--accent)" : "transparent"}`,
                    background: estActif ? "var(--bg)" : "transparent",
                    fontWeight: estActif ? 700 : 400,
                  }}
                >
                  {e.label}
                </a>
              );
            })}
          </div>
        ))}
      </nav>
      <div style={{ padding: "12px 16px 4px" }}>
        <span className="chip" title="Authentification différée">
          👤 Comptable
        </span>
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/Sidebar.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/Sidebar.tsx src/components/Sidebar.test.tsx
git commit -m "feat(nav): composant Sidebar (cycle comptable) + état actif via usePathname"
```

---

## Task 2: Intégrer la `Sidebar` dans `Shell`

**Files:**
- Modify: `src/components/Shell.tsx` (remplacement complet du contenu)

**Interfaces:**
- Consumes : `Sidebar` (`./Sidebar`) ; `listerDossiers`, `getDossierCourant` (`@/server/dossiers`).
- Produces : `Shell(props): Promise<JSX.Element>` avec props `{ module?: string; breadcrumb: {label:string;href?:string}[]; action?: ReactNode; children: ReactNode }`.

**Note :** `Shell` est un composant serveur async appelé par ~14 pages avec `module="..."` et `breadcrumb`. En rendant `module` optionnel et en l'ignorant, aucun appel existant n'est cassé et aucune page n'a besoin d'être modifiée. `Shell` n'a pas de test unitaire (dépend de Prisma ; non testé dans l'existant) — la vérification se fait par typecheck + lint + build + recette manuelle.

- [ ] **Step 1: Remplacer entièrement `src/components/Shell.tsx` par :**

```tsx
// Shell de navigation principal — sidebar gauche (cycle comptable) + contenu.
import type { ReactNode } from "react";
import { listerDossiers, getDossierCourant } from "@/server/dossiers";
import { Sidebar } from "./Sidebar";

export async function Shell({
  breadcrumb,
  action,
  children,
}: {
  // `module` est accepté pour compatibilité avec les appels existants mais n'est
  // plus utilisé : l'état actif de la navigation est dérivé du pathname (Sidebar).
  module?: string;
  breadcrumb: { label: string; href?: string }[];
  action?: ReactNode;
  children: ReactNode;
}) {
  // Chargement parallèle des dossiers et du dossier courant.
  const [dossiers, courant] = await Promise.all([listerDossiers(), getDossierCourant()]);
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar dossiers={dossiers} courantId={courant?.id ?? null} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div
          style={{
            padding: "12px 24px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div className="muted" style={{ flex: 1 }}>
            {breadcrumb.map((b, i) => (
              <span key={i}>
                {i > 0 && " › "}
                {b.href ? (
                  <a href={b.href} style={{ color: "inherit" }}>
                    {b.label}
                  </a>
                ) : (
                  b.label
                )}
              </span>
            ))}
          </div>
          {action}
        </div>
        <main className="container">{!courant ? <EcranAucunDossier /> : children}</main>
      </div>
    </div>
  );
}

/** Affiché quand aucun dossier n'est encore sélectionné dans le cookie. */
function EcranAucunDossier() {
  return (
    <div className="panel" style={{ padding: 24 }}>
      <p>Aucun dossier sélectionné. Choisissez-en un dans la barre latérale.</p>
    </div>
  );
}
```

> Remarque : le type de `module?: string` doit rester dans la signature pour que les appels `Shell({ module: "...", ... })` continuent de typecheck ; il n'est volontairement pas déstructuré (donc non utilisé, sans warning de variable inutilisée).

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: exit 0, aucune erreur (notamment aucun appel de page cassé par la signature de `Shell`).

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build réussi (exit 0). C'est le gate de typecheck/build faisant foi.

- [ ] **Step 4: Suite de tests complète**

Run: `npm test`
Expected: tous les tests PASS, dont les 6 nouveaux de `Sidebar.test.tsx`.

- [ ] **Step 5: Recette manuelle (pour l'humain)**

1. `npm run dev`, ouvrir `/` avec un dossier sélectionné.
2. La **sidebar gauche** affiche les 4 groupes (Dossier & paramétrage, Saisie, Contrôle, États & déclarations) et leurs 10 entrées.
3. Cliquer chaque entrée : la page s'ouvre et l'entrée correspondante est **surlignée** (barre gauche accent + gras).
4. Vérifier que `/ecritures`, `/lettrage`, `/plan-comptable`, `/budget` (anciennement orphelines) sont désormais atteignables depuis la sidebar.
5. Sur `/etats/tva`, c'est bien « Déclaration TVA » qui est surligné (pas « États & documents »).
6. Le `DossierSwitcher` (changement de dossier) et l'écran « aucun dossier » fonctionnent toujours.
7. Aucun lien grisé « à venir » / mort (achats/banque/compta disparus).

- [ ] **Step 6: Commit**

```bash
git add src/components/Shell.tsx
git commit -m "feat(nav): Shell sur sidebar gauche, module optionnel, breadcrumb conservé"
```

---

## Self-Review (effectuée à la rédaction)

- **Couverture du spec :**
  - §3 IA (4 groupes, 10 entrées, mapping) → `NAV_GROUPS` (Task 1) + tests de couverture. ✅
  - §4 Composants (`Shell` serveur délègue à `Sidebar` client ; `NAV_GROUPS` source unique) → Tasks 1 & 2. ✅
  - §5 État actif (usePathname, préfixe le plus long, `aria-current`) → `hrefActif` + tests « plus spécifique » et « sous-chemin ». ✅
  - §6 Cas limites (aucun dossier → écran conservé ; pathname inconnu → rien d'actif ; sous-chemin → parent actif) → Task 2 (écran) + tests Task 1. ✅
  - §7 Tests (couverture IA, actif, sous-chemin, anti-lien-mort) → 6 tests Task 1. ✅
  - §8 Décisions (sidebar, menu-only, Budget sous États, pas de section vide, URLs inchangées, `module` optionnel) → respectées (aucune URL touchée, `module?`). ✅
- **Placeholders :** aucun ; tout le code est fourni en entier.
- **Cohérence des types :** `NavEntree`/`NavGroupe`/`NAV_GROUPS`/`hrefActif`/`Sidebar` définis en Task 1 et consommés tels quels ; `Shell` (Task 2) importe et appelle `Sidebar({ dossiers, courantId })` avec la signature exacte. ✅
- **Compte vérifié :** 2 + 3 + 2 + 3 = **10 entrées** (cohérent partout). ✅
