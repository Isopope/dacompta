# DaCompta — Incrément 1 : Plan comptable (autonome)

_Spec de design — 2026-06-14_

## Contexte

DaCompta est un produit de comptabilité OHADA (SYSCOHADA / SYCEBNL) pour la zone
Afrique francophone, documenté jusqu'ici sous forme de maquettes wireframe (cas fil
rouge « Les Associés SA », Lomé). Cet incrément est la **première brique fonctionnelle
réelle** du produit : on quitte la maquette pour une feature persistée, avec de vraies
règles SYSCOHADA.

**Objectif retenu (brainstorming) :** _avancer le produit dans l'ordre comptable_
(Configuration → Saisie → Restitution → Clôture), pas faire une démo isolée.

**Décision de cadrage :** on construit le **Plan comptable en autonome d'abord**
(seed d'un plan SYSCOHADA par défaut + CRUD + import), la création de société /
configuration par pays viendra dans un incrément ultérieur.

### Tension identifiée et sa résolution

La promesse n°1 du produit est le **zéro-config** (« le plan SYSCOHADA est natif et
déjà juste, le comptable n'a rien à reparamétrer »). Construire un CRUD de plan
comptable comme première brique entre en tension avec cette promesse. Résolution :
le plan est **seedé et correct par défaut** ; le CRUD sert à l'**ajustement** (ajouter
un compte propre au dossier, importer un plan existant lors d'une reprise), pas à le
construire de zéro. L'écran assume donc le rôle « consulter + ajuster », conforme au
zéro-config.

L'entorse à l'ordre comptable (un plan sans société qui le porte) est **neutralisée
techniquement** : tout compte appartient dès maintenant à un `Dossier` (seedé par
défaut). Quand la vraie configuration par pays arrivera, elle ne fera que créer
d'autres `Dossier` — aucune migration douloureuse.

## Périmètre

### Dans le périmètre

- **Onglet Plan** — arbre des 8 classes SYSCOHADA + table des comptes filtrable
  (par n° ou intitulé, par classe). Créer / éditer / archiver un compte via un panneau
  latéral (drawer).
- **Logique du n° de compte** — saisie d'une racine (ex. `401`) complétée à 6 chiffres ;
  **nature auto-déduite de la racine** (40→Fournisseurs, 41→Clients, 52→Banques…) ;
  **report N+1 déduit de la classe**.
- **Onglet Natures** — table de mapping racine→nature, seedée et conforme SYSCOHADA
  révisé. Lecture par défaut ; édition des bornes/natures en mode « avancé » (optionnel,
  peut être différé sans casser l'incrément).
- **Onglet Importer** — import Excel/CSV réel : upload du fichier, mapping de colonnes
  par contenu (ordre indépendant), aperçu avec contrôles (doublons fusionnés, comptes
  hors-SYSCOHADA signalés), mode **Fusionner / Remplacer / Ajouter**, import
  **réversible** (annulation via journal).
- **Règles d'intégrité réelles, applicables maintenant :** renommage libre ; numéro
  unique par dossier ; suppression = **archivage** (jamais de hard-delete) ; validation
  SYSCOHADA à la création (n° rattaché à une classe/racine connue).

### Hors périmètre (incréments suivants)

- Création de société / configuration par pays (référentiels multiples, IFRS, plan
  national).
- Structure comptable (tiers, analytique, journaux).
- Saisie d'écritures, restitution (balance, états), clôture.
- Règle « numéro figé après écriture » : **déclarée** dans l'UI mais non déclenchable
  tant qu'il n'existe pas d'écritures.

## Modèle de données (Prisma / SQLite)

- **Dossier** _(société)_ — seedé avec un dossier par défaut « Les Associés SA »
  (Lomé, référentiel SYSCOHADA révisé, devise XOF). Tout `Compte` appartient à un
  `Dossier`. Champs : `id`, `nom`, `ville`, `pays`, `referentielId`, `devise`,
  `exercice`.
- **Referentiel** — `SYSCOHADA_REVISE` (extensible IFRS / plan national plus tard).
  Champs : `id`, `code`, `libelle`.
- **Classe** — n° (1–8), libellé, `referentielId`. Champs : `id`, `numero`, `libelle`,
  `referentielId`.
- **Nature** — racine (ex. `40`), libellé, famille
  (`TIERS` / `CAPITAUX` / `TRESORERIE` / `GESTION` / `IMMO` / `STOCK`), `reportNplus1`.
  Champs : `id`, `racine`, `libelle`, `famille`, `reportNplus1`, `referentielId`.
- **Compte** — `id`, `numero` (6 ch.), `intitule`, `type` (`DETAIL` | `TOTAL`),
  `classeNum`, `natureRacine` (déduit), `reportNplus1` (déduit), `collectif` (bool),
  `statut` (`ACTIF` | `ARCHIVE`), `dossierId`. Contrainte **unique (dossierId, numero)**.
- **ImportLog** — réversibilité : `id`, `dossierId`, `fichierNom`, `mode`, `createdAt`,
  `snapshotAvant` (JSON), `compteIdsAffectes` (JSON), `annule` (bool).

## Logique comptable réelle (le cœur de « réel »)

1. **Complétion** : racine saisie → 6 chiffres (complétée par des zéros à droite).
2. **Détection de nature** depuis la racine via la table `Nature`, avec garde-fous
   SYSCOHADA : numéro dont la classe/racine est inconnue → signalé, pas silencieux.
3. **Déduction du report N+1** selon la classe : classes 1–5 (bilan) reportées ;
   classes 6/7/8 (gestion/HAO) remises à zéro.
4. **Unicité + intégrité** : numéro unique par dossier ; archivage au lieu de suppression.
5. **Import tolérant à l'ordre** : mapping par contenu (une colonne de n° est reconnue
   comme telle quel que soit son rang), dédoublonnage, signalement hors-SYSCOHADA,
   annulation via `ImportLog`.

## Pile technique & persistance

- **Next.js (App Router) + TypeScript**.
- **Prisma + SQLite** (migration Postgres ultérieure triviale).
- Mutations via **server actions** / route handlers ; lecture côté serveur.
- **Seed** sourcé du standard **SYSCOHADA révisé** depuis la page projet
  « Référentiel SYSCOHADA » (classes, natures, comptes du cas fil rouge), plutôt
  qu'inventé.
- **UI** : composants React propres et lisibles, **sans investissement hi-fi**
  (design system BatiScript laissé de côté à la demande de l'utilisateur). Structure
  reprise de la maquette : 3 onglets Plan / Natures / Importer + drawer « nouveau compte ».

## Critères de succès

- On peut démarrer l'app, voir un plan SYSCOHADA correct **déjà seedé** (pas un tableau
  vide), filtrer/naviguer par classe.
- Créer un compte en tapant une racine remplit automatiquement nature + report + n° à
  6 chiffres, et refuse un doublon / un n° hors SYSCOHADA.
- Archiver un compte (jamais de suppression dure).
- Importer un fichier Excel/CSV dont les colonnes sont dans un ordre quelconque, voir
  l'aperçu de contrôle, choisir le mode, et pouvoir annuler l'import.
- Les données survivent à un redémarrage (persistées en SQLite).
