// src/lib/authors-data.ts
// Author profile data — used by /authors/:slug routes and AuthorByline component

export interface AuthorData {
  id: string;
  slug: string;
  name: string;
  title: string;
  bio: string;
  photo_url: string | null;
  credentials: string[];
  linkedin_url: string | null;
  years_experience: number;
  specializations: string[];
}

export const authorsData: Record<string, AuthorData> = {
  "prashant-kumar": {
    id: "auth-01-prashant",
    slug: "prashant-kumar",
    name: "Prashant Kumar",
    title: "360° Virtual Tour Specialist & Founder, PanoPublish",
    bio: "Prashant Kumar is the founder of PanoPublish and a Google Street View specialist with 4 years of hands-on experience helping hotels, restaurants, gyms, schools, and real estate firms across Gujarat publish immersive 360° virtual tours on Google Maps. He has published panoramic photo spheres for clients across Ahmedabad, Rajkot, Surat, Bhavnagar, and Junagadh. Prashant combines technical expertise in panoramic photography workflows with deep knowledge of Google Street View API, EXIF GPS metadata, and nadir branding to deliver turn-key virtual tour publishing for Indian businesses.\n\nAs the creator of PanoPublish, he built the platform from the ground up to solve the pain points photographers and agencies face when publishing multiple panoramas: manual metadata editing, tripod removal, and the complexity of Google's Street View API. Today PanoPublish serves photographers, agencies, hotels, and educational institutions across India.\n\nHe is passionate about helping local Indian businesses increase their digital visibility on Google Maps, believing that every business deserves a professional virtual presence that drives real footfall and engagement.",
    photo_url: null, // Upload to panopublish-photos R2 bucket and update this URL
    credentials: [
      "Google Street View Trusted Photographer",
      "360° Panoramic Photography Specialist",
      "Google Maps Publishing Expert",
      "Founder, PanoPublish",
    ],
    linkedin_url: null, // Add LinkedIn URL when available
    years_experience: 4,
    specializations: [
      "Google Street View Publishing",
      "360° Panoramic Photography",
      "Nadir Branding & Tripod Removal",
      "Virtual Tour Software Development",
      "Google Maps Optimization",
      "Multi-client Tour Management",
    ],
  },
};

export function getAuthor(slug: string): AuthorData | null {
  return authorsData[slug] ?? null;
}

export function getAllAuthors(): AuthorData[] {
  return Object.values(authorsData);
}
