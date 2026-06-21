# Refonte Navigation & Architecture d'information — Design

- **Date** : 2026-06-21
- **Statut** : Validé (brainstorming) — en attente de plan d'implémentation
- **Module** : `dacompta` — composant `Shell` + navigation globale
- **Tranche** : 1/3 de la refonte UX (suivantes : Tableau de bord cockpit ; Parcours guidés)

## 1. Contexte et motivation

Le backend de `dacompta` expose ~20 modules métier (dossiers, comptes, pièces/écritures,
journaux, balance, lettrage, factures, paiements, tiers, taxes/TVA, budget, états
financiers, extourne, verrous, audit, import FEC, dashboard). Le frontend, lui :

1. **N'a pas de colonne vertébrale** : les écrans sont juxtaposés sans refléter le cycle
   comptable, et rien n'oriente l'utilisateur.
2. **Cache des fonctionnalités** : 4 pages existent mais sont **absentes de la navigation**
   (`/ecritures`, `/lettrage`, `/plan-comptable`, `/budget`) — accessibles seulement par
   URL directe. La nav (`Shell`) n'expose que Ventes, Tiers, États ; `achats/banque/compta`
   sont des liens morts (`href="#"`, grisés « à venir »).
3. **N'offre pas de point d'entrée** : l'accueil est une grille plate de 6 liens.

**Utilisateur cible retenu** : un **comptable / cabinet** qui tient les livres de PME OHADA.
La colonne vertébrale de l'UX est donc le **cycle comptable** (saisie → contrôle → états →
déclarations).

Cette tranche traite **uniquement la navigation et l'architecture d'information** : rendre
toutes les fonctionnalités existantes accessibles, regroupées selon le cycle comptable, via
une sidebar gauche persistante. Le tableau de bord cockpit et les parcours guidés font
l'objet de tranches dédiées.

## 2. Périmètre

### Inclus
- Une **sidebar gauche persistante** organisant les routes existantes en 4 groupes
  cycle-ordonnés.
- Exposition des 4 pages aujourd'hui orphelines.
- Suppression des liens morts (`achats/banque/compta`).
- Surlignage automatique de l'entrée active (via `usePathname`).
- Conservation du `DossierSwitcher`, de l'écran « aucun dossier », et du `breadcrumb`.

### Exclu (tranches suivantes / hors scope)
- Tableau de bord cockpit (KPIs, alertes, prochaine action) — tranche 2.
- Pages-de-phase et parcours guidés / onboarding — tranche 3.
- Création d'UI pour les modules backend sans page : clôture/verrous, import FEC, audit,
  extourne, journaux. Ils seront ajoutés à la nav quand leurs pages existeront.
- Toute restructuration des URLs (les URLs actuelles sont conservées telles quelles).
- Refonte visuelle/esthétique au-delà de la mise en place de la sidebar.

## 3. Architecture d'information

4 groupes, tous peuplés (aucune section vide, aucun lien mort) :

| Groupe | Entrées (route) |
|---|---|
| **Dossier & paramétrage** | Plan comptable (`/plan-comptable`) · Tiers (`/tiers`) |
| **Saisie** | Écritures (`/ecritures`) · Factures clients (`/ventes/factures`) · Paiements (`/ventes/paiements`) |
| **Contrôle** | Lettrage (`/lettrage`) · Balance âgée (`/ventes/balance-agee`) |
| **États & déclarations** | États & documents (`/etats`) · Déclaration TVA (`/etats/tva`) · Budget (`/budget`) |

Soit **10 entrées de navigation** au total. Le **Tableau de bord** (`/`) reste accessible via le logo/nom de l'app en haut de la sidebar.
La gestion du dossier courant passe par le `DossierSwitcher`.

## 4. Architecture des composants

```
src/components/Shell.tsx        (Modifier) — composant SERVEUR
    Charge dossiers + dossier courant (inchangé). Rend la nouvelle mise en page
    sidebar + contenu. Délègue la navigation au composant client <Sidebar/>.
    Conserve l'écran « aucun dossier » et le breadcrumb. La prop `module` devient
    OPTIONNELLE (rétro-compatible : les ~14 appels existants compilent sans changement).

src/components/Sidebar.tsx      (Créer) — composant CLIENT ("use client")
    Affiche le nom de l'app (lien /), le DossierSwitcher, les 4 groupes du cycle
    (en-tête + liens), et le chip « 👤 Comptable » en bas. Dérive l'entrée active
    via usePathname() et pose aria-current="page". Définit la structure de navigation
    (groupes + entrées) comme une constante exportée NAV_GROUPS pour testabilité.

src/components/Sidebar.test.tsx (Créer)
    Vérifie le rendu des groupes/liens, l'état actif, et l'absence de lien mort.
```

- **Séparation des responsabilités** : `Shell` = chargement de données serveur + layout ;
  `Sidebar` = navigation cliente (état actif). La structure `NAV_GROUPS` est l'unique
  source de la liste de navigation.
- `DossierSwitcher` (client, existant) est rendu à l'intérieur de `Sidebar`.

## 5. Flux et état actif

- À chaque rendu, `Sidebar` lit `usePathname()`. Une entrée est active lorsque le pathname
  courant est égal à son `href` **ou** en est un sous-chemin (ex. `/ventes/factures/nouvelle`
  active « Factures clients »). On retient la correspondance la plus longue pour éviter
  qu'un préfixe court (`/etats`) ne s'active sur `/etats/tva`.
- L'entrée active porte `aria-current="page"` et un style visuel distinct.
- `module` n'est plus nécessaire au surlignage ; la prop reste acceptée (optionnelle) pour
  ne pas casser les appels existants, mais n'est plus utilisée par la navigation.

## 6. Gestion des cas limites

| Cas | Comportement |
|---|---|
| Aucun dossier sélectionné | Sidebar visible ; la zone de contenu affiche l'écran « aucun dossier » (inchangé). |
| Pathname inconnu (hors liste) | Aucune entrée active (pas d'erreur). |
| Sous-chemin d'une entrée | L'entrée parente est active (correspondance par préfixe la plus longue). |

## 7. Tests

Runner **vitest** + environnement **jsdom** (déjà configuré). Fichier `Sidebar.test.tsx` :

1. **Couverture IA** : les 4 en-têtes de groupe et les 10 liens attendus (avec leurs `href`)
   sont rendus.
2. **État actif** : avec `usePathname` mocké à `/lettrage`, le lien « Lettrage » porte
   `aria-current="page"` et les autres non.
3. **Sous-chemin** : avec `usePathname` mocké à `/ventes/factures/nouvelle`, le lien
   « Factures clients » est actif.
4. **Anti-régression liens morts** : aucun lien rendu n'a `href="#"`.

`usePathname` est mocké via `vi.mock("next/navigation", ...)`, conformément au pattern de
test des composants clients déjà en place.

## 8. Décisions actées

- **Sidebar gauche persistante** (vs barre du haut Odoo actuelle ou hybride) : standard des
  logiciels comptables à nombreux écrans ; IA toujours visible.
- **Approche « menu seulement »** (vs pages-de-phase ou restructuration d'URL) : règle le
  cœur du problème de navigation avec un risque minimal, sans empiéter sur les tranches
  Dashboard/Parcours ni casser les URLs/bookmarks.
- **Budget** classé sous « États & déclarations » (outil de pilotage/reporting).
- Les sections du cycle sans page (Clôture, etc.) ne sont **pas** affichées tant que vides,
  pour éviter de réintroduire des liens morts.
