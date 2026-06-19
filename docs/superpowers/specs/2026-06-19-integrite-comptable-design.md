# Design — Intégrité comptable & solidité du schéma

> Date : 2026-06-19 · Projet : DaCompta (POC comptabilité SYSCOHADA révisé) ·
> Stack : Next.js 15 + Prisma + SQLite + Vitest + TypeScript.
> Couvre les points de dette d'audit #4 (séquence/inaltérabilité), #10a (FK) et
> les invariants métier. Voir `docs/DETTE-COMPTABLE.md` pour le contexte.

## 1. Objectif

Rendre la base de données et la couche service **structurellement incapables**
de représenter un état comptable invalide, et garantir la **traçabilité légale**
des pièces (séquence sans trou, inaltérabilité, correction par extourne).

## 2. Décisions de cadrage (validées)

| Sujet | Décision |
|-------|----------|
| Périmètre | Référentiel (FK) + invariants métier + séquence/inaltérabilité légale |
| Moteur | **Hybride sur SQLite** : contraintes DB là où SQLite les assure + couche service durcie + tests de propriété (`fast-check`) |
| Correction d'une pièce validée | **Gel total + extourne** ; `ANNULEE` réservé aux `BROUILLON` |
| Séquence | Par `(dossier, journal, exercice)`, format `ACH/2020/0001`, attribuée **à la validation** |
| Date d'extourne | Date du jour par défaut (surchargeable) |
| Données existantes | **Renumérotation** à la migration |
| Architecture | **Approche A** : invariants en fonctions pures dans `src/lib`, appelés par services + tests |

