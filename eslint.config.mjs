import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // POC / design-mockup files outside the Next.js app — not part of the build.
    "dacompta/**",
    "check_dossier*.js",
    "update_exercice*.js",
    "update_all_exercice.js",
    "test_lettrage.js",
  ]),
]);

export default eslintConfig;
