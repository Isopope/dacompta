# DaCompta — instructions projet

DaCompta est une **suite de documentation de design** pour un produit de comptabilité OHADA (SYSCOHADA / SYCEBNL), pensé pour la zone OHADA (Afrique francophone). Les livrables sont des pages HTML qui documentent les **workflows comptables** étape par étape, avec un cas fil rouge « Les Associés SA » (Lomé, Togo).

## Consigne permanente
- **Toujours penser à documenter les workflows.** Chaque fonctionnalité ou élément ajouté doit être resitué dans un flux comptable concret (de A à Z : configuration → saisie → restitution → clôture), pas présenté isolément.

## Système visuel (ne pas réinventer)
- Style **wireframe / esquissé** : voir `styles.css`. Polices manuscrites (Patrick Hand / Kalam / Caveat), grille pointillée, bordures « sketch », accent teal `#0f766e`.
- Chaque page : React + Babel (versions épinglées) + `styles.css` + `shared.jsx` (primitives : `Win`, `Sidebar`, `Card`, `Chip`, `Btn`, `Annot`, `Mark`, `Kpi`, `Bars`…) + `tweaks-panel.jsx`.
- Panneau **Tweaks** standard : accent, trait esquissé on/off (`clean`), police, densité (`Confort`/`Compact`), annotations manuscrites on/off.
- Hub d'entrée : `DaCompta - Accueil.html` (phases A/B/C + ✦ Socle). Lier toute nouvelle page depuis ce hub.
- Variante haute-fidélité existante : design system BatiScript (indigo/navy, Poppins) — voir `DaCompta HF - Ma journee (BatiScript).html`.

## Contexte marché (pain points à adresser)
Issu de l'étude des produits concurrents OHADA : prix opaque, absence de cloud/multi-utilisateurs, friction d'acquisition, besoin SYSCOHADA **+** SYCEBNL réunis, analytique/tiers/budget.
