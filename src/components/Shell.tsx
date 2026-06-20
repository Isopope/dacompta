// Shell de navigation principal — type Odoo : barre module + sous-menu + breadcrumb
import type { ReactNode } from "react";
import { listerDossiers, getDossierCourant } from "@/server/dossiers";
import { DossierSwitcher } from "./DossierSwitcher";

// Modules du switcher (T1 : Ventes, Tiers, États actifs).
const MODULES = [
  { key: "ventes", label: "Ventes", href: "/ventes/factures", actif: true },
  { key: "tiers", label: "Tiers", href: "/tiers", actif: true },
  { key: "etats", label: "États", href: "/etats", actif: true },
  { key: "achats", label: "Achats", href: "#", actif: false },
  { key: "banque", label: "Banque", href: "#", actif: false },
  { key: "compta", label: "Compta", href: "#", actif: false },
];

// Sous-menu par module.
const SOUS_MENUS: Record<string, { label: string; href: string }[]> = {
  ventes: [
    { label: "Factures clients", href: "/ventes/factures" },
    { label: "Paiements", href: "/ventes/paiements" },
    { label: "Balance âgée", href: "/ventes/balance-agee" },
  ],
  tiers: [{ label: "Tiers", href: "/tiers" }],
  etats: [{ label: "États & documents", href: "/etats" }, { label: "Déclaration TVA", href: "/etats/tva" }],
};

export async function Shell({
  module,
  breadcrumb,
  action,
  children,
}: {
  module: keyof typeof SOUS_MENUS | string;
  breadcrumb: { label: string; href?: string }[];
  action?: ReactNode;
  children: ReactNode;
}) {
  // Chargement parallèle des dossiers et du dossier courant
  const [dossiers, courant] = await Promise.all([listerDossiers(), getDossierCourant()]);
  const sousMenu = SOUS_MENUS[module] ?? [];
  return (
    <div>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "10px 24px",
          borderBottom: "2px solid var(--line)",
          background: "var(--panel)",
        }}
      >
        <a
          href="/"
          style={{
            fontWeight: 700,
            fontFamily: "'Space Mono', monospace",
            color: "inherit",
            textDecoration: "none",
          }}
        >
          DaCompta
        </a>
        <nav style={{ display: "flex", gap: 12 }}>
          {MODULES.map((m) => (
            <a
              key={m.key}
              href={m.actif ? m.href : "#"}
              style={{
                color: m.actif ? "inherit" : "var(--muted)",
                textDecoration: "none",
                fontWeight: m.key === module ? 700 : 400,
              }}
              aria-disabled={!m.actif}
              title={m.actif ? "" : "À venir"}
            >
              {m.label}
            </a>
          ))}
        </nav>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <DossierSwitcher dossiers={dossiers} courantId={courant?.id ?? null} />
          <span className="chip" title="Authentification différée">
            👤 Comptable
          </span>
        </div>
      </header>
      {sousMenu.length > 0 && (
        <nav
          style={{
            display: "flex",
            gap: 16,
            padding: "8px 24px",
            borderBottom: "1px solid var(--line)",
            background: "var(--bg)",
          }}
        >
          {sousMenu.map((s) => (
            <a key={s.href} href={s.href} style={{ color: "inherit", textDecoration: "none" }}>
              {s.label}
            </a>
          ))}
        </nav>
      )}
      <div style={{ padding: "8px 24px", display: "flex", alignItems: "center", gap: 8 }}>
        <div className="muted" style={{ flex: 1 }}>
          {breadcrumb.map((b, i) => (
            <span key={i}>
              {i > 0 && " › "}
              {b.href ? (
                <a href={b.href} style={{ color: "inherit" }}>
                  {b.label}
                </a>
              ) : (
                b.label
              )}
            </span>
          ))}
        </div>
        {action}
      </div>
      {/* Si aucun dossier n'est sélectionné, on affiche un écran d'invitation */}
      <main className="container">{!courant ? <EcranAucunDossier /> : children}</main>
    </div>
  );
}

/** Affiché quand aucun dossier n'est encore sélectionné dans le cookie. */
function EcranAucunDossier() {
  return (
    <div className="panel" style={{ padding: 24 }}>
      <p>Aucun dossier sélectionné. Choisissez-en un dans la barre du haut.</p>
    </div>
  );
}
