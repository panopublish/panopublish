import { cn } from "@/lib/utils";

export function Logo({ 
  className, 
  iconOnly = false,
  logoClassName
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
        className={cn("h-8 w-8 text-primary", logoClassName)}
      >
        <defs>
          <mask id="comp-logo-mask">
            <rect x="0" y="0" width="100" height="100" fill="white" />
            <path d="M 20,10 L 39,10 L 50,70 L 61,10 L 80,10 L 58,86 L 42,86 Z" fill="black" stroke="black" stroke-width="8" stroke-linejoin="miter" stroke-linecap="square" />
          </mask>
        </defs>
        <circle cx="50" cy="50" r="38" stroke="currentColor" strokeWidth="9" fill="none" mask="url(#comp-logo-mask)" />
        <path d="M 20,10 L 39,10 L 50,70 L 61,10 L 80,10 L 58,86 L 42,86 Z" fill="currentColor" />
      </svg>
      {!iconOnly && (
        <span className="font-bold tracking-tight text-foreground">
          TourVista
        </span>
      )}
    </div>
  );
}
