# Dette de conception comptable — Roadmap

> Évolutions structurelles identifiées lors de l'audit DaCompta ↔ Odoo `account`.
> Ce ne sont **pas** des bugs ponctuels (ceux-ci ont été corrigés, cf. branche
> `fix/comptabilite-audit`) mais des limites de fond du POC à traiter par
> itérations. Numérotation conservée depuis le rapport d'audit (#4, #7, #8, #9, #10).

Échelle d'effort (contexte POC) : **S** < ½ j · **M** 1–2 j · **L** 3–5 j · **XL** > 1 semaine.

---

## Vue d'ensemble & séquencement recommandé

| Ordre | Point | Sujet | Effort | Risque | Dépend de |
|------:|-------|-------|:------:|:------:|-----------|
| 1 | **#7** | Devise & arrondi (FCFA 0 décimale) | M | Faible | — |
| 2 | **#10a** | Intégrité référentielle (FK `compteNumero`) | M | Moyen | — | **traité** — cf. `docs/superpowers/specs/2026-06-19-integrite-comptable-design.md` |
| 3 | **#4 / #10b** | Séquence légale & inaltérabilité des pièces | L | Moyen | #7 | **traité** — cf. `docs/superpowers/specs/2026-06-19-integrite-comptable-design.md` |
| 4 | **#8** | Tiers structurés & comptes auxiliaires | XL | Élevé | #7, #10a |
| 5 | **#9** | États normés AUDCIF & SIG | L | Faible | (#8 pour certaines rubriques) |

**Graphe de dépendances**

```
#7 (devise) ──┬──> #4/#10b (séquence/inaltérabilité)
              └──> #8 (tiers) <── #10a (FK)
#9 (AUDCIF) : largement autonome — peut être mené en parallèle,
              gagne en exactitude une fois #8 livré.
```

**Principe directeur** : commencer par les fondations transverses (argent exact,
intégrité des données) avant les chantiers qui s'appuient dessus (tiers, légal,
états). #9 peut être parallélisé car isolé dans la couche reporting.

---

## #7 — Devise & arrondi  ·  Effort M · Risque faible · *à faire en premier*

**Constat.** Les montants sont stockés en `Prisma.Decimal` (bien) mais les calculs
de lettrage repassent par des `number` JS avec `round2 = Math.round(n*100)/100`
(`src/server/lettrage.ts`, `src/server/reglesLettrage.ts`). 2 décimales **codées en
dur** : faux pour le **FCFA (XOF/XAF), qui a 0 décimale**. Aucune notion de devise
au niveau ligne.

**Impact comptable.** Erreurs d'arrondi et comparaisons « à zéro » fausses dès
qu'une devise n'a pas exactement 2 décimales ; bloque tout multi-devises (l'OHADA
couvre XOF, XAF, GNF, CDF…).

**Référence Odoo.** `res.currency.rounding` / `decimal_places` ; tout test « est-ce
nul ? » passe par `currency.is_zero()` et tout arrondi par `currency.round()`.
Les lignes portent `amount_currency` + `currency_id` distincts de la devise société.

**Approche proposée.**
1. Ajouter `decimales: Int` (et éventuellement `rounding`) sur un modèle devise, ou
   a minima une table de correspondance `XOF→0, EUR→2, …` dans `src/lib`.
2. Remplacer `round2` par `arrondiDevise(montant, devise)` centralisé ; supprimer
   toute constante `*100`.
3. Remplacer les comparaisons `=== 0` / `<= 0` sur montants par `estNul(x, devise)`.
4. (Optionnel, ouvre le multi-devises) `montantDevise` + `deviseId` sur `LigneEcriture`.

**Definition of Done.** Tests : lettrage exact en XOF (entiers, 0 décimale) et en
devise 3 décimales ; `equilibre` du bilan exact (et non `< 0.01`) en FCFA.

---

## #10a — Intégrité référentielle (FK sur `compteNumero`)  ·  Effort M · Risque moyen  ·  ✅ TRAITÉ

