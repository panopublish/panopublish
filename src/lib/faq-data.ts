// src/lib/faq-data.ts
// Centralized FAQ data for the /faq hub page and reusable FAQBlock component

export interface FAQItem {
  question: string;
  answer: string;
}

export interface FAQCategory {
  id: string;
  label: string;
  faqs: FAQItem[];
}

export const faqCategories: FAQCategory[] = [
  {
    id: "pricing",
    label: "Pricing & Plans",
    faqs: [
      {
        question: "What are PanoPublish's subscription plans and pricing?",
        answer:
          "PanoPublish offers three plans in INR: Basic (₹499/month) for up to 5 tours and 30 photos per tour, Pro (₹1,499/month) for up to 20 tours and 200 photos per tour with WhatsApp support, and Agency (₹2,999/month) for up to 50 tours, 10 team logins, and a dedicated account manager. All plans include a 7-day free trial — no credit card required.",
      },
      {
        question: "Is there a free trial? Do I need to enter payment details?",
        answer:
          "Yes. Every new account gets a 7-day free trial with full access to all features — no credit card, no UPI authorization required upfront. You only need to enter payment details when you choose to subscribe after the trial ends.",
      },
      {
        question: "Can I upgrade or downgrade my plan at any time?",
        answer:
          "Yes. You can upgrade to a higher plan instantly from the Settings page, and your new limits apply immediately. Downgrades take effect at the start of your next billing cycle. Prorated credits are applied when upgrading mid-cycle.",
      },
      {
        question: "How are payments processed? Are Indian payment methods supported?",
        answer:
          "All payments are processed securely through Razorpay, which supports UPI (GPay, PhonePe, Paytm), credit and debit cards (Visa, Mastercard, RuPay), net banking, and EMI options. Prices are in Indian Rupees (INR) with GST where applicable.",
      },
      {
        question: "Is there a refund policy?",
        answer:
          "We offer a 7-day money-back guarantee on your first paid subscription if you are not satisfied. Refund requests must be submitted through our contact page or via WhatsApp within 7 days of your first charge. Renewals are non-refundable.",
      },
    ],
  },
  {
    id: "street-view-publishing",
    label: "Street View Publishing",
    faqs: [
      {
        question: "How do I publish 360° photos to Google Street View using PanoPublish?",
        answer:
          "After uploading your equirectangular 360° photos, connect your Google Account via OAuth in the PanoPublish dashboard. Select the photos you want to publish, set GPS coordinates for each scene, optionally apply nadir branding, and click Publish. PanoPublish handles the Google Street View API upload and GPS linking automatically.",
      },
      {
        question: "How long does it take for my virtual tour to appear on Google Maps?",
        answer:
          "After publishing through PanoPublish, Google typically processes and displays your 360° photos on Google Street View and Google Maps within 24 to 72 hours. Processing time depends on Google's internal review queue and can occasionally take up to 7 days for new locations.",
      },
      {
        question: "What is the difference between Google Street View and a virtual tour?",
        answer:
          "Google Street View is Google's platform for 360° photos embedded in Google Maps. A virtual tour is a series of linked Street View photos that viewers can navigate through, typically representing the interior or exterior of a business. PanoPublish publishes both individual 360° photos and fully linked, navigable virtual tours to Google Street View.",
      },
      {
        question: "Do I need a Google Trusted Photographer badge to publish?",
        answer:
          "No. Any Google account can publish 360° photos to Google Street View using the Street View API (which PanoPublish uses). The Trusted Photographer badge is a Google certification for photographers who have published many high-quality panoramas and is a recognition, not a requirement.",
      },
      {
        question: "Can I publish tours for multiple clients from one account?",
        answer:
          "Yes. PanoPublish's client management system lets you create separate client profiles, organize tours under each client, and publish to different Google accounts (each client connects their own Google account). Pro and Agency plans support multiple team members.",
      },
    ],
  },
  {
    id: "technical",
    label: "Technical / Photo Requirements",
    faqs: [
      {
        question: "What type of 360° camera do I need?",
        answer:
          "You need a camera that captures equirectangular (2:1 ratio) JPEG panoramas. Popular options include the Ricoh Theta series, Insta360 ONE X2/X3, GoPro MAX, and Kandao QooCam. Consumer-grade cameras like the Ricoh Theta SC2 (₹20,000–₹25,000) work perfectly for most business virtual tours.",
      },
      {
        question: "What are the photo file requirements?",
        answer:
          "PanoPublish accepts equirectangular JPEG images. Recommended minimum resolution is 4000×2000 pixels (8MP). Maximum file size per photo is 50MB. Photos must contain valid XMP or EXIF metadata with GPano ProjectionType set to 'equirectangular'. We automatically validate metadata on upload.",
      },
      {
        question: "How does the nadir tripod removal work?",
        answer:
          "The PanoPublish Nadir Editor lets you blur or replace the bottom pole of your panorama — the area that typically shows your camera tripod. You can apply a stretch-blur (which blends surrounding pixels), a solid color fill, or upload your custom circular logo to brand each scene. Processing happens server-side on Cloudflare Workers.",
      },
      {
        question: "How does GPS tagging work for indoor venues?",
        answer:
          "For indoor venues (restaurants, gyms, hotels), you specify the GPS coordinates of the building entrance or the exact indoor location using Google Maps. PanoPublish embeds these coordinates into the photo metadata before uploading to Street View. Indoor panoramas are published as indoor layers on Google Maps.",
      },
      {
        question: "Can I connect multiple panoramas into a walkthrough tour?",
        answer:
          "Yes. PanoPublish's Connection Builder lets you draw visual links between panoramas so users can navigate from one scene to the next. You can set heading, pitch, and spacing for each connection. PanoPublish auto-links panoramas that are within 3–5 metres of each other using GPS proximity detection.",
      },
    ],
  },
  {
    id: "billing",
    label: "Billing & Account",
    faqs: [
      {
        question: "What happens to my tours if I cancel my subscription?",
        answer:
          "Your published tours on Google Street View remain live — they are hosted by Google, not PanoPublish, so cancellation does not remove them from Google Maps. However, you will lose access to the PanoPublish dashboard for uploading new photos and managing connections. Your account data is retained for 90 days after cancellation.",
      },
      {
        question: "Can I get a GST invoice for my subscription?",
        answer:
          "Yes. GST-compliant invoices are generated automatically for every payment and available for download in the Billing section of your account Settings. You can enter your GSTIN in the billing profile to receive B2B invoices.",
      },
      {
        question: "How do subscription credits work?",
        answer:
          "Credits are used for certain advanced operations like bulk nadir processing or priority Street View resubmission. Each plan comes with a monthly credit allocation. Credits reset at the start of each billing cycle and do not roll over.",
      },
      {
        question: "Can I share access with my team?",
        answer:
          "Pro plan supports up to 3 team member logins and Agency plan supports up to 10 team member logins. Each member uses a separate login but shares the same tour library and client list. You can manage team access from the Settings → Team Members section.",
      },
    ],
  },
  {
    id: "support",
    label: "Support",
    faqs: [
      {
        question: "How do I get support if I face an issue?",
        answer:
          "Basic plan users get email support (responses within 24 hours on business days). Pro and Agency plan users get priority WhatsApp support available Monday to Saturday, 10 AM – 7 PM IST. You can also access our help documentation and video tutorials from the Help button inside the dashboard.",
      },
      {
        question: "Is support available in Hindi?",
        answer:
          "Yes. Our support team is fluent in both English and Hindi. WhatsApp support is available in Hindi for Pro and Agency plan users.",
      },
      {
        question: "Do you offer onboarding assistance for new users?",
        answer:
          "Yes. Agency plan subscribers receive a dedicated onboarding call with a PanoPublish account manager who walks through the platform, configures your first client, and answers technical questions. Pro users can book a 30-minute video call via the support WhatsApp.",
      },
      {
        question: "Can PanoPublish publish tours on my behalf?",
        answer:
          "We offer a Done-For-You publishing service for clients who provide raw 360° photos. Contact us via WhatsApp to get a custom quote for managed publishing, which includes nadir branding, GPS tagging, scene linking, and full Google Street View submission.",
      },
    ],
  },
];

// Subset helpers for service/city page FAQBlock embeds
export const faqsByCategory = (categoryId: string): FAQItem[] => {
  return faqCategories.find((c) => c.id === categoryId)?.faqs ?? [];
};

export const faqSubset = (categoryId: string, count = 4): FAQItem[] => {
  return faqsByCategory(categoryId).slice(0, count);
};

// Combined flat list for homepage/meta schemas
export const allFaqs: FAQItem[] = faqCategories.flatMap((c) => c.faqs);
