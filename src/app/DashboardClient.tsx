"use client";

import type { DashboardStats } from "@/server/dashboard";

// Format monétaire FCFA sans décimales (cohérent avec les autres écrans).
const fmt = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

// Couleur d'accent par type de journal.
const COULEUR_JOURNAL: Record<string, string> = {
  ACH: "#e67e22",
  VT: "#27ae60",
  CAI: "#3498db",
  BIMA: "#8e44ad",
  OD: "#7f8c8d",
  PE: "#f1c40f",
  RAN: "#e74c3c",
};
const couleurDe = (code: string) => COULEUR_JOURNAL[code] ?? "var(--accent)";

const dateFr = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

interface KpiDef {
  label: string;
  valeur: number;
  suffixe?: string;
  href: string;
  accent?: boolean; // mise en avant (résultat net)
  signe?: boolean; // colore selon le signe (bénéfice/perte)
}

export default function DashboardClient({ stats }: { stats: DashboardStats }) {
  const { kpis, journaux } = stats;

  const cartesKpi: KpiDef[] = [
    { label: "Résultat net", valeur: kpis.resultatNet, suffixe: "FCFA", href: "/etats", accent: true, signe: true },
    { label: "Trésorerie", valeur: kpis.tresorerie, suffixe: "FCFA", href: "/etats" },
    { label: "Chiffre d'affaires", valeur: kpis.chiffreAffaires, suffixe: "FCFA", href: "/etats" },
    { label: "Total charges", valeur: kpis.totalCharges, suffixe: "FCFA", href: "/budget" },
    { label: "Pièces", valeur: kpis.nbPieces, href: "/ecritures" },
    { label: "Brouillons en attente", valeur: kpis.nbBrouillons, href: "/ecritures" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* KPIs globaux — grille responsive (3 colonnes max) */}
      <section>
        <h2 style={{ fontSize: 15, textTransform: "uppercase", color: "var(--muted)", letterSpacing: 0.5, margin: "0 0 12px" }}>
          Vue d'ensemble
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          {cartesKpi.map((k) => {
            const couleur = k.signe ? (k.valeur >= 0 ? "#27ae60" : "#e74c3c") : "var(--ink)";
            return (
              <a
                key={k.label}
                href={k.href}
                style={{
                  display: "block",
                  textDecoration: "none",
                  color: "inherit",
                  background: "var(--panel)",
                  border: "1px solid var(--line)",
                  borderLeft: k.accent ? "4px solid var(--accent)" : "1px solid var(--line)",
                  borderRadius: 10,
                  padding: "16px 18px",
                }}
              >
                <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>{k.label}</div>
                <div className="mono" style={{ fontSize: 24, fontWeight: 700, color: couleur }}>
                  {fmt(k.valeur)}
                  {k.suffixe ? <span className="muted" style={{ fontSize: 13, fontWeight: 400, marginLeft: 6 }}>{k.suffixe}</span> : null}
                </div>
              </a>
            );
          })}
        </div>
      </section>

      {/* Cartes par journal */}
      <section>
        <h2 style={{ fontSize: 15, textTransform: "uppercase", color: "var(--muted)", letterSpacing: 0.5, margin: "0 0 12px" }}>
          Journaux
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {journaux.map((j) => {
            const couleur = couleurDe(j.code);
            return (
              <a
                key={j.code}
                href={`/ecritures?journal=${encodeURIComponent(j.code)}`}
                style={{
                  display: "block",
                  textDecoration: "none",
                  color: "inherit",
                  background: "var(--panel)",
                  border: "1px solid var(--line)",
                  borderTop: `4px solid ${couleur}`,
                  borderRadius: 10,
                  padding: "16px 18px",
                }}
              >
                <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
                  <span
                    className="mono"
                    style={{ fontWeight: 700, color: "#fff", background: couleur, padding: "2px 8px", borderRadius: 6, fontSize: 13 }}
                  >
                    {j.code}
                  </span>
                  <span className="muted" style={{ fontSize: 13 }}>{j.libelle}</span>
                </div>

                <div className="row" style={{ gap: 8, marginBottom: 10 }}>
                  <span className="badge">{j.nbPieces} pièce{j.nbPieces > 1 ? "s" : ""}</span>
                  {j.nbBrouillons > 0 ? <span className="badge warn">{j.nbBrouillons} brouillon{j.nbBrouillons > 1 ? "s" : ""}</span> : null}
                </div>

                <div className="row" style={{ justifyContent: "space-between", fontSize: 13 }}>
                  <span className="muted">Volume débit</span>
                  <span className="mono">{fmt(j.totalDebit)}</span>
                </div>
                <div className="row" style={{ justifyContent: "space-between", fontSize: 13, marginTop: 2 }}>
                  <span className="muted">Dernière écriture</span>
                  <span>{dateFr(j.derniereDate)}</span>
                </div>
              </a>
            );
          })}
        </div>
      </section>
    </div>
  );
}
