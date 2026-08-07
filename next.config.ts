import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Сборка в самодостаточный сервер: на прод уезжает только нужный код,
  // без полного node_modules.
  output: "standalone",

  // Тексты юридических документов читаются с диска по пути, который
  // собирается во время выполнения, поэтому трассировщик их сам не находит.
  outputFileTracingIncludes: {
    "/*": ["content/legal/**/*"],
  },
};

export default nextConfig;
