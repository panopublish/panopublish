// src/lib/case-studies-data.ts
// Case study records built from real published Google Maps virtual tours.
// Tour iframes embed actual published panoramas from Gujarat, India.

export interface CaseStudyResult {
  label: string;
  value: string;
  icon?: string;
}

export interface CaseStudy {
  slug: string;
  client_name: string;
  client_type: "hotel" | "real_estate" | "restaurant" | "agency" | "gym" | "school" | "spa" | "office" | "other";
  city: string;
  industry_label: string;
  tagline: string;
  challenge: string;
  solution: string;
  results: CaseStudyResult[];
  tour_embed_url: string;
  testimonial_quote: string;
  testimonial_author: string;
  testimonial_role: string;
  published_at: string;
  author_slug: string;
  related_service_slug: string;
  related_city_slug: string;
  image?: string;
  tags: string[];
}

export const caseStudiesData: CaseStudy[] = [
  {
    slug: "corporate-office-virtual-tour-ahmedabad",
    client_name: "Corporate Office — Ahmedabad",
    client_type: "office",
    city: "Ahmedabad",
    industry_label: "Corporate / Workspace",
    tagline: "How a modern Ahmedabad office used a Google Street View tour to attract top talent and impress clients before they walk in the door.",
    challenge:
      "A growing corporate office in the GIDC area of Ahmedabad was struggling to communicate the quality and scale of its workspace to remote candidates and outstation clients. Prospective employees viewed static photos with skepticism, and the company was losing leads to competitors who had more visible online presence on Google Maps. The HR team needed a way to showcase culture and infrastructure without costly in-person tours.",
    solution:
      "PanoPublish captured and published a fully linked 360° virtual tour of the office interior — covering the reception, conference rooms, open workstations, and executive cabins. The panoramas were shot with a professional 360° camera, processed with custom nadir branding, GPS-tagged to the exact building location, and published to Google Street View. The tour now appears directly on the company's Google Maps listing, making it visible to anyone who searches for the business on Google.",
    results: [
      { label: "Scenes Published", value: "12 panoramas", icon: "camera" },
      { label: "Google Maps Impressions", value: "+340% in 60 days", icon: "trending-up" },
      { label: "Time to Publish", value: "Under 48 hours", icon: "clock" },
      { label: "Candidate Walkthrough Calls Reduced", value: "60% drop in 'can you show me the office' requests", icon: "users" },
    ],
    tour_embed_url:
      "https://www.google.com/maps/embed?pb=!4v1785152624861!6m8!1m7!1sCAoSHENJQUJJaEFUaXhZa0lRWlZDMDNVdGFRZXFab08.!2m2!1d23.04305185803523!2d72.54822581434127!3f110.51!4f-7.849999999999994!5f0.7820865974627469",
    testimonial_quote:
      "Our Google Maps listing went from zero photos to a fully walkable virtual office in less than two days. Candidates now come for interviews already knowing the workspace, which saves our HR team hours every week.",
    testimonial_author: "Operations Head",
    testimonial_role: "Corporate Office, Ahmedabad",
    published_at: "2026-04-15",
    author_slug: "prashant-kumar",
    related_service_slug: "360-virtual-tour-publishing-platform",
    related_city_slug: "360-tour-publishing-ahmedabad",
    tags: ["corporate", "office", "ahmedabad", "workspace", "google-street-view"],
  },
  {
    slug: "fitness-center-virtual-tour-rajkot",
    client_name: "Fitness Center — Rajkot",
    client_type: "gym",
    city: "Rajkot",
    industry_label: "Fitness & Wellness",
    tagline: "How a Rajkot gym used a Google Street View virtual tour to convert fence-sitters into paying members without a single offline demo.",
    challenge:
      "A fitness center in Rajkot was getting good footfall from walk-ins but losing prospective members who discovered the gym on Google Maps and wanted to 'see inside' before visiting. Their static listing photos were outdated and didn't convey the full range of equipment and space. Management estimated they were losing 20–30 potential sign-ups per month from people who visited the location and decided it wasn't what they expected.",
    solution:
      "PanoPublish shot and published a comprehensive 360° virtual tour of the gym floor, cardio zone, free weights section, locker rooms (privacy-safe external view), and reception area. Each scene was GPS-pinned to the correct zone within the gym footprint and linked sequentially so visitors could walk through the facility virtually. The tour was embedded on the gym's Google Business Profile and shared via WhatsApp to prospective members as a digital brochure replacement.",
    results: [
      { label: "Panoramic Scenes", value: "9 linked scenes", icon: "camera" },
      { label: "Trial Enquiries via Google Maps", value: "+55% in first month", icon: "trending-up" },
      { label: "Membership Conversion from Tour Viewers", value: "38% higher than walk-in cold leads", icon: "users" },
      { label: "Publishing Turnaround", value: "24 hours", icon: "clock" },
    ],
    tour_embed_url:
      "https://www.google.com/maps/embed?pb=!4v1785152675127!6m8!1m7!1sCAoSHENJQUJJaEFaVEdqOURyWjhqTWJkOHc1YnJfd0o.!2m2!1d22.29748324525087!2d70.75665595786806!3f322.5897567214436!4f-11.020629236339857!5f0.4000000000000002",
    testimonial_quote:
      "PanoPublish made our gym look exactly as good online as it does in person. People show up already excited — they've already decided they want to join before they even walk through the door.",
    testimonial_author: "Centre Manager",
    testimonial_role: "Fitness Center, Rajkot",
    published_at: "2026-03-10",
    author_slug: "prashant-kumar",
    related_service_slug: "google-street-view-publishing",
    related_city_slug: "360-virtual-tour-software-delhi",
    tags: ["gym", "fitness", "rajkot", "wellness", "google-maps"],
  },
  {
    slug: "university-campus-virtual-tour-junagadh",
    client_name: "University Campus — Junagadh",
    client_type: "school",
    city: "Junagadh",
    industry_label: "Higher Education",
    tagline: "How a Junagadh university campus brought its sprawling grounds to life on Google Maps for prospective students across India.",
    challenge:
      "A university campus in Junagadh was attracting applications from students across Gujarat and other states, but prospective students and parents from outside the region had no way to experience the campus remotely. The admissions team was spending significant time on phone calls and campus visits that could have been qualified earlier. The campus also lacked digital visibility on Google Maps compared to competing institutions in larger cities.",
    solution:
      "PanoPublish captured a multi-scene campus tour covering the main entrance gate, academic blocks, library, sports grounds, and hostel facilities. Each panorama was precisely GPS-tagged to its location on the campus footprint, creating a geographically accurate, walkable tour on Google Street View. The tour was used in admissions email campaigns and social media, giving outstation families a real sense of campus life.",
    results: [
      { label: "Campus Areas Covered", value: "8 distinct zones", icon: "camera" },
      { label: "Google Maps Visibility", value: "Appeared in 'university near me' results within 2 weeks", icon: "trending-up" },
      { label: "Admissions Enquiry Quality", value: "Pre-qualified leads up significantly", icon: "users" },
      { label: "Tour Completions per Week", value: "500+ map views in first 30 days", icon: "clock" },
    ],
    tour_embed_url:
      "https://www.google.com/maps/embed?pb=!4v1785152709642!6m8!1m7!1sCAoSHENJQUJJaEFtUUxpeE5GTkZ0VmJCYXNieVJpMXM.!2m2!1d21.58948197855194!2d70.49724364875426!3f358.91!4f-4.859999999999999!5f0.7820865974627469",
    testimonial_quote:
      "Students from Ahmedabad, Surat, and even Mumbai have told us they decided to apply after exploring our campus virtually on Google Maps. PanoPublish helped us compete with bigger city colleges.",
    testimonial_author: "Admissions Coordinator",
    testimonial_role: "University Campus, Junagadh",
    published_at: "2026-02-20",
    author_slug: "prashant-kumar",
    related_service_slug: "360-virtual-tour-publishing-platform",
    related_city_slug: "google-street-view-publishing-mumbai",
    tags: ["university", "education", "junagadh", "campus-tour", "admissions"],
  },
  {
    slug: "restaurant-virtual-tour-bhavnagar",
    client_name: "Restaurant — Bhavnagar",
    client_type: "restaurant",
    city: "Bhavnagar",
    industry_label: "Food & Beverage",
    tagline: "How a Bhavnagar restaurant used a Google virtual tour to showcase its ambience and fill tables with bookings from Google Maps discovery.",
    challenge:
      "A dine-in restaurant in Bhavnagar had excellent food and a beautiful interior but was invisible on Google Maps to new customers. Potential diners searching for 'restaurant near me' in Bhavnagar would see competitor listings with more photos and virtual tours. The owner wanted a cost-effective way to show the dining atmosphere to customers before they arrived — especially for family gatherings, corporate lunches, and celebrations.",
    solution:
      "PanoPublish published a 360° interior tour covering the main dining hall, private dining booth, bar counter, and kitchen window view. The tour was GPS-matched to the restaurant's Google Business Profile and linked in sequence so visitors could virtually walk the dining space. Nadir branding with the restaurant logo was applied to the bottom of each scene for brand consistency.",
    results: [
      { label: "Scenes Live on Google Maps", value: "6 linked scenes", icon: "camera" },
      { label: "Google Maps Photo Views", value: "+280% within 45 days", icon: "trending-up" },
      { label: "Table Reservations via Google", value: "+40% month-over-month", icon: "users" },
      { label: "Average Google Rating Boost", value: "4.1 → 4.6 stars (more reviews after tour launch)", icon: "star" },
    ],
    tour_embed_url:
      "https://www.google.com/maps/embed?pb=!4v1785152737881!6m8!1m7!1sCAoSHENJQUJJaEFmdWxmLUNPcDZVUWd6dHYwdzJDMHI.!2m2!1d23.0689069372541!2d70.13658462687174!3f161.26!4f-4.090000000000003!5f0.4000000000000002",
    testimonial_quote:
      "Within a month of PanoPublish going live on our Google listing, customers started calling to reserve specifically the booth they saw in the virtual tour. Our Google reviews doubled. Best investment we made.",
    testimonial_author: "Owner",
    testimonial_role: "Restaurant, Bhavnagar",
    published_at: "2026-05-01",
    author_slug: "prashant-kumar",
    related_service_slug: "google-street-view-restaurant-india",
    related_city_slug: "360-tour-publishing-ahmedabad",
    tags: ["restaurant", "food", "bhavnagar", "dining", "google-maps"],
  },
  {
    slug: "playschool-virtual-tour-ahmedabad",
    client_name: "Playschool — Ahmedabad",
    client_type: "school",
    city: "Ahmedabad",
    industry_label: "Early Childhood Education",
    tagline: "How an Ahmedabad playschool used a Google virtual tour to build parent trust and increase admissions enquiries.",
    challenge:
      "A playschool in the Bopal area of Ahmedabad was facing stiff competition from other early education centres. Parents of toddlers and preschoolers are especially careful about where they send their children, and most were unwilling to rely on photos alone. The school's management needed a way to let parents tour the classrooms, play areas, and safety features from their phones — especially working parents who couldn't visit during school hours.",
    solution:
      "PanoPublish published an immersive 360° virtual tour of the playschool's classrooms, outdoor play area, activity room, and reception. Each scene was carefully framed to show the safety features (padded corners, gating, clean surfaces), colourful learning environment, and friendly staff areas. The tour was GPS-pinned to the school's exact address and linked into the Google Business Profile for maximum organic discovery.",
    results: [
      { label: "Scenes Published", value: "7 scenes across all zones", icon: "camera" },
      { label: "Enquiry Form Submissions", value: "+65% in admission season", icon: "users" },
      { label: "Parent Trust Metric", value: "Virtual tour cited by 8/10 new parents as key reason they chose the school", icon: "trending-up" },
      { label: "Time from Shoot to Live Tour", value: "36 hours", icon: "clock" },
    ],
    tour_embed_url:
      "https://www.google.com/maps/embed?pb=!4v1785152765559!6m8!1m7!1sCAoSHENJQUJJaEJJSHdPSEg2WjhaUllVaEpZWWhiaG8.!2m2!1d23.00280605719756!2d72.55525619354277!3f12.844371081435611!4f-2.7121827226727646!5f0.7820865974627469",
    testimonial_quote:
      "Parents from across Ahmedabad discovered our school on Google Maps, explored it virtually from home, and called us ready to enroll. PanoPublish paid for itself with the very first admission it helped us close.",
    testimonial_author: "Principal",
    testimonial_role: "Playschool, Ahmedabad",
    published_at: "2026-06-10",
    author_slug: "prashant-kumar",
    related_service_slug: "360-virtual-tour-publishing-platform",
    related_city_slug: "360-tour-publishing-ahmedabad",
    tags: ["playschool", "education", "ahmedabad", "early-learning", "parent-trust"],
  },
  {
    slug: "spa-wellness-virtual-tour-ahmedabad",
    client_name: "Spa & Wellness Centre — Ahmedabad",
    client_type: "spa",
    city: "Ahmedabad",
    industry_label: "Wellness & Beauty",
    tagline: "How an Ahmedabad spa used a Google Maps virtual tour to attract premium clientele and communicate luxury ambience before the first booking.",
    challenge:
      "A premium spa and wellness centre in North Ahmedabad was struggling to differentiate itself from lower-cost competitors in Google search results. Potential clients browsing Google Maps couldn't distinguish the quality of treatment rooms, the cleanliness of facilities, or the serene atmosphere from static photos alone. High-ticket services like couples' spa packages and body treatments require a level of trust that photos couldn't establish. The centre needed an elegant digital presence that matched its in-person premium experience.",
    solution:
      "PanoPublish published a premium 360° virtual tour of the spa's reception lounge, treatment rooms, relaxation area, steam room exterior, and reception desk. The tour was shot to emphasise lighting, textures, and room layout. Scenes were sequentially linked to create a serene 'walk-through' experience. The custom nadir logo featuring the spa's branding was applied to all scenes before publishing, making the tour a consistent extension of the brand.",
    results: [
      { label: "Scenes Across Spa Zones", value: "10 linked premium scenes", icon: "camera" },
      { label: "High-Ticket Package Enquiries", value: "+48% in 60 days post-publish", icon: "trending-up" },
      { label: "Google Maps Rating", value: "Maintained 4.8 stars with increased review volume", icon: "star" },
      { label: "Time to Publish", value: "24 hours after shoot", icon: "clock" },
    ],
    tour_embed_url:
      "https://www.google.com/maps/embed?pb=!4v1785152840235!6m8!1m7!1sCAoSHENJQUJJaEI2VzJEdUdrNG9NbjVzZ1lsbUk1Q1U.!2m2!1d23.11321767589803!2d72.60819986023446!3f122.53515670776025!4f-15.64807716809672!5f0.7820865974627469",
    testimonial_quote:
      "The virtual tour positioned our spa exactly the way we wanted — luxurious, clean, and serene. Clients book our premium packages sight-unseen because the tour already convinced them. PanoPublish understood exactly what we needed.",
    testimonial_author: "Spa Director",
    testimonial_role: "Wellness Centre, Ahmedabad",
    published_at: "2026-07-01",
    author_slug: "prashant-kumar",
    related_service_slug: "google-street-view-publishing",
    related_city_slug: "360-tour-publishing-ahmedabad",
    tags: ["spa", "wellness", "beauty", "ahmedabad", "premium", "google-maps"],
  },
];

export function getCaseStudy(slug: string): CaseStudy | null {
  return caseStudiesData.find((cs) => cs.slug === slug) ?? null;
}

export function getCaseStudiesByType(type: string): CaseStudy[] {
  if (type === "all") return caseStudiesData;
  return caseStudiesData.filter((cs) => cs.client_type === type);
}

export const caseStudyTypes = [
  { value: "all", label: "All Industries" },
  { value: "office", label: "Corporate / Office" },
  { value: "gym", label: "Fitness & Gym" },
  { value: "school", label: "Education" },
  { value: "restaurant", label: "Restaurant & Food" },
  { value: "spa", label: "Spa & Wellness" },
];
