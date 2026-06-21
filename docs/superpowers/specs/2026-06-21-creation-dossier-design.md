# Création de dossier (onboarding société) — Design

- **Date** : 2026-06-21
- **Statut** : Validé (brainstorming) — en attente de plan d'implémentation
- **Module** : `dacompta` — `src/server/dossiers.ts`, `src/lib/syscohada/referentiel.ts`, `src/app/dossiers/nouveau/`
- **Tranche** : 3/3 de la refonte UX (premier sous-projet : *création de dossier*). Le fil guidé saisie→contrôle→clôture est un sous-projet ultérieur distinct.

## 1. Contexte et motivation

L'application ne permet pas de **créer un dossier** : `src/server/dossiers.ts` n'expose que
`listerDossiers`, `getDossierCourant`, `choisirDossier`. Les dossiers n'existent que via le
script de seed (`prisma/seed.ts`) ou une insertion directe en base. Le `DossierSwitcher` ne
fait que sélectionner un dossier existant, et l'état vide du cockpit (Tranche 2) invite à
« Créez-en un pour commencer » sans qu'aucun parcours ne le permette — un cul-de-sac.

Ce sous-projet introduit la création de dossier, en s'inspirant du flux maquetté
`dacompta/project/DaCompta - Flux Création société.html` (assistant « zéro-config », pays →
valeurs intelligentes, écran de préparation, société prête), **réduit à ce que le backend
permet réellement**.

**Point clé.** Créer la seule ligne `Dossier` produirait un dossier inutilisable : sans
**journaux** ni **plan de comptes**, aucune pièce ne peut être saisie (`creerPiece` exige des
comptes et un journal existants), et il n'existe aucune UI pour créer un journal. La création
doit donc **amorcer** un dossier opérationnel.

## 2. Périmètre

### Inclus
- Une **donnée de référence** `COMPTES_BASE_SYSCOHADA` : plan SYSCOHADA de base curé (~70
  comptes), propre et réutilisable (≠ `COMPTES_LES_ASSOCIES`, qui est de la donnée de démo
  spécifique au cas « Les Associés SA »).
- Une server action `creerDossier(input)` qui amorce, **atomiquement**, dossier + journaux
  standards + plan de comptes de base + taxes TVA du pays.
- Un **assistant client 3 étapes** à `/dossiers/nouveau`.
- Points d'entrée : état vide du cockpit (`MesDossiers`) et `DossierSwitcher`.

### Exclu (hors périmètre — aspirations du mockup non branchables, ou autre sous-projet)
- Pré-remplissage par NIF/IFU, assistant IA de remplissage.
- Référentiels IFRS / plan national / personnalisé (seul `SYSCOHADA_REVISE` existe).
- Multi-devises, multi-établissements, comptes Mobile Money dédiés, DSF/AIRSI, acomptes IS.
- Champs d'identité étendus (forme juridique, capital, RCCM, régime fiscal, NIF…) : non
  stockés par le modèle `Dossier`, non utilisés par le moteur comptable → YAGNI.
- Import de balance d'ouverture, invitation de collaborateurs, fil guidé saisie→clôture.
- Plan SYSCOHADA complet (~700 comptes) : éventuel travail de données dédié, ultérieur.

## 3. Architecture des composants

```
src/lib/syscohada/referentiel.ts        (Modifier)
    + export const COMPTES_BASE_SYSCOHADA: CompteSeed[]   (~70 comptes, voir Annexe A)
    Donnée de référence pure. Réutilise le type CompteSeed existant.

src/server/dossiers.ts                   (Modifier) — "use server"
    + creerDossier(input): Promise<{ id: string }>
    Amorçage atomique (prisma.$transaction). Réutilise les helpers de
    src/lib/syscohada/compte-logic.ts (extraireClasse, detecterNature, deduireReport,
    deduireAccountType, deduireReconciliable) — mêmes dérivations que le seed.

src/server/dossiers.test.ts              (Créer)
    Tests d'intégration de creerDossier (contenu amorcé, isolation, atomicité).

src/app/dossiers/nouveau/page.tsx        (Créer) — Server Component
    Charge la liste PAYS et rend le wizard. Page autonome (pas de dossier courant requis).

src/app/dossiers/nouveau/NouveauDossierWizard.tsx  (Créer) — "use client"
    Assistant 3 étapes (état local), appelle creerDossier puis choisirDossier puis
    router.push("/").

src/app/MesDossiers.tsx                   (Modifier)
    État vide : remplacer le texte par un lien « + Nouveau dossier » → /dossiers/nouveau.

src/components/DossierSwitcher.tsx        (Modifier)
    Ajouter une entrée/bouton « + Nouveau dossier » → /dossiers/nouveau.
```

## 4. Données de référence — plan de base (`COMPTES_BASE_SYSCOHADA`)

