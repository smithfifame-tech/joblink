import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/client/", "/worker/", "/admin/", "/messages", "/notifications", "/account", "/api/", "/payments/", "/auth/", "/reset-password", "/check-email"] }],
    sitemap: `${publicEnv.siteUrl}/sitemap.xml`,
    host: publicEnv.siteUrl,
  };
}
