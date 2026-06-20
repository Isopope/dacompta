# DaCompta — POC Comptabilité SYSCOHADA

## Projet
POC de comptabilité SYSCOHADA révisé (OHADA). Stack : **Next.js 15 App Router + Prisma + SQLite + Vitest + TypeScript**.

## Design System
```css
:root { --ink:#1f2328; --muted:#6b7280; --line:#e5e7eb; --accent:#0f766e; --bg:#f8f9fa; --panel:#fff; }
```
- Accent teal `#0f766e`, fond clair, polices system‑ui.
- Classes CSS utiles : `.container`, `.btn`, `.btn.primary`, `.input`, `.badge`, `.badge.warn`, `.muted`, `.mono`, `.chip`, `.drawer`, `.drawer-scrim`, `.seg`, `.tabs`, `.tab`, `.field`.

## Architecture

### Pages (toutes avec App Router, `page.tsx`)
- `/` → redirige vers `/plan-comptable`
- `/plan-comptable` → liste hiérarchique, création, import
- `/ecritures` → saisie pièces + validation
- `/budget` → postes budgétaires, barres de consommation
- `/etats` → Balance 6 colonnes, Bilan, CR, TFT (onglets)

### Layout
`src/app/layout.tsx` : nav horizontale DaCompta / Plan comptable / Écritures / Budget / États & documents

### Serveur
Dossier `src/server/` : server actions pur (`"use server"`).
Ne PAS mettre de Prisma calls dans les composants client. Passer par les server actions.

### Modèles Prisma (SQLite)

| Modèle | Rôle |
|--------|------|
| **Dossier** | Société cliente (nom, exercice, devise) |
| **Referentiel** | Référentiel SYSCOHADA révisé |
| **Compte** | Plan comptable (numéro 6 chiffres, intitulé, classe, nature) |
| **Journal** | Code (ACH/VT/CAI/BIMA/OD/PE/RAN) + libellé |
| **Piece** | Pièce comptable (numéro, date, fournisseur, statut: BROUILLON/VALIDEE/ANNULEE, journalId) |
| **LigneEcriture** | Ligne (pieceId, compteNumero, libelleLigne, debit, credit, ordre) |
| **BudgetPoste** | Poste budgétaire (code, libelle, sens P/C, prevision, compteLie) |
| **SoldeAnterieur** | Snapshots N-1 (compteNumero, montant signé débit−crédit) |
| **ImportLog** | Historique des imports plan comptable |
| **Tiers** | Tiers/auxiliaire (res.partner) — code, nom, type CLIENT/FOURNISSEUR/AUTRE |
| **Taxe** | Taxe (account.tax) — taux, typeAmount, usage sale/purchase, priceInclude, exigibilite, compteNumero |
| **Paiement** | Paiement (account.payment) — sens ENTRANT/SORTANT, tiers, pièce générée, etat |
| **Lettrage / RegleLettrage** | Rapprochement partiel + règles auto (par compte ET tiers) |
| **AuditLog** | Piste d'audit append-only (VALIDATION/ANNULATION/EXTOURNE/VERROU) |
| **SequencePiece** | Compteur de séquence légale par (dossier, journal, exercice) |

Champs Odoo-fidèles ajoutés : `Compte.accountType` (account_type) + `Compte.reconciliable` (account.reconcile) ;
`LigneEcriture.tiersId` (partner_id), `taxeId` (tax_line_id), `balance` (solde signé débit−crédit) ;
`Dossier.fiscalyearLockDate` / `hardLockDate` (lock dates, hard = irréversible).