**Constat.** `LigneEcriture.compteNumero`, `SoldeAnterieur.compteNumero`,
`BudgetPoste.compteLie` référencent `Compte.numero` **sans FK** (commenté « pas de
FK formelle » dans `schema.prisma`). `balance.ts` doit gérer le cas
`"(compte non référencé)"`.

**Impact comptable.** Une écriture peut pointer un compte inexistant ; aucune
garantie d'intégrité à l'écriture ; archivage d'un compte mouvementé non bloqué.

**Référence Odoo.** `account.move.line.account_id` est un `Many2one` réel,
`ondelete='restrict'` ; suppression d'un compte mouvementé interdite.

**Approche proposée.**
1. Ajouter `compteId` (FK `Compte`) sur `LigneEcriture` à côté de `compteNumero`
   (transition douce), `onDelete: Restrict`.
2. Migration : back-fill `compteId` par jointure sur `(dossierId, numero)` ;
   créer les comptes manquants détectés, ou échouer en listant les orphelins.
3. `creerPiece` résout/valide le compte (existe + statut ACTIF) avant création.
4. Bloquer `archiverCompte` si des écritures non annulées existent.
5. À terme, lecture des rapports via la relation plutôt que via `compteNumero`.

**Definition of Done.** Tests : refus d'une ligne sur compte inexistant ; refus
d'archivage d'un compte mouvementé ; balance identique après migration.

**Risque.** `compteNumero` est utilisé partout (balance, budget, lettrage, états) —
migration à mener par étapes pour ne pas tout réécrire d'un coup.

---

## #4 / #10b — Séquence légale & inaltérabilité des pièces  ·  Effort L · Risque moyen  ·  ✅ TRAITÉ

**Constat.** `validerPiece` (`src/server/pieces.ts`) ne fait **aucun contrôle** :
simple passage `statut = VALIDEE`. `numeroPiece` est **saisi par l'utilisateur**
(`@@unique([dossierId, numeroPiece])`), sans séquence ni continuité. Pas de date de
verrouillage, pas de chaînage d'inaltérabilité.

**Impact comptable.** Non-conformité AUDCIF/FEC : numérotation pouvant comporter des
trous, pièces validées modifiables a posteriori, pas de piste d'audit infalsifiable.

**Référence Odoo.** `action_post()` : ré-équilibre, attribution de séquence via
`ir.sequence` + `sequence_mixin` (détection des trous, par journal/période), **dates
de verrouillage**, **chaîne de hash** d'inaltérabilité (`account_move` `inalterable_hash`).

**Approche proposée.**
1. **Séquence** : générer `numeroPiece` à la **validation** (pas à la saisie), par
   `(dossier, journal, période)`, format normalisé `JOURNAL/AAAA/NNNN`, sans trou.
2. **`validerPiece` durci** (équivalent `action_post`) : re-vérifier l'équilibre,
   refuser une pièce vide/à zéro, refuser hors période ouverte.
3. **Verrou** : champ `dateVerrouillage` par dossier ; interdiction de créer/
   modifier/annuler avant cette date.
4. **Inaltérabilité** : `hash` par pièce = H(contenu + hash précédent du journal) ;
   vérification de chaîne ; une pièce validée devient non modifiable (toute
   correction passe par **contre-passation**, cf. ci-dessous).
5. **Contre-passation** : `extournerPiece` génère une pièce inverse au lieu de
   supprimer — remplace l'usage actuel d'`ANNULEE` pour les pièces validées.

**Definition of Done.** Tests : séquence continue sans trou ; refus de modif d'une
pièce validée ; détection d'une rupture de chaîne de hash ; extourne équilibrée.

**Note.** Recouvre la partie « séquence/inaltérabilité » de #10. La validation
robuste suppose des montants fiables → après #7.

---

## #8 — Tiers structurés & comptes auxiliaires  ·  Effort XL · Risque élevé

**Constat.** `Piece.fournisseur` est un `String?` libre. Aucun tiers structuré ;
`Compte.collectif` existe mais **inerte**. Conséquence majeure : le **lettrage se
fait au niveau du compte général** (tout le 411), jamais par client/fournisseur.

