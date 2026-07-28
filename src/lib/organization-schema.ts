import { COMPANY_CONFIG } from "@/config/company";

export function getOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: COMPANY_CONFIG.name,
    url: COMPANY_CONFIG.url,
    logo: COMPANY_CONFIG.logo,
    email: COMPANY_CONFIG.email,
    telephone: COMPANY_CONFIG.telephone,
    sameAs: [...COMPANY_CONFIG.sameAs],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Support",
      email: COMPANY_CONFIG.email,
      telephone: COMPANY_CONFIG.telephone,
      availableLanguage: COMPANY_CONFIG.availableLanguage,
    },
    knowsAbout: [...COMPANY_CONFIG.knowsAbout],
    areaServed: COMPANY_CONFIG.areaServed,
  };
}
