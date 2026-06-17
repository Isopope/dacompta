import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DaCompta",
  description: "Logiciel de comptabilité SYSCOHADA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
