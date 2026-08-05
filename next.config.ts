import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Сборка в самодостаточный сервер: на прод уезжает только нужный код,
  // без полного node_modules.
  output: "standalone",
};

export default nextConfig;
