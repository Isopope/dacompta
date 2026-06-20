// StatusBar — barre d'état affichant une liste d'états avec mise en évidence du courant
// Affiche optionnellement des actions à gauche
import type { ReactNode } from "react";

export function StatusBar({ etats, courant, actions }: { etats: string[]; courant: string; actions?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
      <div style={{ display: "flex", gap: 8 }}>{actions}</div>
      <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
        {etats.map((e) => (
          <span key={e} data-courant={e === courant}
            style={{ padding: "4px 10px", borderRadius: 6, background: e === courant ? "var(--accent)" : "transparent", color: e === courant ? "#fff" : "var(--muted)" }}>{e}</span>
        ))}
      </div>
    </div>
  );
}
