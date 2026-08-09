import { Helmet } from "react-helmet-async";
import { getOrganizationSchema } from "@/lib/organization-schema";

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  noIndex?: boolean;
  schema?: object | object[];
  breadcrumbs?: Array<{ name: string; url: string }>;
}

export function formatCanonicalUrl(url?: string): string {
  if (!url) return "https://panopublish.com/";
  let clean = url.trim().split("?")[0].split("#")[0];
  if (!clean.startsWith("http")) {
    clean = `https://panopublish.com${clean.startsWith("/") ? "" : "/"}${clean}`;
  }
  if (clean === "https://panopublish.com") {
    return "https://panopublish.com/";
  }
  if (!clean.endsWith("/") && !clean.match(/\.[a-z0-9]+$/i)) {
    clean += "/";
  }
  return clean;
}

export function SEO({
  title,
  description,
  canonical,
  ogImage = "https://panopublish.com/og-image.webp",
  ogType = "website",
  noIndex = false,
  schema,
  breadcrumbs,
}: SEOProps) {
  const fullTitle = title.includes("PanoPublish") ? title : `${title} | PanoPublish`;
  const canonicalUrl = formatCanonicalUrl(canonical);

  const breadcrumbSchema = breadcrumbs
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbs.map((b, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: b.name,
          item: b.url,
        })),
      }
    : null;

  // Normalise schema to always be a flat array
  const schemaArray = schema
    ? Array.isArray(schema)
      ? schema
      : [schema]
    : [];

  const hasTopLevelOrgSchema = schemaArray.some(
    (s) => Boolean(s && typeof s === "object" && "@type" in s && (s as Record<string, unknown>)["@type"] === "Organization")
  );
  const orgSchema = hasTopLevelOrgSchema ? null : getOrganizationSchema();

  const allSchemas = [orgSchema, ...schemaArray, breadcrumbSchema].filter(Boolean);

  return (
    <Helmet>
      {/* Primary */}
      <link rel="canonical" href={canonicalUrl} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      {!noIndex && <meta name="robots" content="index, follow" />}

      {/* Geo targeting — India */}
      <meta name="geo.region" content="IN-GJ" />
      <meta name="geo.placename" content="Ahmedabad" />
      <meta name="geo.position" content="23.0225;72.5714" />
      <meta name="ICBM" content="23.0225, 72.5714" />
      <link rel="alternate" hrefLang="en-in" href={canonicalUrl} />
      <link rel="alternate" hrefLang="x-default" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:secure_url" content={ogImage} />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="PanoPublish" />
      <meta property="og:locale" content="en_IN" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* JSON-LD Structured Data — all schemas for this page */}
      {allSchemas.map((s, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }}
        />
      ))}
    </Helmet>
  );
}
