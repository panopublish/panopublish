import React, { useState, useEffect, useRef } from "react";

// In-memory cache of already-loaded image URLs to prevent flicker on re-renders
const loadedUrlsCache = new Set<string>();

interface LazyThumbnailProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt?: string;
  className?: string;
  aspectRatio?: string;
  fallbackIcon?: React.ReactNode;
}

export function LazyThumbnail({
  src,
  alt = "",
  className = "",
  aspectRatio = "aspect-square",
  fallbackIcon,
  ...props
}: LazyThumbnailProps) {
  const [isInView, setIsInView] = useState(() => loadedUrlsCache.has(src));
  const [isLoaded, setIsLoaded] = useState(() => loadedUrlsCache.has(src));
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loadedUrlsCache.has(src)) {
      setIsInView(true);
      setIsLoaded(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "150px 0px", // Preload slightly before scrolling into view
        threshold: 0.01,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [src]);

  const handleLoad = () => {
    loadedUrlsCache.add(src);
    setIsLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden bg-slate-100 dark:bg-slate-800 ${aspectRatio}`}
    >
      {/* Loading Skeleton */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-slate-200 dark:bg-slate-700 animate-pulse flex items-center justify-center">
          <div className="w-4 h-4 rounded-full border-2 border-slate-400 border-t-transparent animate-spin opacity-40" />
        </div>
      )}

      {/* Error Fallback */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-400 text-xs font-medium">
          {fallbackIcon || "Scene"}
        </div>
      )}

      {/* Lazy-loaded Image */}
      {isInView && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          // @ts-ignore
          fetchpriority="low"
          onLoad={handleLoad}
          onError={handleError}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? "opacity-100" : "opacity-0"
          } ${className}`}
          {...props}
        />
      )}
    </div>
  );
}
