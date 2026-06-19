import { execSync } from "node:child_process";
import path from "node:path";

// Recrée la base de test à partir des migrations (et non plus db push),
// pour que les contraintes CHECK définies dans les migrations soient appliquées.
// PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION : requis par Prisma quand l'agent
// détecte un contexte IA ; ici la base cible est test.db (dev uniquement).
export default function setup() {
  execSync("npx prisma migrate reset --force --skip-generate --skip-seed", {
    env: {
      ...process.env,
      DATABASE_URL: "file:./test.db",
      PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION:
        "yes, reset test.db from migrations",
    },
    stdio: "inherit",
    cwd: path.resolve(__dirname, "..", ".."),
  });
}
