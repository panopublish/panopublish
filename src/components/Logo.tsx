import { cn } from "@/lib/utils";

export function Logo({
  className,
  iconOnly = false,
  logoClassName,
}: {
  className?: string;
  iconOnly?: boolean;
  logoClassName?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2 select-none", className)}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 100 100"
        className={cn("h-8 w-8", logoClassName)}
      >
        <defs>
          <linearGradient id="pano-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="100" height="100" rx="24" fill="url(#pano-logo-grad)" />
        <text
          x="50"
          y="68"
          fontFamily="Georgia, serif"
          fontWeight="bold"
          fontSize="52"
          fill="white"
          textAnchor="middle"
        >
          P°
        </text>
      </svg>
      {!iconOnly && (
        <span className="font-bold tracking-tight font-serif text-xl text-foreground">
          Pano<span className="text-[#38BDF8]">Publish</span>
        </span>
      )}
    </div>
  );
}
