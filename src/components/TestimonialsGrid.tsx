// src/components/TestimonialsGrid.tsx
// Reusable testimonials grid with star ratings, Review + AggregateRating schema.org markup.
// AggregateRating is only emitted when ≥3 testimonials are present (guard included).

import { Star, Quote } from "lucide-react";
import { getAggregateRating, type Testimonial } from "@/lib/testimonials-data";

interface TestimonialsGridProps {
  testimonials: Testimonial[];
  heading?: string;
  subheading?: string;
  showSchema?: boolean;
  className?: string;
  cols?: 2 | 3;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i < rating
              ? "fill-amber-400 text-amber-400"
              : "fill-muted text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

function sourceLabel(source: string): string {
  const map: Record<string, string> = {
    whatsapp: "via WhatsApp",
    email: "via Email",
    call: "via Phone",
    google: "Google Review",
    other: "Verified Client",
  };
  return map[source] ?? "Verified Client";
}

export function TestimonialsGrid({
  testimonials,
  heading = "What Our Clients Say",
  subheading,
  showSchema = true,
  className = "",
  cols = 3,
}: TestimonialsGridProps) {
  if (!testimonials || testimonials.length === 0) return null;

  const aggregateRating = getAggregateRating();

  // Build Review schema objects
  const reviewSchemas = testimonials.map((t) => ({
    "@type": "Review",
    author: { "@type": "Person", name: t.client_name },
    reviewBody: t.quote,
    reviewRating: {
      "@type": "Rating",
      ratingValue: String(t.rating),
      bestRating: "5",
    },
    name: `${t.service_used ?? "Virtual Tour"} — ${t.city}`,
  }));

  // Full schema object — AggregateRating only when ≥3 reviews
  const schemaObj = showSchema
    ? {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        name: "PanoPublish",
        url: "https://panopublish.com",
        ...(aggregateRating
          ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: aggregateRating.ratingValue,
                reviewCount: aggregateRating.reviewCount,
                bestRating: aggregateRating.bestRating,
              },
            }
          : {}),
        review: reviewSchemas,
      }
    : null;

  return (
    <section className={className}>
      {/* JSON-LD */}
      {schemaObj && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaObj) }}
        />
      )}

      {/* Heading */}
      {heading && (
        <div className="text-center space-y-2 mb-10">
          <h2 className="text-2xl md:text-3xl font-bold font-serif text-foreground">
            {heading}
          </h2>
          {subheading && (
            <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
              {subheading}
            </p>
          )}
          {aggregateRating && (
            <div className="flex items-center justify-center gap-2 pt-1">
              <StarRating rating={Math.round(Number(aggregateRating.ratingValue))} />
              <span className="text-sm font-semibold text-foreground">
                {aggregateRating.ratingValue}
              </span>
              <span className="text-xs text-muted-foreground">
                ({aggregateRating.reviewCount} verified reviews)
              </span>
            </div>
          )}
        </div>
      )}

      {/* Grid */}
      <div
        className={`grid gap-5 ${
          cols === 2
            ? "sm:grid-cols-2"
            : "sm:grid-cols-2 lg:grid-cols-3"
        }`}
      >
        {testimonials.map((t) => (
          <div
            key={t.id}
            className="relative bg-white border rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col gap-4"
          >
            {/* Decorative quote mark */}
            <Quote className="h-6 w-6 text-primary/20 absolute top-4 right-5" />

            {/* Stars */}
            <StarRating rating={t.rating} />

            {/* Quote */}
            <blockquote className="text-sm text-foreground/80 leading-relaxed flex-1 italic">
              "{t.quote}"
            </blockquote>

            {/* Footer: name + company + city */}
            <div className="border-t pt-4 space-y-0.5">
              <p className="text-sm font-semibold text-foreground">{t.client_name}</p>
              <p className="text-xs text-muted-foreground">
                {t.client_company}
                {t.city && ` — ${t.city}`}
              </p>
              <p className="text-[10px] text-primary font-medium">
                {sourceLabel(t.source)}
                {t.service_used && ` · ${t.service_used}`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
