import type { MetadataRoute } from "next";
import { baseUrl } from "@/lib/mail";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Личные и служебные разделы в индексе не нужны.
      disallow: ["/account", "/admin", "/api/", "/verify-email", "/reset-password"],
    },
    sitemap: `${baseUrl()}/sitemap.xml`,
  };
}
