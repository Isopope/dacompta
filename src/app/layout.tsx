import "./globals.css";
import type { ReactNode } from "react";

export const metadata = { title: "DaCompta" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <nav style={{ display: "flex", gap: 20, padding: "12px 24px", borderBottom: "2px solid var(--line)", background: "var(--panel)", alignItems: "center" }}>
          <span style={{ fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>DaCompta</span>
          <a href="/plan-comptable" style={{ color: "inherit", textDecoration: "none" }}>Plan comptable</a>
          <a href="/ecritures" style={{ color: "inherit", textDecoration: "none" }}>Écritures</a>
          <a href="/budget" style={{ color: "inherit", textDecoration: "none" }}>Budget</a>
          <a href="/etats" style={{ color: "inherit", textDecoration: "none" }}>États & documents</a>
        </nav>
        {children}
      </body>
    </html>
  );
}