**Impact comptable.** En SYSCOHADA le 411/401 sont des **comptes collectifs**
éclatés en **auxiliaires** par tiers. Sans ça : pas de grand-livre auxiliaire, pas
de balance âgée par tiers, lettrage imprécis, relances impossibles.

**Référence Odoo.** `res.partner` + `partner_id` sur move/line ; comptes
`asset_receivable`/`liability_payable` ; rapprochement et balance auxiliaire par tiers.

**Approche proposée.**
1. Modèle `Tiers` (client/fournisseur, code auxiliaire, rattaché à un compte
   collectif) lié au `Dossier`.
2. `tiersId` (FK) sur `LigneEcriture` (au moins pour les comptes collectifs) et/ou
   sur `Piece`.
3. Lettrage **par (compte, tiers)** : adapter `createLettrage` / `getOpenLines` /
   `reglesLettrage` pour filtrer sur le tiers.
4. Grand-livre & balance **auxiliaires** ; balance âgée (échéancier) par tiers.

**Definition of Done.** Tests : lettrage refusé entre deux tiers différents d'un
même compte collectif ; balance auxiliaire = ventilation du solde du collectif ;
échéancier par tiers.

**Risque.** Chantier le plus lourd : touche schéma, lettrage, règles auto, états.
À mener après l'assainissement des FK (#10a) et de la devise (#7).

---

## #9 — États normés AUDCIF & Soldes Intermédiaires de Gestion  ·  Effort L · Risque faible

**Constat.** `src/lib/etats/etats-financiers.ts` produit un Bilan/CR **regroupés par
classe** et un TFT en méthode directe simplifiée (libellés trompeurs, déjà noté).
Pas de format normé, pas de cascade de SIG.

**Impact comptable.** Loin de la **liasse SYSCOHADA réelle** : le Bilan a des
rubriques précises (immobilisations incorporelles/corporelles/financières, actif
circulant HAO…) ; le Compte de résultat est une **cascade de SIG** (marge
commerciale → valeur ajoutée → EBE → résultat d'exploitation/financier/HAO →
résultat net) ; le TFT suit le modèle AUDCIF 2017.

**Référence Odoo.** `account.report` : structure de rapport déclarative (lignes,
formules, rubriques) découplée de la balance brute.

**Approche proposée.**
1. Table de **mapping rubrique ↔ comptes/natures** (déclaratif, versionnable).
2. Moteur de rapport qui agrège la balance selon ces rubriques (réutilise la
   balance déjà correcte).
3. **CR en SIG** : calcul en cascade des soldes intermédiaires.
4. **TFT** : libellés exacts (séparer flux réels et variation de BFR) ; conserver
   le bouclage `variation = clôture − ouverture` déjà vérifié.

**Definition of Done.** Tests : chaque rubrique = somme des comptes attendus ; SIG
cohérents (EBE, résultat d'exploitation) ; Bilan équilibré au format normé ; TFT
qui boucle avec libellés corrects.

**Parallélisable.** Isolé dans la couche reporting ; certaines rubriques (créances/
dettes par tiers) gagnent en finesse une fois #8 livré, mais une v1 est livrable avant.

---

## Synthèse

1. **#7 Devise/arrondi** — fondation « argent exact », débloque le reste.
2. **#10a FK** — fiabilise les données avant d'y greffer tiers et légal. ✅ **traité** (Tasks 6–8, 11 ; spec `docs/superpowers/specs/2026-06-19-integrite-comptable-design.md`)
3. **#4/#10b Séquence & inaltérabilité** — conformité légale (séquence, verrou, hash, extourne). ✅ **traité** (Tasks 2–5, 9–10 ; même spec)
4. **#8 Tiers/auxiliaires** — le grand chantier (lettrage et états par tiers).
5. **#9 AUDCIF/SIG** — états normés, parallélisable.

Chaque item est cadré avec sa *Definition of Done* sous forme de tests, conforme à
la discipline TDD du projet.
