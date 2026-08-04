import { defineConfig } from "vitest/config";

export default defineConfig({
  // Алиасы (@/lib/...) читаются напрямую из tsconfig.json.
  resolve: { tsconfigPaths: true },
  test: {
    // Тесты покрывают чистую логику (доступ, слаги, токены, лимиты),
    // поэтому DOM не нужен.
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
