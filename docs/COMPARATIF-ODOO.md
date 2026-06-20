# Comparatif Odoo `account` ↔ DaCompta — 8 axes

> Comparaison rigoureuse entre le module **Odoo 19 `account`** (pris comme référence)
> et le POC **DaCompta** (SYSCOHADA révisé), sur les 8 axes : partie double, plan
> comptable, taxe, lettrage, paiements, inaltérabilité légale, livre comptable,
> plan comptable multisociété.
>
> **Priorité directrice : fidélité au modèle Odoo** — chaque recommandation mappe
> une entité ou un pattern Odoo précis.
>
> Complète `docs/DETTE-COMPTABLE.md` (qui couvre #7, #8, #9 ouverts ; #4, #10a/b
> traités) en y intégrant explicitement **taxes** et **paiements** (absents de la
> roadmap actuelle) et en ré-ordonnant selon la fidélité Odoo.

Échelle d'effort (contexte POC) : **S** < ½ j · **M** 1–2 j · **L** 3–5 j · **XL** > 1 semaine.

---

## État des lieux (avant comparaison)

| Aspect | Constat |
|---|---|
| Stack | Next.js 16 (App Router) + Prisma 6 + **SQLite** + Vitest, TypeScript |
| Volume métier | ~4 400 lignes (`src/lib` + `src/server`), **127 tests verts** |
| Architecture | Server actions pures (`"use server"`), invariants comptables isolés en **fonctions pures** (`src/lib/comptabilite/integrite.ts`, I1–I6) |
| Multi-tenant | ⚠️ **Aucune authentification, session ni contrôle de tenant** — `dossierId` est un simple paramètre |

**Choix le plus structurant de DaCompta** : la séparation entre **invariants purs**
(`integrite.ts` — équilibre, signes, résiduel, lettrage, hash) testables sans base,
et **orchestration** (`src/server/*`). Sur ce point précis, c'est plus propre que la
dispersion de la logique dans le monolithe `account_move.py` d'Odoo (7 357 lignes).

**Trois choix transversaux à garder en tête :**
1. **Les garanties comptables sont applicatives, jamais structurelles** (ni contrainte
   SQL, ni readonly, ni record rule). Excellente lisibilité/testabilité, faible opposabilité.
2. **La fondation « argent exact » est incomplète** : `devise.ts` existe et est juste,
   mais le lettrage l'ignore (`round2` codé en dur). Dette #7, qui contamine l'axe le
   plus sensible (lettrage en FCFA).
