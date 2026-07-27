// src/components/AuthorByline.tsx
// Reusable author byline: avatar + name + title, links to /authors/:slug
// Uses native <a> tags instead of TanStack Link to avoid route-type circular deps.

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Pencil } from "lucide-react";

interface AuthorBylineProps {
  authorSlug: string;
  authorName: string;
  authorTitle?: string;
  authorPhotoUrl?: string | null;
  datePublished?: string;
  dateModified?: string;
  size?: "sm" | "md";
}

function formatDisplayDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AuthorByline({
  authorSlug,
  authorName,
  authorTitle,
  authorPhotoUrl,
  datePublished,
  dateModified,
  size = "md",
}: AuthorBylineProps) {
  const isSmall = size === "sm";
  const authorHref = `/authors/${authorSlug}`;

  return (
    <div className={`flex items-center ${isSmall ? "gap-2.5" : "gap-3"}`}>
      {/* Avatar */}
      <a
        href={authorHref}
        aria-label={`View author profile: ${authorName}`}
        className="shrink-0 ring-2 ring-primary/20 rounded-full hover:ring-primary/50 transition-all"
      >
        <Avatar className={isSmall ? "h-8 w-8" : "h-10 w-10"}>
          {authorPhotoUrl && (
            <AvatarImage src={authorPhotoUrl} alt={authorName} />
          )}
          <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
            {getInitials(authorName)}
          </AvatarFallback>
        </Avatar>
      </a>

      {/* Name + title + dates */}
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <a
            href={authorHref}
            className={`font-semibold text-foreground hover:text-primary transition-colors leading-tight ${
              isSmall ? "text-xs" : "text-sm"
            }`}
          >
            {authorName}
          </a>
          {authorTitle && (
            <span
              className={`text-muted-foreground ${isSmall ? "text-[10px]" : "text-xs"} hidden sm:block`}
            >
              · {authorTitle}
            </span>
          )}
        </div>

        {/* Dates row */}
        {(datePublished || dateModified) && (
          <div className="flex items-center gap-3 flex-wrap">
            {datePublished && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <time dateTime={datePublished}>
                  {formatDisplayDate(datePublished)}
                </time>
              </span>
            )}
            {dateModified && dateModified !== datePublished && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Pencil className="h-3 w-3" />
                Updated{" "}
                <time dateTime={dateModified}>
                  {formatDisplayDate(dateModified)}
                </time>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