### Services existants
| Fichier | Fonction |
|---------|----------|
| `src/lib/db.ts` | Singleton PrismaClient |
| `src/server/balance.ts` | Balance générale, Grand Livre |
| `src/server/pieces.ts` | CRUD pièces + lignes |
| `src/server/comptes.ts` | CRUD plan comptable |
| `src/server/budget.ts` | Postes budgétaires (réalisé déduit des écritures) |
| `src/server/import.ts` | Import plan comptable CSV |
| `src/lib/etats/etats-financiers.ts` | Bilan, CR, TFT à partir de la balance |
| `src/lib/syscohada/referentiel.ts` | Données SYSCOHADA révisé |
| `src/lib/syscohada/compte-logic.ts` | Logique métier comptes (collectifs, analyse classe) |
| `src/lib/comptabilite/integrite.ts` | Invariants purs : équilibre, signes, résiduel, lettrage (compte réconciliable + tiers), hash chaîné, verrou de période (I1–I6) |
| `src/lib/comptabilite/devise.ts` | Arrondi à la précision de la devise (XOF/XAF 0 décimale) — `arrondiDevise`, `estNulDevise` |
| `src/lib/comptabilite/taxe.ts` | Moteur de calcul de taxe pur (account.tax) — percent/fixed, price_include, devise-aware |
| `src/lib/syscohada/compte-logic.ts` | + `deduireAccountType` / `deduireReconciliable` (mapping SYSCOHADA → énum Odoo) |
| `src/server/tiers.ts` | CRUD tiers (auxiliaires) |
| `src/server/taxes.ts` | CRUD taxes + `creerFacture` (lignes HT taxées → pièce équilibrée) + `getDeclarationTVA` |
| `src/server/paiements.ts` | `enregistrerPaiement` (pièce trésorerie + lettrage auto FIFO) + `getEtatPaiementFacture` |
| `src/server/auxiliaire.ts` | Grand-livre auxiliaire + balance âgée par tiers |
| `src/server/verrou.ts` | `definirVerrou` (lock dates, hard lock irréversible) + `getAuditLog` |
| `src/server/template.ts` | `instancierPlanSyscohada` (chart_template : déploie un plan par dossier) |

### Conventions code
- Code commenté en français.
- Commits conventionnels : `feat:`, `fix:`, `chore:`.
- TDD obligatoire : tests Vitest `*.test.ts` dans `src/server/` ou `src/lib/`.

### Seed de dev
Prisma seed crée :
- Le référentiel SYSCOHADA révisé (classes + natures)
- Un dossier "Les Associés SA" (Lomé, Togo, XOF, exercice 2020)
- 7 journaux (ACH, VT, CAI, BIMA, OD, PE, RAN)
- Les comptes du plan COMPTES_LES_ASSOCIES (définis dans `src/lib/syscohada/referentiel.ts`)
- 15 postes budgétaires (transport, vente, achats, carburant, personnel, etc.)
- 4 soldes N-1 (exercice 2019) pour les comptes de gestion (706100, 601100, 605300, 661100)
- **Aucune pièce ni écriture** — les pièces sont créées uniquement par les tests ou via l'interface.

## Tests
```bash
npx vitest run        # tout
npx vitest --watch    # mode watch
```
BDD : test.db avec resetDb() dans `src/server/test-setup.ts`.
127 tests verts (balance, états, TFT, budget, comptes, import, pièces, intégrité, inaltérabilité, extourne, lettrage, contraintes DB).

## Build
```bash
npm run build           # Next.js build
npm run typecheck       # tsc --noEmit
npx next dev -p 3000    # dev server
```
Build et typecheck doivent passer avant tout commit.

## Dashboard (nouvelle feature)
S'inspirer d'Odoo Accounting : remplacer la page d'accueil par un dashboard avec :
1. Cartes par journal (code, libelle, nb pièces, nb brouillons, solde total, dernière date)
2. KPIs globaux (résultat net, trésorerie, total bilan)
3. Liens rapides vers chaque page

Server action `src/server/dashboard.ts` → `getDashboardStats(dossierId)`.
Page `src/app/page.tsx` → composant client Dashboard avec les stats.
Tests `src/server/dashboard.test.ts` avant l'implémentation.