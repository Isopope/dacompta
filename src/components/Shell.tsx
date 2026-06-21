// Shell de navigation principal — sidebar gauche (cycle comptable) + contenu.
import type { ReactNode } from "react";
import { listerDossiers, getDossierCourant } from "@/server/dossiers";
import { Sidebar } from "./Sidebar";

export async function Shell({
  breadcrumb,
  action,
  children,
  horsGarde,
}: {
  // `module` est accepté pour compatibilité avec les appels existants mais n'est
  // plus utilisé : l'état actif de la navigation est dérivé du pathname (Sidebar).
  module?: string;
  breadcrumb: { label: string; href?: string }[];
  action?: ReactNode;
  children: ReactNode;
  // Contenu rendu dans TOUS les cas, même sans dossier courant (ex. « Mes dossiers »,
  // qui sert justement à choisir un dossier). Rendu sous le contenu gardé.
  horsGarde?: ReactNode;
}) {
  // Chargement parallèle des dossiers et du dossier courant.
  const [dossiers, courant] = await Promise.all([listerDossiers(), getDossierCourant()]);
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar dossiers={dossiers} courantId={courant?.id ?? null} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div
          style={{
            padding: "12px 24px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            borderBottom: "1px solid var(--line)",
          }}
        >
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
        <main className="container">
          {!courant ? <EcranAucunDossier /> : children}
          {horsGarde}
        </main>
      </div>
    </div>
  );
}

/** Affiché quand aucun dossier n'est encore sélectionné dans le cookie. */
function EcranAucunDossier() {
  return (
    <div className="panel" style={{ padding: 24 }}>
      <p>Aucun dossier sélectionné. Choisissez-en un dans la barre latérale.</p>
    </div>
  );
}
