export function VenueJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SportsActivityLocation",
    name: "Gully United XLV",
    description:
      "Premium Cricket Turf & Sports Entertainment Venue in Kota, Nellore, Andhra Pradesh.",
    address: {
      "@type": "PostalAddress",
      streetAddress: "SC Boys Residential School Road",
      addressLocality: "Kota, Nellore",
      addressRegion: "Andhra Pradesh",
      postalCode: "524411",
      addressCountry: "IN",
    },
    openingHours: "Mo-Su 06:00-23:00",
    telephone: "+919390817811",
    priceRange: "₹299 - ₹499",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
