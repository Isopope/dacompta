# Tableau de bord cockpit — Design

- **Date** : 2026-06-21
- **Statut** : Validé (brainstorming) — en attente de plan d'implémentation
- **Module** : `dacompta` — page d'accueil (`src/app/page.tsx`) + couche `src/server`
- **Tranche** : 2/3 de la refonte UX (précédente : Navigation & IA ✅ ; suivante : Parcours guidés)

## 1. Contexte et motivation

La Tranche 1 a rendu toutes les pages accessibles via une sidebar organisée selon le cycle
comptable. Mais le **point d'entrée** reste pauvre : `src/app/page.tsx` n'est qu'une grille
plate de 6 liens, sans information ni orientation. Le comptable de cabinet qui ouvre l'app
n'a aucune réponse à « qu'est-ce qui est urgent, et qu'est-ce que je traite maintenant ? ».

Par ailleurs, une fonction backend riche, `getDashboardStats` (`src/server/dashboard.ts`),
calcule déjà des KPIs (résultat net, trésorerie, CA, charges, nb pièces, nb brouillons) et
une carte de synthèse par journal — mais elle est **orpheline** : aucune page ne la
consomme.

Cette tranche transforme l'accueil en **cockpit** : un vrai point d'entrée qui agrège le
travail entrant. Elle s'inspire de la hiérarchie d'information de la spec design
« Ma journée » (`dacompta/project/DaCompta - Spec Ma journee.html`) — actions primaires →
à traiter → mes dossiers → journaux → états — mais s'en tient **strictement à ce que le
backend permet aujourd'hui** : pas d'OCR, pas d'inbox WhatsApp, pas de copilote IA. Ces
briques de la vision « Ma journée » sont hors périmètre (backend net-nouveau).

**Utilisateur cible** : comptable / cabinet OHADA tenant les livres de plusieurs PME.

## 2. Périmètre

### Inclus
- Remplacement de la grille plate de l'accueil par un cockpit, enveloppé dans `<Shell>`.
- Branchement de `getDashboardStats` (KPIs + cartes journaux), aujourd'hui orphelin.
- Trois listes actionnables dérivées des **données existantes** : « à contrôler »
  (brouillons), « à lettrer » (lignes ouvertes de tiers), « à déclarer » (TVA nette due).
- Une **prochaine action** recommandée (règle de priorité déterministe).
- Une vue portefeuille **multi-dossier** légère « Mes dossiers ».

### Exclu (vision « Ma journée » / tranches suivantes / hors scope)
- Inbox de pièces, OCR, canaux WhatsApp/e-mail/scan, pré-imputation IA, copilote.
- Moteur d'échéances fiscales par pays (DSF, TVA, CNSS, IS) et agenda transverse.
- Détecteur d'anomalies, système d'autorisations par rôle, mode hors-ligne.
- Parcours guidés / onboarding — tranche 3.
- Toute modification du schéma de données ou des URLs existantes.

## 3. Architecture des composants

```
src/server/cockpit.ts          (Créer) — "use server"
    getCockpit(dossierId): Promise<Cockpit>
    Compose getDashboardStats + getOpenLines + getDeclarationTVA (Promise.all) et
    dérive prochaineAction. Source unique de l'état du cockpit du dossier courant.

src/server/cockpit.test.ts     (Créer)
    KPIs agrégés ; table de cas pour prochaineAction ; counts à-lettrer / à-déclarer.

src/server/portefeuille.ts     (Créer) — "use server"
    getPortefeuille(): Promise<ResumeDossier[]>
    Pour chaque dossier (listerDossiers), compteurs LÉGERS : piece.count brouillons,
    getOpenLines().length, getDeclarationTVA().netteDue. Pas de balance complète.

src/server/portefeuille.test.ts (Créer)
    Résumés par dossier corrects, isolation entre dossiers.

src/app/page.tsx               (Modifier) — Server Component
    Lit le dossier courant (getDossierIdCookie). Rend le cockpit dans <Shell>.
    Sous garde `dossier &&` : actions primaires, à-traiter, KPIs, journaux.
    HORS garde (toujours visible) : la table « Mes dossiers » (getPortefeuille).

src/app/MesDossiers.tsx        (Créer) — "use client"
    Table portefeuille + bouton « Ouvrir » → server action choisirDossier (existante)
    puis rafraîchissement. Seul composant interactif ; le reste est rendu serveur.
```

### Types

