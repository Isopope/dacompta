import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    // L'environnement par défaut reste node ; les tests composant optent pour jsdom
    // via le commentaire `// @vitest-environment jsdom` en tête de fichier.
    environment: "node",
    globals: true,
    // On inclut les fichiers .tsx pour les tests de composants React.
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    env: { DATABASE_URL: "file:./test.db" },
    globalSetup: ["./src/server/test-setup.ts"],
    // Nettoyage DOM après chaque test (inerte côté node).
    setupFiles: ["./src/components/test-setup-dom.ts"],
    fileParallelism: false,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
