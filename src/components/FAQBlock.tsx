// src/components/FAQBlock.tsx
// Reusable accordion FAQ block with DOM-present answers (not lazy-mounted).
// Emits a scoped FAQPage JSON-LD script tag.
// Uses @radix-ui/react-accordion (already installed).

import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import type { FAQItem } from "@/lib/faq-data";

interface FAQBlockProps {
  faqs: FAQItem[];
  heading?: string;
  schemaId?: string; // unique ID suffix to avoid duplicate schema ids on same page
  className?: string;
}

export function FAQBlock({ faqs, heading, schemaId, className }: FAQBlockProps) {
  if (!faqs || faqs.length === 0) return null;

  const schemaObj = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <div className={className}>
      {/* Scoped FAQPage JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaObj) }}
      />

      {heading && (
        <h2 className="text-xl md:text-2xl font-bold font-serif text-foreground mb-6">
          {heading}
        </h2>
      )}

      {/*
        NOTE: All answers are rendered in the DOM immediately (not hidden via display:none).
        Radix Accordion renders hidden content with visibility:hidden + height:0 by default,
        which keeps them crawlable. We use forceMount to ensure all items are SSR-present.
      */}
      <Accordion.Root type="single" collapsible className="space-y-3">
        {faqs.map((faq, idx) => (
          <Accordion.Item
            key={idx}
            value={`faq-${schemaId ?? "block"}-${idx}`}
            className="border rounded-2xl bg-white overflow-hidden"
          >
            <Accordion.Header>
              <Accordion.Trigger className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-foreground hover:text-primary transition-colors group">
                <span>{faq.question}</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground group-data-[state=open]:rotate-180 transition-transform duration-200" />
              </Accordion.Trigger>
            </Accordion.Header>
            {/* forceMount keeps answer text in SSR/DOM output even when collapsed */}
            <Accordion.Content
              forceMount
              className="overflow-hidden text-sm text-muted-foreground leading-relaxed px-5 data-[state=closed]:h-0 data-[state=open]:h-auto"
            >
              <div className="pb-5 pt-0">{faq.answer}</div>
            </Accordion.Content>
          </Accordion.Item>
        ))}
      </Accordion.Root>
    </div>
  );
}
