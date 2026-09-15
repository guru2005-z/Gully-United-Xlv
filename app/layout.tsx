import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { MobileBookBar } from "@/components/sections";
import { IntroVideoSplash } from "@/components/IntroVideoSplash";
import { FloatingAnnouncementBanner } from "@/components/FloatingAnnouncementBanner";
import "../src/styles.css";

const siteUrl = process.env["NEXT_PUBLIC_SITE_URL"] ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Gully United XLV | Premium Cricket Turf in Kota",
    template: "%s | Gully United XLV",
  },
  description:
    "Book Gully United XLV, a premium artificial cricket turf in Kota with floodlights, changing rooms, parking and one-hour slots.",
  alternates: { canonical: siteUrl },
  openGraph: {
    type: "website",
    title: "Gully United XLV | Premium Cricket Turf in Kota",
    description:
      "Premium artificial turf cricket experience in Kota. Book one-hour slots from INR 299.",
    siteName: "Gully United XLV",
    url: siteUrl,
  },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/favicon.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsActivityLocation",
    name: "Gully United XLV",
    description:
      "Premium box cricket turf with high-grade synthetic grass, floodlights, seating, and parking in Kota, Rajasthan.",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Nanta Road, Near Kunadi",
      addressLocality: "Kota",
      addressRegion: "Rajasthan",
      postalCode: "324008",
      addressCountry: "IN",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: "25.205",
      longitude: "75.835",
    },
    url: siteUrl,
    priceRange: "₹299 - ₹799",
  };

  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <IntroVideoSplash />
        <FloatingAnnouncementBanner />
        <Nav />
        <main className="pb-20 sm:pb-0">{children}</main>
        <Footer />
        <MobileBookBar />
      </body>
    </html>
  );
}