```ts
// src/server/cockpit.ts
interface FileControler { count: number; href: "/ecritures"; }
interface FileLettrer   { count: number; href: "/lettrage"; }
interface FileDeclarer  { netteDue: number; href: "/etats/tva"; }
interface ProchaineAction { libelle: string; href: string; raison: string; }

interface Cockpit {
  kpis: KpisGlobaux;          // réutilisé de dashboard.ts
  journaux: CarteJournal[];   // réutilisé de dashboard.ts
  aControler: FileControler;
  aLettrer: FileLettrer;
  aDeclarer: FileDeclarer;
  prochaineAction: ProchaineAction | null;
}

// src/server/portefeuille.ts
interface ResumeDossier {
  id: string; nom: string;
  nbBrouillons: number; nbALettrer: number; tvaDue: number;
}
```

## 4. Logique « prochaine action »

Règle de priorité déterministe — le premier critère non vide gagne :

| Ordre | Condition | Libellé | Cible |
|---|---|---|---|
| 1 | `kpis.nbBrouillons > 0` | « Valider N pièces en brouillon » | `/ecritures` |
| 2 | `aLettrer.count > 0` | « Lettrer N lignes de tiers » | `/lettrage` |
| 3 | `aDeclarer.netteDue > 0` | « Déclarer la TVA (montant) » | `/etats/tva` |
| 4 | aucun | `null` → affiche « Rien d'urgent. » | — |

Centralisée dans `getCockpit`, donc couverte par une table de cas en test.

## 5. Page & zones (ordre d'affichage)

Dans `<Shell breadcrumb={[{ label: "Tableau de bord" }]}>` :

1. **Actions primaires** — `+ Saisir une pièce` (`/ecritures`), `Nouvelle facture`
   (`/ventes/factures/nouvelle`). Boutons évidents (pas de palette de commandes).
2. **À traiter** — bandeau **prochaine action** mis en avant + 3 cartes cliquables
   À contrôler / À lettrer / À déclarer (compteur ou montant).
3. **KPIs** — résultat net, trésorerie, CA, charges en panneaux `.panel`, montants en
   `class="mono"`, formatés `toLocaleString("fr-FR")` + devise du dossier.
4. **Mes dossiers** — table portefeuille : Société · brouillons · à lettrer · TVA due ·
   *Ouvrir*. Toujours affichée (point d'entrée), y compris sans dossier courant.
5. **Journaux** — grille de `CarteJournal` (déjà fournies par `getDashboardStats`).

Style : chrome existant de l'app (Inter / Space Mono, `--accent` teal, `.panel`), cohérent
avec la Tranche 1 — pas le style « croquis » des maquettes de documentation.

## 6. Gestion des cas limites

| Cas | Comportement |
|---|---|
| Aucun dossier courant | `Shell` affiche « aucun dossier » dans le contenu sous garde ; **« Mes dossiers » reste affichée** au-dessus/à côté pour permettre le choix d'un dossier. |
| Dossier vide (0 pièce) | KPIs à 0 ; listes à 0 avec libellés « Rien à contrôler / lettrer / déclarer » ; `prochaineAction = null`. |
| Aucun dossier en base | « Mes dossiers » affiche un état vide invitant à créer un dossier. |
| Montants | `toLocaleString("fr-FR")` + devise du dossier, comme les pages existantes. |

## 7. Tests

Runner **vitest** (déjà configuré), pattern `src/server/*.test.ts` :

1. **`cockpit.test.ts`**
   - KPIs agrégés cohérents avec un jeu de pièces connu.
   - **Table de cas `prochaineAction`** : brouillons prioritaires ; puis à-lettrer ;
     puis TVA due ; puis cas vide → `null`.
   - `aLettrer.count` = nb de lignes ouvertes ; `aDeclarer.netteDue` = TVA nette.
2. **`portefeuille.test.ts`**
   - Compteurs par dossier corrects ; **isolation** : les compteurs d'un dossier
     n'incluent pas les pièces d'un autre.

Pas de test de rendu de page (cohérent avec l'app : aucun test page-level existant).

## 8. Décisions actées

- **Approche « agrégateur serveur fin »** (vs tout-en-page, vs fetch client) : logique
  testable côté serveur, cohérente avec la couche `src/server`, « prochaine action »
  centralisée. La page reste mince.
- **Cockpit pragmatique mono-dossier + bande portefeuille légère** : on n'implémente que ce
  que le backend permet aujourd'hui ; la vision « Ma journée » (IA, OCR, échéances) reste
  documentée mais hors périmètre.
- **« Mes dossiers » visible même sans dossier courant** : c'est sa vocation de point
  d'entrée (choisir par quoi commencer la journée).
- **Compteurs légers pour le portefeuille** (pas de balance complète par dossier) : maîtrise
  de la performance sur ~14 dossiers.
- **Style = chrome existant de l'app**, hiérarchie d'information empruntée à « Ma journée ».
```
