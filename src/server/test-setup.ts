import { execSync } from "node:child_process";

// Crée le schéma dans la base de test (prisma/test.db) avant toute la suite.
export default function setup() {
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
    stdio: "inherit",
  });
}