3. **Le tiers structuré manque** (#8) et bloque en cascade : auxiliaires, balance âgée,
   lettrage précis, paiements. Verrou central pour passer du POC au réalisme métier.

---

## Convention de lecture

Pour chaque axe : **(R)** modèle Odoo de référence · **(D)** état DaCompta ·
**(Δ)** écart · **(→)** reco fidèle Odoo.

---

## 1. Partie double

**(R) Odoo.** Source de vérité = un champ **`balance` signé unique** sur
`account.move.line` ; `debit`/`credit` en sont *dérivés* (`_compute_debit_credit`).
L'équilibre est garanti par `_check_balanced` (`account_move.py:2763`), un **context
manager enveloppant `create()` ET `write()`**, via une requête **SQL brute**
`HAVING ROUND(SUM(balance)) != 0` — insensible aux recompute ORM. Une écriture
déséquilibrée ne peut jamais être persistée, même par du code interne.

**(D) DaCompta.** `debit` et `credit` stockés séparément (`schema.prisma:167`) ;
équilibre = invariant pur `verifierEquilibre` appliqué à `creerPiece` (`pieces.ts:37`)
+ `validerPieceTx` (`pieces.ts:131`). Contrôle **applicatif uniquement**. Invariants
complémentaires : `verifierSignesLigne` (débit XOR crédit, ≥ 0, `integrite.ts:14`),
`verifierPieceNonVide` (`integrite.ts:25`).

**(Δ) Écart.**
- Modèle de données : deux colonnes vs un `balance` signé → la cohérence repose sur
  l'invariant, pas sur la structure.
- Opposabilité : Odoo verrouille au plus bas niveau (create+write) ; DaCompta seulement
  dans la server action — un `INSERT` direct contourne.

**(→) Reco fidélité Odoo.**
1. Garder debit/credit (lisibilité SYSCOHADA) mais ajouter un `balance` calculé/stocké
   = `debit − credit`, et faire des états la lecture de `balance`. *Effort S, risque faible.*
2. Déplacer `verifierEquilibre` dans un **point unique traversé par toute écriture**
   (wrapper `creerEcritureValidee` ou extension Prisma `$extends` sur create/update de
   `Piece`), pour approcher le `_check_balanced` enveloppant. *Effort M, risque moyen.*

---

## 2. Plan comptable

**(R) Odoo.** `account.account` avec `account_type` (asset_receivable, liability_payable,
income, expense…) qui **porte le comportement** (réconciliable ou non, sens). `code` =
`company_dependent` reconstruit par société (`account_account.py:130`). Hiérarchie via
`account.group` (plages de préfixes) + `account.root` virtuel (`_auto=False`). Plans
livrés par **`chart_template`** avec un **registre de fonctions `@template`**
(`chart_template.py:53`) — **SYSCOHADA nativement supporté** (`SYSCOHADA_LIST`,
`chart_template.py:35`).

**(D) DaCompta.** `Compte` 6 chiffres, `type` DETAIL/TOTAL, `classeNum`, `natureRacine`,
`collectif` (inerte), `statut`. Référentiel SYSCOHADA en données (`Referentiel`/`Classe`/
`Nature`). Détection de nature par racine la plus longue (`compte-logic.ts:20`), report
N+1 déduit de la classe (`deduireReport:15`). FK réelle `LigneEcriture.compteId → Compte`
avec `onDelete: Restrict` (#10a traité).

**(Δ) Écart.**
- Pas d'équivalent `account_type` comportemental : le caractère « réconciliable » d'un
  compte n'est pas porté (Odoo : `account.reconcile`). DaCompta autorise le lettrage sur
  tout compte sans contrôle de type.
- Pas de **hiérarchie de groupes** (`account.group`) : agrégation par préfixe au report.
- `collectif` existe mais inerte (cf. axes 4/5).
- **Mais** : DaCompta est déjà SYSCOHADA-natif par construction, là où Odoo charge un template.

**(→) Reco fidélité Odoo.**
1. Ajouter **`reconciliable: Boolean`** sur `Compte` (= `account.reconcile`) et l'exiger
   dans `verifierLettrageValide`. *Effort S.*
2. Introduire un **`account_type`** SYSCOHADA (enum mappé aux natures) portant le
   comportement (réconciliable, sens bilan/gestion). *Effort M.*
3. (Optionnel) Modèle `GroupeCompte` (préfixe start/end) façon `account.group` pour les
   regroupements normés du Bilan. *Effort M.*

---

## 3. Taxe — *écart le plus fort*

**(R) Odoo.** Moteur dédié `account.tax` (5 308 l.) : `_get_tax_details`/`compute_all`
(`account_tax.py:4960`), gestion **price_include**, **cascade** (`include_base_amount`),
type division, **reverse charge**, **répartition** (`tax_repartition_line` avec `factor`
+ comptes + `tax_tags` pour les grilles de déclaration), **exigibilité** `on_invoice`/
`on_payment` (TVA sur encaissement), **arrondi global déterministe** (distribution du
delta de centimes, `_distribute_delta_amount_smoothly`).

**(D) DaCompta.** Aucun modèle taxe. TVA = **heuristique par préfixe** 443/445
(`pieces.ts:56`), `montantTTC = totalDebit` (`pieces.ts:61`) — faux hors achat simple.
Reconnu provisoire dans le code (`pieces.ts:54-55`).

**(Δ) Écart.** Total : pas de taux, base, ventilation, grilles, ni exigibilité. La **TVA
sur encaissement** (centrale en zone OHADA) est hors modèle. `montantTTC = totalDebit`
est faux dès qu'une pièce n'est pas un achat simple.

**(→) Reco fidélité Odoo.**
1. Modèle **`Taxe`** (= `account.tax`) : `taux`, `typeAmount` (percent/fixed),
   `priceInclude`, `compteCollecte`/`compteDeduct`, `exigibilite`
   (sur_facture/sur_encaissement). *Effort L.*
2. **`LigneTaxe`** générées à la validation (= lignes de taxe Odoo) + champ `taxes` sur
   `LigneEcriture` (= `tax_ids`). Remplacer l'heuristique 443/445 par ces lignes. *Effort L.*
3. `tagsTaxe` sur les lignes (= `tax_tags`) pour préparer les grilles de déclaration TVA. *Effort M.*
4. Réutiliser **`arrondiDevise`** pour l'arrondi (le delta-smoothing d'Odoo n'est pas
   nécessaire tant qu'on est mono-taux par ligne). *Effort S.*

> Dépendance : la TVA sur encaissement s'appuiera sur le lettrage **par tiers** (axes 4/8).

---

## 4. Lettrage

**(R) Odoo.** `account.partial.reconcile` (graphe N:N entre lignes `debit_move_id`/
`credit_move_id`) → `account.full.reconcile` quand le résidu tombe à 0. `reconcile()` →
`_reconcile_plan_with_sync` : devise de rapprochement, **écart de change** auto (garde
anti-faux-écart par fourchette d'arrondi), TVA cash basis au prorata, `matching_number`
par **union-find**. Lettrage **par (compte, partenaire)**. Tout test « est-ce nul ? »
passe par `currency.is_zero()`, tout arrondi par `currency.round()`.

**(D) DaCompta.** Bon modèle de fond : `amountResidual`/`isLettres`, **on ne touche
jamais debit/credit** (`schema.prisma:174-181`) ; `Lettrage` = partial reconcile ; règles
auto avec tolérances % et jours, approche gloutonne déterministe (`reglesLettrage.ts`).
La balance reste indépendante du lettrage (`balance.ts:189-193`, principe juste).

**(Δ) Écart.**
- 🔴 **FCFA faux** : `round2 = Math.round(n*100)/100` codé en dur 2 décimales
  (`lettrage.ts:8`), `isLettres = x === 0` sans `estNulDevise` (`lettrage.ts:101`). La
  devise du dossier de seed est XOF (0 décimale). Dette #7 non résolue côté lettrage
  alors que `devise.ts` fournit déjà les bons outils.
- 🔴 **Pas de tiers** : `verifierLettrageValide` exige `compteDebit === compteCredit` mais
  aucun filtre tiers → deux clients du 411 collectif lettrables ensemble (dette #8).
- Pas d'écart de change, pas de `full.reconcile` matérialisé, pas de TVA cash basis.

**(→) Reco fidélité Odoo.**
1. **Remplacer tout `round2` par `arrondiDevise(montant, devise)`** et tout `=== 0` par
   `estNulDevise` dans `lettrage.ts`/`reglesLettrage.ts` (dette #7). *Effort M, risque
   faible — débloque la justesse FCFA.*
2. Ajouter **`tiersId`** sur `LigneEcriture` (au moins comptes collectifs) et exiger
   **même (compte, tiers)** dans `verifierLettrageValide` (= rapprochement par partenaire
   Odoo). *Effort L (couplé axes 5/8).*
3. (Plus tard) Modèle `FullReconcile` + `matchingNumber` (union-find) pour le marquage
   A/B/C. *Effort M.*

---

## 5. Paiements

**(R) Odoo.** `account.payment` : génère une écriture **équilibrée par construction**
(compte de **liquidité `outstanding`** ↔ compte de tiers), états `draft/in_process/paid`
calculés depuis le lettrage (pas de `_post` propre — délégué à l'`account.move`). Wizard
`account.payment.register` (paiement groupé, partiel, escompte, multi-devises).
`payment_state` de la facture dérivé (`not_paid/partial/in_payment/paid`).

**(D) DaCompta.** Aucun modèle. Un paiement = pièce de trésorerie (journal CAI/BIMA)
saisie puis lettrée manuellement contre la créance/dette.

**(Δ) Écart.** Pas de compte d'attente, pas de registre de paiement, pas d'état de
paiement de la facture, pas de rapprochement bancaire, pas d'écart de change sur règlement.

**(→) Reco fidélité Odoo.**
1. Modèle **`Paiement`** (= `account.payment`) générant une `Piece` équilibrée (compte
   trésorerie ↔ compte tiers via `tiersId`) + **lettrage auto** contre la facture. *Effort
   L (après tiers #8).*
2. Champ **`etatPaiement`** dérivé sur `Piece` facture (= `payment_state`) calculé du
   résiduel. *Effort M.*
3. (Optionnel) Compte **`outstanding`** d'attente pour distinguer « en cours » / « encaissé ». *Effort M.*

---

## 6. Inaltérabilité légale — *le plus mûr chez vous*

**(R) Odoo.** `inalterable_hash` SHA-256 **chaîné par journal+préfixe**
(`_calculate_hashes`, versionné `MAX_HASH_VERSION=4`), activé si `restrict_mode_hash_table` ;
**dates de verrouillage** (`fiscalyear_lock_date`, `tax_lock_date`, **`hard_lock_date`
irréversible**) ; **audit trail restrictif** (messages/PJ non supprimables) ; overrides
`write`/`unlink` + champs readonly sur écriture postée ; correction par extourne.

**(D) DaCompta.** Séquence générée à la validation (`SequencePiece` par dossier/journal/
exercice, format `JOURNAL/AAAA/NNNN`, `pieces.ts:136-153`) ; hash chaîné par (journal,
exercice) ordonné par n° de séquence (`pieces.ts:158-169`), `verifierChaine` rejouable
(`integrite.ts:97`) ; immuabilité via interdiction d'annuler une VALIDEE (`pieces.ts:267`)
et correction par **extourne** atomique (`pieces.ts:204-257`). Vérifié : **aucun chemin
de code ne modifie les lignes d'une pièce validée**. **Très proche d'Odoo sur le principe.**

**(Δ) Écart.**
- Pas de **dates de verrouillage de période** (proposées non implémentées).
- Pas d'**audit trail** des tentatives de modification.
- Garanties applicatives (pas de readonly ORM ni record rule) ; un `UPDATE` SQL direct
  n'est que *détecté*, pas *empêché* (Odoo ajoute readonly + audit trail).
- Tri de chaîne lexicographique sûr seulement < 10 000 pièces/journal/exercice (padding 4).

**(→) Reco fidélité Odoo.**
1. Ajouter **`dateVerrouillage`** par dossier (= lock dates) + refus create/modif/annule
   avant cette date dans les server actions. *Effort M.*
2. **`hardLockDate` irréversible** (clôture définitive d'exercice). *Effort S.*
3. Journaliser les opérations sensibles (validation, extourne, annulation) dans un
   `AuditLog` (= mail.thread/audit trail). *Effort M.*
4. Versionner le hash (`hashVersion`) dès maintenant pour la pérennité. *Effort S.*

---

## 7. Livre comptable

**(R) Odoo.** États **déduits des `move.line`**, plus une couche **`account.report`
déclarative** (rubriques/formules découplées de la balance). **Grand-livre et balance
auxiliaires par partenaire**, **balance âgée** (échéancier), partner ledger.

**(D) DaCompta.** Grand Livre + Balance 6 colonnes déduits en temps réel (`balance.ts`),
RAN comme ouverture, N-1 par `SoldeAnterieur`. Pièces ANNULEE exclues des soldes. Bilan/CR/
TFT regroupés par classe (dette #9). Source unique = les écritures (`balance.ts:6-8`).

**(Δ) Écart.**
- Pas d'**auxiliaires** (bloqué par absence de tiers).
- Pas de **balance âgée**.
- États normés AUDCIF/SIG simplifiés (pas de cascade SIG, pas de liasse réelle).
- Perf : tout en mémoire (`chargerLignes` ramène toutes les lignes puis `.sort()` Node ;
  conversions `Decimal → Number` dans les cumuls).

**(→) Reco fidélité Odoo.**
1. Une fois `tiersId` posé : **grand-livre + balance auxiliaires** et **balance âgée**
   (= aged partner balance). *Effort M (après #8).*
2. Table de **mapping rubrique↔comptes** déclarative (= `account.report`) pour Bilan/CR
   normés + **cascade SIG**. *Effort L (dette #9, parallélisable).*
3. Pré-agrégation SQL (`groupBy` Prisma) pour la balance plutôt que tri mémoire. *Effort M.*

---

## 8. Plan comptable multisociété

**(R) Odoo.** `company_id` partout + **record rules** `('company_id','parent_of',company_ids)`
+ `_check_company`. `code` `company_dependent`, plans instanciés depuis `chart_template`
**par société**, hiérarchie de sociétés, consolidation possible.

**(D) DaCompta.** Société = `Dossier`, isolation par **partition de données** (chaque
dossier duplique ses comptes : `Compte @@unique([dossierId, numero])`), référentiel
SYSCOHADA partagé. **Aucune auth/record rule** (`dossierId` = simple paramètre).

**(Δ) Écart.**
- Sécurité : isolation *par donnée*, pas *par contrôle* → tout `dossierId` est accessible.
- Pas de **template** partagé instancié (duplication physique des comptes).
- Pas de hiérarchie de sociétés ni de consolidation. « Multisociété » = **multi-dossier
  cloisonné**, pas multi-société consolidable.

**(→) Reco fidélité Odoo.**
1. **Couche d'autorisation** : auth + résolution du `dossierId` autorisé côté serveur
   (= record rules multi-company). *Effort L — prérequis produit.*
2. **`PlanTemplate`** SYSCOHADA instancié par dossier (= `chart_template.try_loading`)
   au lieu de dupliquer à la main. *Effort M.*
3. (Long terme) `dossierParent` pour hiérarchie/consolidation (= `parent_of`). *Effort L.*

---

## Synthèse de l'état réel

| Axe | État dans DaCompta | Solidité |
|---|---|---|
| **Partie double** | Invariant pur, double contrôle, arrondi devise | ★★★★☆ (applicatif, pas en base) |
| **Plan comptable** | Fidèle SYSCOHADA, FK réelle, natures par racine | ★★★★☆ (collectif inerte, pas de hiérarchie) |
| **Taxe** | Heuristique par préfixe, pas de moteur | ★☆☆☆☆ (reconnu provisoire) |
| **Lettrage** | Bon modèle résiduel, mais round2 codé en dur + pas de tiers | ★★★☆☆ (faux en FCFA) |
| **Paiements** | Inexistant (écriture + lettrage) | ★☆☆☆☆ |
| **Inaltérabilité** | Séquence + hash chaîné + extourne, bien testé | ★★★★☆ (applicatif, pas de verrou période/audit trail) |
| **Livre comptable** | Déduit des écritures, RAN, N-1 | ★★★☆☆ (pas d'auxiliaires, perf mémoire) |
| **Multisociété** | Partition par dossier, référentiel partagé | ★★★☆☆ (cloisonné, pas de sécurité ni consolidation) |

---

## Roadmap priorisée — fidélité Odoo

| # | Chantier | Pattern Odoo cible | Effort | Risque | Débloque |
|---|---|---|:---:|:---:|---|
| **1** | **round2 → arrondiDevise** partout (#7) | `currency.round/is_zero` | M | Faible | Lettrage FCFA juste |
| **2** | **Tiers structuré + lettrage par (compte,tiers)** (#8) | `res.partner` + comptes collectifs | L→XL | Élevé | Auxiliaires, paiements, balance âgée |
| **3** | **`reconciliable` + `account_type`** sur Compte | `account.reconcile`/`account_type` | M | Faible | Contrôle de lettrage correct |
| **4** | **Moteur de taxes** `Taxe`+`LigneTaxe`+tags | `account.tax`/repartition/tags | L | Moyen | TVA réelle + déclaration |
| **5** | **`Paiement`** + `etatPaiement` | `account.payment`/`payment_state` | L | Moyen | Flux règlement |
| **6** | **Verrou de période + audit log** | lock dates + audit trail | M | Faible | Conformité renforcée |
| **7** | **États auxiliaires + AUDCIF/SIG** (#9) | `account.report` déclaratif | L | Faible | Liasse normée |
| **8** | **Auth/record rules + template plan** | record rules + `chart_template` | L | Moyen | Multisociété réel |

**Chemin critique recommandé :** **1 → 3 → 2 → {4, 5} → 6 → 7 → 8**.

Logique : d'abord l'argent exact (1) et le comportement de compte (3), peu coûteux ;
puis le **tiers (2)**, verrou central dont dépendent paiements, auxiliaires et balance
âgée ; ensuite taxes (4) et paiements (5) en parallèle ; enfin conformité (6), états
normés (7) et industrialisation multisociété (8).

---

## Correspondance des entités (mémo)

| DaCompta | Odoo `account` |
|---|---|
| `Piece` | `account.move` |
| `LigneEcriture` | `account.move.line` |
| `Compte` | `account.account` |
| `Journal` | `account.journal` |
| `Dossier` | `res.company` |
| `Referentiel` / `Nature` / `Classe` | (implicite via `account_type` + `chart_template`) |
| `Lettrage` | `account.partial.reconcile` |
| *(à créer)* `FullReconcile` | `account.full.reconcile` |
| `RegleLettrage` | `account.reconcile.model` |
| `SequencePiece` | `ir.sequence` + `sequence.mixin` |
| `Piece.hash` / `hashPrecedent` | `account.move.inalterable_hash` |
| `extournerPiece` | `account.move._reverse_moves` |
| *(à créer)* `Tiers` | `res.partner` |
| *(à créer)* `Taxe` / `LigneTaxe` | `account.tax` / `tax_repartition_line` |
| *(à créer)* `Paiement` | `account.payment` |
| *(à créer)* `PlanTemplate` | `account.chart.template` |
