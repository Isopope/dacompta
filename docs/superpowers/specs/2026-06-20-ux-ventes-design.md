# Spec — Refonte UX type Odoo · Tranche 1 : Socle + Verticale Ventes

> Date : 2026-06-20 · Projet : DaCompta (POC comptabilité SYSCOHADA) · Stack : Next.js 16 App Router + Prisma + SQLite + TypeScript + Vitest.
> Inspiration assumée : Odoo Accounting (shell, vue document, statusbar, smart buttons).

## 1. Objectif & périmètre

Refonte globale de l'UX dans l'esprit d'Odoo Accounting, livrée **par tranches** (chaque tranche = son propre spec → plan → implémentation). **Cette tranche (1)** pose :
1. le **shell de navigation** Odoo (barre supérieure + sous-menu module + breadcrumb) ;
2. un **framework de primitives réutilisables** (liste / document) ;
3. la **verticale Ventes de bout en bout** : facture client → paiement → lettrage → état.

Elle prouve le pattern complet et exerce tout le backend ajouté (tiers, taxes, paiements, lettrage par tiers, verrou, balance âgée).

**Hors périmètre tranche 1** : Achats, rapprochement bancaire, avoirs, multi-devise UI, authentification, états AUDCIF/SIG normés.

## 2. Décisions de conception (validées)

| Sujet | Décision |
|-------|----------|
| Shell | Shell Odoo complet : barre sup. (logo · switcher module · sélecteur dossier · menu utilisateur placeholder) + sous-menu module + breadcrumb + action principale. |
| Vue document | Document Odoo complet : statusbar + boutons d'action contextuels + smart buttons + lignes éditables + totaux. |
| Découpage | Tranche 1 = socle + verticale Ventes. |
| Architecture UI | **Primitives composées** (pas de moteur de métadonnées) : composants explicites assemblés à la main par écran. |
| Contexte société | `dossierId` en **cookie**, lu par les Server Components, écrit par le `<DossierSwitcher>`. |
| Dépendances | Aucune lib UI externe ; CSS maison, extension des tokens existants (accent teal). |

## 3. Architecture

### 3.1 Routing (App Router)
- `/ventes/factures` — liste des factures clients.
- `/ventes/factures/[id]` — document facture.
- `/ventes/paiements` — liste des paiements (cible des smart buttons).
- `/ventes/balance-agee` — balance âgée clients + grand-livre auxiliaire d'un tiers.
- `/tiers` — liste/édition des tiers (support de la verticale).
- (tranches suivantes : `/achats/...`, `/banque/...`, `/compta/...`, `/etats/...`.)

Server Components pour le chargement (server actions de lecture, cookie `dossierId`). Client Components pour l'interactif (éditeur de lignes, boutons d'action, drawer de paiement). Mutation → server action → `router.refresh()`.

### 3.2 Primitives réutilisables (`src/components/`)
- `<Shell>` (Server Component) : lit le cookie `dossierId` + la liste des dossiers ; rend barre sup., sous-menu (config locale par module), breadcrumb (dérivé des segments de route), slot d'action principale, slot de contenu.
- `<DossierSwitcher>` (Client) : sélection → écrit le cookie → recharge.
- `<DataTable>` : colonnes déclarées, lignes, recherche/filtre, clic ligne → navigation, état vide + CTA.
- `<StatusBar>` : pastilles d'état (Brouillon→Validé→Annulé) + zone de boutons d'action.
- `<SmartButton>` : icône + compteur + libellé → liste filtrée.
- `<FormLayout>` : en-tête (titre + statusbar) · corps (grille de champs) · pied (totaux).
- `<LineEditor>` (Client) : tableau de lignes éditable (sélecteurs compte/tiers/taxe, montant HT, débit/crédit), total live.
- Réutilise les classes CSS existantes (`.btn`, `.badge`, `.drawer`, `.field`, `.input`…), étendues au besoin.

### 3.3 Shell — détail
- **Barre supérieure** : `DaCompta` (→ tableau de bord) · switcher de module (Ventes/Achats/Banque/Compta/Tiers/États ; **actifs en T1 : Ventes, Tiers, États** ; autres grisés « à venir ») · sélecteur de dossier · menu utilisateur placeholder (« Comptable » + note : auth différée).
- **Sous-menu module** : config locale `{ module, items: [{label, href}] }`. Ventes → `Factures clients`, `Paiements`.
- **Breadcrumb** : `Ventes › Factures clients › VT/2020/0001`, segments cliquables.
- **Action principale** : bouton haut-droite contextuel (`+ Nouvelle facture` sur la liste).
- **Aucun dossier sélectionné** : écran d'accueil invitant à choisir/créer un dossier (les server actions exigent un `dossierId`).

