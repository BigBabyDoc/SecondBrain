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
    // Хранилища Obsidian: внутри .obsidian лежит чужой код плагинов, проверять
    // его нашими правилами бессмысленно.
    "Second brain data/**",
    "Test Data/**",
  ]),
]);

export default eslintConfig;
