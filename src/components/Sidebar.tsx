"use client";
// Sidebar de navigation — organise les pages selon le cycle comptable.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DossierSwitcher } from "./DossierSwitcher";

export interface NavEntree {
  label: string;
  href: string;
}
export interface NavGroupe {
  titre: string;
  entrees: NavEntree[];
}

// Source unique de la navigation : 4 groupes du cycle comptable, 10 entrées.
export const NAV_GROUPS: NavGroupe[] = [
  {
    titre: "Dossier & paramétrage",
    entrees: [
      { label: "Plan comptable", href: "/plan-comptable" },
      { label: "Tiers", href: "/tiers" },
    ],
  },
  {
    titre: "Saisie",
    entrees: [
      { label: "Écritures", href: "/ecritures" },
      { label: "Factures clients", href: "/ventes/factures" },
      { label: "Paiements", href: "/ventes/paiements" },
    ],
  },
  {
    titre: "Contrôle",
    entrees: [
      { label: "Lettrage", href: "/lettrage" },
      { label: "Balance âgée", href: "/ventes/balance-agee" },
    ],
  },
  {
    titre: "États & déclarations",
    entrees: [
      { label: "États & documents", href: "/etats" },
      { label: "Déclaration TVA", href: "/etats/tva" },
      { label: "Budget", href: "/budget" },
    ],
  },
];

// Un href correspond au pathname s'il est égal OU parent (préfixe segmenté).
function correspond(href: string, pathname: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

/** href actif le plus spécifique (le plus long) pour un pathname, ou null. */
export function hrefActif(pathname: string): string | null {
  const candidats = NAV_GROUPS.flatMap((g) => g.entrees.map((e) => e.href)).filter((h) =>
    correspond(h, pathname)
  );
  if (candidats.length === 0) return null;
  return candidats.sort((a, b) => b.length - a.length)[0];
}

export function Sidebar({
  dossiers,
  courantId,
}: {
  dossiers: { id: string; nom: string }[];
  courantId: string | null;
}) {
  const pathname = usePathname() ?? "";
  const actif = hrefActif(pathname);
  return (
    <aside
      style={{
        width: 240,
        flexShrink: 0,
        borderRight: "1px solid var(--line)",
        background: "var(--panel)",
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        padding: "12px 0",
      }}
    >
      <Link
        href="/"
        style={{
          fontWeight: 700,
          fontFamily: "'Space Mono', monospace",
          color: "inherit",
          textDecoration: "none",
          padding: "4px 16px 12px",
        }}
      >
        DaCompta
      </Link>
      <div style={{ padding: "0 16px 12px" }}>
        <DossierSwitcher dossiers={dossiers} courantId={courantId} />
      </div>
      <nav style={{ flex: 1 }}>
        {NAV_GROUPS.map((g) => (
          <div key={g.titre} style={{ marginBottom: 8 }}>
            <div
              className="muted"
              style={{ padding: "8px 16px 2px", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}
            >
              {g.titre}
            </div>
            {g.entrees.map((e) => {
              const estActif = e.href === actif;
              return (
                <a
                  key={e.href}
                  href={e.href}
                  aria-current={estActif ? "page" : undefined}
                  style={{
                    display: "block",
                    padding: "6px 16px",
                    color: "inherit",
                    textDecoration: "none",
                    borderLeft: `3px solid ${estActif ? "var(--accent)" : "transparent"}`,
                    background: estActif ? "var(--bg)" : "transparent",
                    fontWeight: estActif ? 700 : 400,
                  }}
                >
                  {e.label}
                </a>
              );
            })}
          </div>
        ))}
      </nav>
      <div style={{ padding: "12px 16px 4px" }}>
        <span className="chip" title="Authentification différée">
          👤 Comptable
        </span>
      </div>
    </aside>
  );
}