## 4. Verticale Ventes — écrans & flux

### 4.1 Liste des factures clients (`/ventes/factures`)
`<DataTable>` : Numéro · Date · Client (tiers) · Total TTC · **État paiement** (badge `NON_PAYE`/`PARTIEL`/`PAYE`) · Statut (Brouillon/Validé). Filtres : statut, état paiement, recherche. Action `+ Nouvelle facture`.

### 4.2 Document facture (`/ventes/factures/[id]`)
- **Statusbar** : Brouillon → Validé (→ Annulé).
- **Boutons d'action** contextuels : `Valider` (brouillon), `Enregistrer un paiement` (validé & non soldé), `Extourner` (validé), `Annuler` (brouillon).
- **Smart buttons** : `💰 N paiements` (→ paiements liés au tiers/facture) · `🔗 Lettrage` (résiduel / état).
- **En-tête** : Client (sélecteur tiers), Date, Journal (vente), Numéro (auto à la validation).
- **Saisie (brouillon)** : `<LineEditor>` en lignes **HT** (compte produit + libellé + montant HT + taxe). Aperçu live des lignes de TVA + contrepartie client (TTC) → `creerFacture`. **Après validation** : lignes générées réelles (707/443/411) en lecture seule.
- **Pied** : Total HT · TVA · TTC.

### 4.3 Flux paiement
Depuis une facture validée non soldée, `Enregistrer un paiement` ouvre un **drawer** (montant prérempli = résiduel, journal trésorerie, compte 521/571) → `enregistrerPaiement` → **lettrage auto FIFO** → l'état de paiement bascule, le smart button `💰` s'incrémente.

### 4.4 Sortie « état »
`/ventes/balance-agee` : balance âgée clients (`getBalanceAgee`) + grand-livre auxiliaire d'un tiers (`getGrandLivreAuxiliaire`). Déclaration TVA (`getDeclarationTVA`) accessible depuis le module États (lien en T1).

## 5. Ajouts backend (minimes, TDD)
- `listerFactures(dossierId, filtre)` : pièces du/des journal(aux) de vente, avec tiers + `etatPaiement` + total TTC. → **décision** : ajouter un champ `type` sur `Journal` (sale/purchase/cash/bank/misc, façon `journal.type` d'Odoo) pour identifier les journaux de vente, plutôt que filtrer par code `VT` en dur. Migration + seed à mettre à jour.
- `getFacture(dossierId, id)` : en-tête + lignes + `etatPaiement` + compteurs pour smart buttons (nb paiements lettrés, état lettrage).
- Réutilise tel quel : `creerFacture`, `validerPiece`, `extournerPiece`, `annulerPiece`, `enregistrerPaiement`, `getEtatPaiementFacture`, `getBalanceAgee`, `getGrandLivreAuxiliaire`, `getDeclarationTVA`, `listerTiers`, `listerTaxes`.

## 6. États, erreurs, cas limites
- États d'écran : chargement (Suspense + skeleton) · vide (CTA) · aucun dossier (accueil) · erreur.
- **Surface d'erreur** : les server actions lèvent des messages FR signifiants (déséquilibre, période verrouillée, tiers obligatoire, compte non réconciliable, hash) ; l'UI les catch et affiche en **bannière/toast** près de l'action. Boutons d'action désactivés quand non applicables.
- Cas limites pilotés par le modèle : période verrouillée → création/validation bloquées + indicateur ; pièce validée immuable → lecture seule, seul `Extourner`.
- Responsive : desktop-first ; jamais de scroll horizontal de page (tables défilent dans leur conteneur).

## 7. Tests (discipline TDD)
- Server : `listerFactures`, `getFacture` (+ `Journal.type`) testés en Vitest.
- Logique pure : mappers `ligne→solde`, `etatPaiement→badge`, calcul d'aperçu TTC — testés isolément.
- UI : primitives clés (`<LineEditor>`, `<StatusBar>`) testées via Vitest + Testing Library (comportement, pas pixels).
- E2E Playwright : noté en option pour une tranche ultérieure.

## 8. Definition of Done (tranche 1)
- Shell complet opérationnel (switcher module/dossier, breadcrumb) sur les routes Ventes/Tiers/États.
- Créer une facture client (lignes HT + taxe), la valider (séquence + hash), l'encaisser (paiement + lettrage auto), voir l'état de paiement basculer, et la retrouver dans la balance âgée.
- Erreurs métier affichées proprement ; période verrouillée et immutabilité respectées dans l'UI.
- `npx vitest run`, `tsc --noEmit`, `next build` verts.
