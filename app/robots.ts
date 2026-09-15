import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env["NEXT_PUBLIC_SITE_URL"] || "https://gullyunitedxlv.com";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/admin/", "/api/", "/account/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
