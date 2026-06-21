# Export des états comptables (PDF / Excel) — Design

- **Date** : 2026-06-21
- **Statut** : Validé (brainstorming) — en attente de plan d'implémentation
- **Module** : `dacompte` — page `/etats` (« États & documents »)

## 1. Contexte et motivation

L'application calcule déjà à la volée, à partir des écritures des journaux, l'ensemble
des états : balance générale, grand livre, bilan, compte de résultat et tableau des
flux de trésorerie (`src/server/balance.ts` + `src/lib/etats/etats-financiers.ts`).
La page `/etats` affiche un **aperçu** de chacun via `EtatsClient`.

Deux boutons `⬇ PDF` et `⬇ Excel` existent dans l'UI mais sont **désactivés**
(`disabled`) : la fonctionnalité de génération de fichiers n'est pas implémentée.

Un POC jetable (`prisma/generate_books.ts`) a validé que le pipeline de dérivation
produit des documents cohérents (il exportait en Markdown sur disque). Ce design
transforme ce POC en une vraie fonctionnalité intégrée : **télécharger chaque état
en PDF et en Excel depuis l'UI**.

## 2. Périmètre

### Inclus
- Export **à la demande, document par document**.
- 5 documents : `balance-generale`, `grand-livre`, `bilan`, `compte-resultat`,
  `flux-tresorerie` (les `DocId` déjà définis dans `EtatsClient`).
- 2 formats : **PDF** et **Excel (.xlsx)**.

### Exclu (YAGNI)
- Scellement / archivage légal immuable (livres obligatoires OHADA horodatés).
- « Tout exporter » en ZIP.
- Génération planifiée, envoi par e-mail.
- Formats CSV / Markdown.

> L'approche serveur retenue reste recyclable si l'archivage légal devient
> nécessaire plus tard.

## 3. Architecture

```
src/server/etats.ts            ← NOUVEAU
    getEtatsData(dossierId): charge getBalance + getGrandLivre et dérive
    bilan / compte de résultat / flux de trésorerie. Factorisé depuis page.tsx
    pour garantir une source de vérité unique entre aperçu et export.

src/lib/etats/export/
    ├─ index.ts                ← NOUVEAU
    │     buildExport(docId, format, data, meta)
    │       → { buffer, filename, contentType }
    │     Dispatch vers le builder Excel ou PDF.
    ├─ excel.ts                ← NOUVEAU
    │     Un builder par document → SheetJS workbook → Buffer.
    │     Réutilise la dépendance `xlsx` déjà présente.
    └─ pdf.tsx                 ← NOUVEAU
          Composants @react-pdf/renderer par document + renderToBuffer.

src/app/etats/export/route.ts  ← NOUVEAU
    Route Handler GET /etats/export?doc=<DocId>&format=pdf|xlsx
```

- **Source de vérité unique** : `page.tsx` et la route d'export appellent tous deux
  `getEtatsData`. L'export est donc garanti identique à l'aperçu affiché.
- **Une seule dépendance ajoutée** : `@react-pdf/renderer` (rendu PDF déclaratif,
  pur JS, sans navigateur headless). Excel réutilise `xlsx`.

## 4. Flux de données

1. L'utilisateur clique sur `⬇ PDF` (ou `⬇ Excel`) dans l'aperçu d'un document.
2. Le navigateur ouvre `<a href="/etats/export?doc=bilan&format=pdf" download>`.
3. La route :
   - lit l'id du dossier via `getDossierIdCookie()` ;
   - valide `doc` (contre l'enum `DocId`) et `format` (`pdf` | `xlsx`) ;
   - appelle `getEtatsData(dossierId)` ;
   - appelle `buildExport(doc, format, data, meta)` ;
   - renvoie une `Response` avec le buffer, le `Content-Type` adéquat et
     `Content-Disposition: attachment; filename=...`.
4. Nom de fichier : `<dossier>_<doc>_<exercice>.{pdf,xlsx}`
   (slug normalisé, sans espaces ni accents).

## 5. UI

Dans `EtatsClient`, remplacer les deux boutons `disabled` (≈ ligne 183-184) par des
liens de téléchargement pointant vers la route, paramétrés par le `docId` du document
actuellement sélectionné dans l'aperçu. Aucun nouvel état React n'est nécessaire
(simples ancres `<a ... download>`).

## 6. Gestion d'erreurs

| Cas | Comportement |
|---|---|
| Pas de dossier (cookie absent) | `400` |
| `doc` ou `format` invalide | `400` |
| Dossier sans aucune écriture | Document **valide mais vide** (pas une erreur) |
| Exception dans un builder | `500`, erreur loggée côté serveur |

**Limite v1 connue** : l'export passant par un `<a download>`, une réponse `500`
s'afficherait brutalement dans le navigateur. Acceptable en v1. Évolution possible :
passer à `fetch` + `blob` côté client avec un toast d'erreur.

## 7. Tests

Runner : **vitest** (`vitest run`), pattern `*.test.ts` existant.

- `src/lib/etats/export/excel.test.ts` : à partir d'un fixture réutilisant le scénario
  d'écritures 2020 du POC, vérifie les valeurs des cellules clés de chaque workbook
  (totaux balance, équilibre bilan, résultat net).
- `src/lib/etats/export/pdf.test.ts` : vérifie que le buffer PDF est non vide et
  contient les libellés / totaux attendus.
- `src/app/etats/export/route.test.ts` : paramètres valides / invalides, `Content-Type`
  et `Content-Disposition` corrects.

Le fixture de données partagé s'inspire de `prisma/generate_books.ts` (jeu d'écritures
réaliste : RAN, achats + TVA déductible, ventes + TVA collectée, encaissements partiels,
salaires, lettrages).

## 8. Décisions actées

- Approche **serveur** (Route Handler) plutôt que génération navigateur : vrai
  téléchargement 1-clic homogène PDF/Excel, source de vérité unique, sécurité,
  réutilisable pour un futur archivage légal.
- **`@react-pdf/renderer`** pour le PDF (vs puppeteer/print) : pas de navigateur
  headless, rendu déclaratif proche de React déjà utilisé par l'équipe.