**Hors périmètre** (dette séparée) : multi-devises complet (#7 — on pose seulement
l'arrondi par devise du dossier), tiers structurés (#8), états AUDCIF/SIG (#9),
lettrage automatique origine↔extourne.

## 3. Architecture (Approche A)

```
src/lib/comptabilite/integrite.ts   ← invariants PURS (sans accès DB)
        ▲                    ▲
        │ appelle            │ prouve (fast-check)
src/server/*.ts (services)   src/lib/comptabilite/integrite.test.ts
        │
        ▼
Prisma + SQLite              ← contraintes FK / UNIQUE / CHECK
```

- **Invariants** = fonctions pures recevant des données et levant `ErreurIntegrite`.
  Aucune dépendance Prisma → prouvables isolément.
- **Services** orchestrent en transaction et invoquent les invariants.
- **DB** garantit ce que SQLite sait faire (FK, UNIQUE, CHECK mono-ligne).

## 4. Schéma de données (`schema.prisma`)

### 4.1 Intégrité référentielle — FK réelles

```prisma
model LigneEcriture {
  // ...
  compteId      String          // NOUVEAU — ancre d'intégrité
  compte        Compte @relation(fields: [compteId], references: [id], onDelete: Restrict)
  compteNumero  String          // conservé, DÉNORMALISÉ : copié du compte à la création, jamais édité seul
}

model SoldeAnterieur {
  compteId      String          // NOUVEAU — FK
  compte        Compte @relation(fields: [compteId], references: [id], onDelete: Restrict)
  compteNumero  String          // conservé, dénormalisé
}
```

- Une ligne/solde ne peut plus référencer un compte inexistant.
- Un compte mouvementé ne peut plus être supprimé (`Restrict`).
- `compteNumero` reste pour les rapports (balance, budget, états) : reflet fidèle
  du compte, posé à la création, jamais modifié indépendamment.
- `BudgetPoste.compteLie` **reste une chaîne** : c'est un **préfixe** par conception.

### 4.2 Pièce — champs légaux

```prisma
model Piece {
  // ... existant ...
  exercice       Int            // fixé à la validation (année de datePiece)
  dateValidation DateTime?
  hash           String?        // empreinte d'inaltérabilité
  hashPrecedent  String?        // chaînage (hash de la pièce validée précédente du même journal/exercice)
  extourneDeId   String?
  extourneDe     Piece?  @relation("Extourne", fields: [extourneDeId], references: [id])
  extournes      Piece[] @relation("Extourne")
}
```

### 4.3 Compteur de séquence

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

### 4.4 Contraintes `CHECK` mono-ligne (SQL de migration, non exprimables en Prisma/SQLite)

- `LigneEcriture` : `debit >= 0`, `credit >= 0`, `NOT (debit > 0 AND credit > 0)`, `amountResidual >= 0`
- `Lettrage` : `montant > 0`
- Domaines : `Piece.statut IN ('BROUILLON','VALIDEE','ANNULEE')`,
  `Compte.statut IN ('ACTIF','ARCHIVE')`, `Compte.type IN ('DETAIL','TOTAL')`,
  `BudgetPoste.sens IN ('P','C')`

## 5. Module d'invariants (`src/lib/comptabilite/integrite.ts`)

```ts
export class ErreurIntegrite extends Error {}

// I1 — Partie double : Σ débits = Σ crédits (arrondi selon la devise du dossier).
export function verifierEquilibre(lignes, devise): void
// I2 — Signe : debit ≥ 0, credit ≥ 0, jamais les deux > 0.
export function verifierSignesLigne(ligne): void
// I3 — Pièce non vide et mouvementée (refus d'une pièce à zéro / sans ligne).
export function verifierPieceNonVide(lignes): void
// I4 — Lettrage : même compte, montant > 0, montant ≤ min(résiduels), sens opposés, même dossier.
export function verifierLettrageValide(ligneD, ligneC, montant, dossierId, devise): void
// I5 — Cohérence du résiduel : amountResidual = |debit − credit| − Σ(lettré), ≥ 0.
export function verifierResiduel(ligne, montantLettre): void
// I6 — Inaltérabilité.
export function calculerHash(piece, lignes, hashPrecedent: string | null): string
export function verifierChaine(piecesOrdonnees): void
```

- Tous les montants en `Prisma.Decimal` + arrondi selon la devise du dossier
  (pose la base de #7 sans implémenter le multi-devises).
- `calculerHash` = hachage déterministe de `(données métier de la pièce + lignes
  triées + hashPrecedent)`. Altérer une ligne casse la chaîne.

## 6. Flux de validation (`validerPiece`)

```
validerPiece(id) :
  1. Charger pièce + lignes ; refuser si statut ≠ BROUILLON.
  2. Invariants : verifierPieceNonVide ; verifierSignesLigne(∀) ; verifierEquilibre.
  3. exercice = année(datePiece).
  4. EN TRANSACTION :
       a. Incrémenter SequencePiece(dossier, journal, exercice) → N
       b. numeroPiece = `${journal.code}/${exercice}/${N sur 4 chiffres}`
       c. hashPrecedent = hash de la dernière pièce VALIDEE du même (journal, exercice)
       d. hash = calculerHash(piece, lignes, hashPrecedent)
       e. UPDATE piece : statut=VALIDEE, numeroPiece, exercice, dateValidation, hash, hashPrecedent
```

**Gel (inaltérabilité) :** tous les services d'écriture refusent d'agir sur une
pièce `VALIDEE` → `ErreurIntegrite`. `annulerPiece` est restreint aux `BROUILLON`
(et conserve la restitution des lettrages déjà corrigée). Les `BROUILLON` portent
une référence provisoire `BROUILLON-<id court>` jusqu'à validation.

**Concurrence (SQLite) :** SQLite sérialise les écritures ; incrément du compteur,
lecture du hash précédent et écriture se font dans une même transaction → ni trou
ni collision.

## 7. Extourne (`extournerPiece`)

```
extournerPiece(id, dateExtourne = aujourd'hui) :
  1. Refuser si statut ≠ VALIDEE, ou si la pièce a déjà été extournée.
  2. Créer une pièce (même journal) avec lignes inversées (debit ↔ credit),
     mêmes compteId, libellé préfixé « Extourne — », extourneDeId = origine.
  3. La valider immédiatement (→ son propre numéro de séquence + hash).
```

- La pièce d'origine reste intacte ; les mouvements opposés rééquilibrent les soldes.
- Une origine ne peut être extournée qu'une fois.

## 8. Migration — procédure *fail-fast*

**Principe : rien n'est modifié tant que les données ne sont pas prouvées saines.**

- **Phase 0 — Pré-vol (lecture seule).** Audit détectant TOUTES les anomalies
  bloquantes (orphelins de compte, pièce VALIDEE déséquilibrée, ligne debit&credit,
  montant négatif, résiduel incohérent, lettrage inter-dossier ou montant ≤ 0,
  statut/sens/type hors domaine, doublon de numéro). Une seule anomalie → STOP,
  aucune écriture, rapport détaillé (compte/pièce/ligne).
- **Phase 1 — Remédiation explicite.** Correction manuelle ou script de remédiation
  dédié et tracé. **Aucune création implicite.** On relance le pré-vol jusqu'au vert.
- **Phase 2 — Migration (si pré-vol vert).** En transaction(s), chaque étape
  re-vérifie ses préconditions :
  - A : colonnes nullable + `SequencePiece` ;
  - B : back-fill `compteId` (échec si une seule résolution échoue) + `exercice` ;
  - C : renumérotation des VALIDEE (tri `journal, exercice, datePiece, createdAt`)
    + chaîne de hash ; `BROUILLON-<id>` / `ANNULEE-<id>` pour les autres ;
  - D : `compteId` non-nullable + FK `Restrict` + `CHECK`.
  Toute erreur → **rollback complet**, état initial préservé.
- **Phase 3 — Post-vérification (preuve).** Re-jouer tous les invariants ;
  `verifierChaine` par (journal, exercice) ; **réconciliation balance avant/après
  identique** (la renumérotation ne change aucun solde). Divergence → échec.
- **Phase 4 — Idempotence.** Script relançable sans effet de bord.

**Impacts assumés :** `creerPiece` garde `compteNumero` en entrée mais résout/valide
`compteId` en interne (lève si absent). `prisma/seed.ts` et les tests créant des
lignes devront seeder les comptes utilisés.

## 9. Stratégie de tests

1. **Invariants — `fast-check`** : pièce équilibrée passe / déséquilibre d'une unité
   échoue ; `amountResidual ≥ 0` toujours ; somme des lettrages ≤ résiduel ; altérer
   une ligne casse la chaîne ; signe rejeté si debit&credit.
2. **Services — exemples** : séquence `ACH/2020/0001` sans trou par (journal,
   exercice) ; refus pièce déséquilibrée/vide ; immuabilité d'une VALIDEE ; extourne
   (inverse validée, balance à l'identique, 2ᵉ extourne refusée) ; FK (compte
   inexistant / archivage d'un compte mouvementé refusés) ; isolation dossier.
3. **Migration** : pré-vol détecte chaque anomalie ; avorte sans écrire ; sur base
   saine balance identique avant/après + chaîne valide + idempotence.
4. **Régression** : les 92 tests verts actuels adaptés (seed des comptes) — aucun rouge.

## 10. Definition of Done

- Schéma migré, FK/CHECK en place, `SequencePiece` opérationnel.
- `integrite.ts` couvert par tests de propriété.
- `validerPiece`/`extournerPiece`/`annulerPiece` conformes aux règles ci-dessus.
- Migration *fail-fast* avec pré-vol, remédiation explicite, réconciliation avant/après.
- Suite verte (régression + nouveaux tests), `tsc --noEmit` propre.
