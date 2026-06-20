// Layout racine minimal — la navigation est gérée par <Shell> dans chaque page de module
import "./globals.css";
import type { ReactNode } from "react";

export const metadata = { title: "DaCompta" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
