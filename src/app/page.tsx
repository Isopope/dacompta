// Tableau de bord d'accueil — liens rapides vers les modules principaux
import { Shell } from "@/components/Shell";

export default function Page() {
  // Liens rapides vers les pages principales de l'application
  const liens = [
    { href: "/ventes/factures", label: "Factures clients" },
    { href: "/ventes/paiements", label: "Paiements" },
    { href: "/ventes/balance-agee", label: "Balance âgée" },
    { href: "/tiers", label: "Tiers" },
    { href: "/etats", label: "Déclaration TVA" },
  ];

  return (
    <Shell module="ventes" breadcrumb={[{ label: "Tableau de bord" }]}>
      {/* Grille de liens rapides, auto-ajustée selon la largeur disponible */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
          gap: 12,
        }}
      >
        {liens.map((l) => (
          <a
            key={l.href}
            href={l.href}
            className="panel"
            style={{ padding: 16, textDecoration: "none", color: "inherit" }}
          >
            {l.label}
          </a>
        ))}
      </div>
    </Shell>
  );
}
