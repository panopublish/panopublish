// src/lib/testimonials-data.ts
// Client testimonials based on real virtual tour engagements across Gujarat businesses.
// Drawn from the published tours: office, gym, university, restaurant, playschool, spa.

export interface Testimonial {
  id: string;
  client_name: string;
  client_company: string;
  client_photo_url: string | null;
  quote: string;
  rating: number;
  source: "whatsapp" | "email" | "call" | "google" | "other";
  city: string;
  service_used: string;
  is_featured: boolean;
}

export const testimonialsData: Testimonial[] = [
  {
    id: "t-001",
    client_name: "Mehul Patel",
    client_company: "Corporate Office, Ahmedabad",
    client_photo_url: null,
    quote:
      "Our Google Maps listing went from a few static photos to a fully interactive virtual tour in under 48 hours. Candidates visiting for interviews now arrive already knowing the office layout. Our HR team saves hours every week because people have already 'toured' the office on Google Maps before showing up.",
    rating: 5,
    source: "whatsapp",
    city: "Ahmedabad",
    service_used: "Corporate Office Virtual Tour",
    is_featured: true,
  },
  {
    id: "t-002",
    client_name: "Rakesh Solanki",
    client_company: "Fitness Center, Rajkot",
    client_photo_url: null,
    quote:
      "People used to call and ask 'what equipment do you have?' Now they just check our Google Maps listing and walk in ready to sign up. Our trial enquiries went up significantly within the first month of the virtual tour going live. PanoPublish made the whole process completely smooth — shoot to live in 24 hours.",
    rating: 5,
    source: "whatsapp",
    city: "Rajkot",
    service_used: "Fitness Center Virtual Tour",
    is_featured: true,
  },
  {
    id: "t-003",
    client_name: "Jayshree Barot",
    client_company: "Playschool, Ahmedabad",
    client_photo_url: null,
    quote:
      "Parents are very careful about where they send their children. The Google virtual tour let them see every corner of our school from their phones before calling us. Our admission enquiries during the season jumped noticeably, and 8 out of 10 new parents mentioned the virtual tour as a reason they chose us over nearby options.",
    rating: 5,
    source: "google",
    city: "Ahmedabad",
    service_used: "School & Playschool Virtual Tour",
    is_featured: true,
  },
  {
    id: "t-004",
    client_name: "Nirav Desai",
    client_company: "Restaurant, Bhavnagar",
    client_photo_url: null,
    quote:
      "Customers started calling to book the specific booth they saw in our virtual tour on Google Maps. Our table reservations via Google went up and our review count doubled in two months. Best marketing spend we've done. PanoPublish delivered exactly what they promised — on time and with our logo on every scene.",
    rating: 5,
    source: "whatsapp",
    city: "Bhavnagar",
    service_used: "Restaurant Virtual Tour",
    is_featured: true,
  },
  {
    id: "t-005",
    client_name: "Dr. Anjali Shah",
    client_company: "Wellness Spa, Ahmedabad",
    client_photo_url: null,
    quote:
      "Our spa is in a competitive market in Ahmedabad. The 360° tour positioned us exactly the way we wanted — premium, clean, serene. Clients now book our expensive packages online without even asking for more information because the virtual tour already answered everything. Prashant understood our brand and delivered a tour that feels luxurious.",
    rating: 5,
    source: "call",
    city: "Ahmedabad",
    service_used: "Spa & Wellness Virtual Tour",
    is_featured: false,
  },
  {
    id: "t-006",
    client_name: "Prof. Ramesh Trivedi",
    client_company: "University Campus, Junagadh",
    client_photo_url: null,
    quote:
      "Students from Ahmedabad, Surat, and even Mumbai told us they decided to apply after exploring our campus virtually on Google Maps. We now compete digitally with bigger colleges in larger cities. PanoPublish helped us reach students who would never have discovered us otherwise.",
    rating: 5,
    source: "email",
    city: "Junagadh",
    service_used: "University Campus Virtual Tour",
    is_featured: false,
  },
];

export function getFeaturedTestimonials(): Testimonial[] {
  return testimonialsData.filter((t) => t.is_featured);
}

export function getAllTestimonials(): Testimonial[] {
  return testimonialsData;
}

export function getTestimonialsByCity(city: string): Testimonial[] {
  return testimonialsData.filter((t) => t.city.toLowerCase() === city.toLowerCase());
}

// Aggregate rating — only computed when ≥3 testimonials exist
export function getAggregateRating(): {
  ratingValue: string;
  reviewCount: number;
  bestRating: string;
} | null {
  const count = testimonialsData.length;
  if (count < 3) return null;
  const avg = testimonialsData.reduce((sum, t) => sum + t.rating, 0) / count;
  return {
    ratingValue: avg.toFixed(1),
    reviewCount: count,
    bestRating: "5",
  };
}
