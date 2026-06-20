// Gestion du cookie dossierId côté serveur (Next.js App Router)
import { cookies } from "next/headers";

const COOKIE = "dossierId";

/** Lit l'identifiant du dossier courant depuis le cookie. Retourne null si absent. */
export async function getDossierIdCookie(): Promise<string | null> {
  const c = await cookies();
  return c.get(COOKIE)?.value ?? null;
}

/** Écrit l'identifiant du dossier sélectionné dans le cookie. */
export async function setDossierIdCookie(id: string): Promise<void> {
  const c = await cookies();
  c.set(COOKIE, id, { path: "/", sameSite: "lax" });
}