Liste curée couvrant les 8 classes SYSCOHADA (numéros à 6 chiffres, cohérents avec l'existant).
Type réutilisé : `CompteSeed { numero; intitule; type: "DETAIL"|"TOTAL"; collectif? }`. Voir la
liste complète en **Annexe A**. Contraintes :
- `401000` et `411000` marqués `collectif: true` (tiers obligatoire sur leurs lignes).
- **Doit inclure** les comptes dont dépendent les taxes et les états : `443100` (TVA
  collectée), `445100`/`445200` (TVA déductible), `401000`/`411000` (tiers), `521000`/`571000`
  (trésorerie), et des racines de classes 6 et 7 (charges/produits) pour le résultat.
- `classeNum`, `natureRacine`, `reportNplus1`, `accountType`, `reconciliable` ne sont **pas**
  stockés dans la liste : ils sont **dérivés** à la création via les helpers `compte-logic`
  (comme le seed), garantissant la cohérence avec le référentiel.

> Note d'implémentation : la liste de l'Annexe A est un point de départ curé ; les numéros et
> intitulés seront recoupés avec le référentiel SYSCOHADA révisé officiel pendant
> l'implémentation (étape de vérification, pas un TBD).

## 5. Amorçage serveur — `creerDossier`

```ts
interface CreerDossierInput {
  nom: string;
  ville: string;
  pays: string;     // doit appartenir à PAYS (src/lib/syscohada/referentiel.ts)
  devise: string;   // pré-rempli depuis PAYS, modifiable
  exercice: number; // année, ex. 2026
}
export async function creerDossier(input: CreerDossierInput): Promise<{ id: string }>
```

Déroulé :
1. **Validation** : `nom` non vide (trim) ; `exercice` entier dans une plage plausible
   (p. ex. 2000–2100) ; `pays` présent dans `PAYS` ; `devise` non vide. Sinon `throw`.
2. **Référentiel** : `prisma.referentiel.findFirst({ where: { code: REFERENTIEL_CODE } })`.
   Absent → `throw` « Référentiel SYSCOHADA introuvable : lancez `npm run db:seed`. »
3. **Transaction atomique** (`prisma.$transaction`) :
   a. `dossier.create` (nom, ville, pays, devise, exercice, referentielId).
   b. Journaux standards (`createMany`) : `ACH`/Achats/purchase, `VT`/Ventes/sale,
      `CAI`/Caisse/cash, `BIMA`/Banque/bank, `OD`/Opérations diverses/misc,
      `RAN`/Report à nouveau/misc.
   c. Comptes du plan de base : pour chaque `COMPTES_BASE_SYSCOHADA`, dériver
      `classeNum`/`natureRacine`/`reportNplus1`/`accountType`/`reconciliable` via les helpers,
      puis créer (avec `collectif`).
   d. Taxes TVA : taux du pays (`PAYS[pays].tva`) → `TVA{taux}` (usage `sale`, compte
      `443100`) et `TVA{taux}A` (usage `purchase`, compte `445200`).
4. Retourne `{ id }`.

Atomicité : toute erreur en cours de transaction annule l'ensemble — aucun demi-dossier.

## 6. Assistant client (3 étapes)

Page `/dossiers/nouveau` (autonome, ne requiert pas de dossier courant). `NouveauDossierWizard`
tient l'état local et avance/recule entre étapes :

- **① Pays & identité** : grille de cartes depuis `PAYS` (sélection → pré-remplit `devise` et
  affiche la TVA) ; champs `nom` (raison sociale) et `ville`.
- **② Exercice & devise** : `exercice` (année, défaut = année courante) ; `devise` (pré-remplie,
  modifiable).
- **③ Préparation** : récapitulatif + aperçu « seront créés : N comptes, 6 journaux, TVA n% » ;
  bouton **Créer & ouvrir** → `creerDossier(input)` → `choisirDossier(id)` → `router.push("/")`.

Style : chrome existant (`.panel`/`.card`/`.chip`/`.muted`). Erreurs serveur affichées sur
l'étape ③ (le bouton repasse actif). Bouton désactivé pendant l'appel (`useTransition`).

## 7. Points d'entrée

- **Cockpit, état vide** (`MesDossiers`) : « Aucun dossier. » + lien **+ Nouveau dossier**
  (`Link` vers `/dossiers/nouveau`), remplaçant le texte « Créez-en un » non actionnable.
- **`DossierSwitcher`** : une entrée **+ Nouveau dossier** (lien) en plus de la liste.

## 8. Schéma de données

Le modèle `Dossier` est **inchangé** (nom, ville, pays, devise, exercice, referentielId, +
dates de verrou existantes). Aucune migration. Les champs riches du mockup ne sont pas stockés.

## 9. Gestion des cas limites

| Cas | Comportement |
|---|---|
| Pays hors `PAYS` | Non proposé par le wizard (seul SYSCOHADA est supporté). |
| Référentiel non seedé | `creerDossier` lève une erreur explicite ; le wizard l'affiche. |
| Échec en cours de transaction | Rollback total : aucun dossier, journal, compte ni taxe créé. |
| Nom déjà existant | Autorisé (pas de contrainte d'unicité ; identité = id). |
| Devise vidée / exercice invalide | Validation serveur → erreur affichée à l'étape ③. |

## 10. Tests (`src/server/dossiers.test.ts`, vitest)

1. **Contenu amorcé** : après `creerDossier`, le dossier existe ; le nombre de journaux = 6 ;
   le nombre de comptes = `COMPTES_BASE_SYSCOHADA.length` ; 2 taxes créées (sale + purchase) ;
   les comptes `443100`/`445200` requis par les taxes existent. Tout scopé au nouveau
   `dossierId`.
2. **Dérivations** : un compte de tiers (`401000`) est `collectif: true` et `reconciliable` ;
   un compte de charge (`601000`) a `classeNum = 6`.
3. **Isolation** : créer un 2ᵉ dossier n'altère pas les compteurs du 1ᵉʳ.
4. **Atomicité** : un input invalide (ex. `nom` vide) lève une erreur et ne crée **aucun**
   dossier (vérifier `dossier.count` inchangé).

Pas de test de rendu du wizard (cohérent avec l'app : aucun test page/composant existant).

## 11. Décisions actées

- **Amorçage atomique via `creerDossier`** (approche 1) plutôt qu'un helper partagé avec le
  seed (évite de toucher au seed qui fonctionne) ou des multi-appels client non atomiques.
- **Plan de base curé (~70 comptes)** en donnée de référence propre, distinct de la démo.
- **Assistant 3 étapes** (vs formulaire unique) : sert l'objectif « parcours guidé » de la
  Tranche 3 et reprend l'esprit du mockup, sans surcharge.
- **Schéma `Dossier` inchangé** : champs d'identité étendus hors périmètre (YAGNI).

## Annexe A — `COMPTES_BASE_SYSCOHADA` (liste curée à transcrire/vérifier)

`type` = `DETAIL` sauf mention ; `collectif: true` indiqué.

**Classe 1 — Ressources durables**
- 101000 Capital social
- 106000 Réserves
- 120000 Report à nouveau
- 130000 Résultat net de l'exercice
- 162000 Emprunts auprès des établissements de crédit
- 165000 Dépôts et cautionnements reçus

**Classe 2 — Actif immobilisé**
- 213000 Logiciels
- 220000 Terrains
- 231000 Bâtiments
- 241000 Matériel et outillage
- 244000 Matériel et mobilier de bureau
- 245000 Matériel de transport
- 275000 Dépôts et cautionnements versés
- 281000 Amortissements des bâtiments
- 284400 Amortissements du matériel et mobilier de bureau
- 284500 Amortissements du matériel de transport

**Classe 3 — Stocks**
- 311000 Marchandises
- 321000 Matières premières et fournitures
- 351000 Produits finis
- 388000 Stocks en cours de route

**Classe 4 — Tiers**
- 401000 Fournisseurs (collectif)
- 408000 Fournisseurs, factures non parvenues
- 409000 Fournisseurs débiteurs, avances et acomptes
- 411000 Clients (collectif)
- 416000 Clients douteux ou litigieux
- 418000 Clients, produits à recevoir
- 421000 Personnel, rémunérations dues
- 431000 Sécurité sociale (CNSS)
- 441000 État, impôt sur les bénéfices
- 443100 État, TVA facturée (collectée)
- 445100 État, TVA récupérable sur immobilisations
- 445200 État, TVA récupérable sur achats (déductible)
- 447000 État, autres impôts et taxes
- 471000 Comptes d'attente
- 476000 Charges constatées d'avance
- 477000 Produits constatés d'avance

**Classe 5 — Trésorerie**
- 521000 Banques (comptes locaux)
- 531000 Chèques postaux
- 571000 Caisse
- 585000 Virements internes / de fonds

**Classe 6 — Charges**
- 601000 Achats de marchandises
- 602000 Achats de matières premières
- 604000 Achats stockés de matières et fournitures
- 605000 Autres achats (eau, électricité, carburant)
- 608000 Achats d'emballages
- 611000 Transports
- 622000 Locations et charges locatives
- 624000 Entretien, réparations et maintenance
- 625000 Primes d'assurance
- 627000 Publicité, relations publiques
- 628000 Frais de télécommunications
- 631000 Frais bancaires
- 632000 Rémunérations d'intermédiaires et de conseils
- 641000 Impôts et taxes directs
- 661000 Rémunérations directes versées au personnel
- 663000 Charges sociales
- 671000 Intérêts des emprunts et dettes
- 681000 Dotations aux amortissements d'exploitation

**Classe 7 — Produits**
- 701000 Ventes de marchandises
- 702000 Ventes de produits finis
- 706000 Services vendus
- 707000 Produits accessoires
- 711000 Subventions d'exploitation
- 758000 Produits divers de gestion courante
- 771000 Revenus financiers et assimilés
- 781000 Reprises d'amortissements et provisions

**Classe 8 — Hors activités ordinaires (HAO)**
- 812000 Valeurs comptables des cessions d'immobilisations
- 822000 Produits des cessions d'immobilisations

(~70 comptes. Les libellés/numéros seront recoupés avec le référentiel SYSCOHADA révisé
officiel à l'implémentation.)
