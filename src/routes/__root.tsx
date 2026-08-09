import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { HelmetProvider } from "react-helmet-async";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "author", content: "PanoPublish" },
      { name: "application-name", content: "PanoPublish" },
      { name: "theme-color", content: "#0F172A" },
      { name: "apple-mobile-web-app-title", content: "PanoPublish" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "robots", content: "index, follow" },
      { name: "google-site-verification", content: "google8601514a32a20709" },
    ],
    links: [
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "shortcut icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
      { rel: "stylesheet", href: appCss },
      // Performance hints — Pannellum/Marzipano CDN moved to tour-specific routes only
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "dns-prefetch", href: "https://fonts.googleapis.com" },
      { rel: "dns-prefetch", href: "https://fonts.gstatic.com" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

import { getEnv } from "@/lib/env";

function RootShell({ children }: { children: React.ReactNode }) {
  const isServer = import.meta.env.SSR;
  const envScript = isServer
    ? `
    window.ENV = {
      VITE_SUPABASE_URL: ${JSON.stringify(getEnv("VITE_SUPABASE_URL") || getEnv("SUPABASE_URL"))},
      VITE_SUPABASE_PUBLISHABLE_KEY: ${JSON.stringify(getEnv("VITE_SUPABASE_PUBLISHABLE_KEY") || getEnv("SUPABASE_PUBLISHABLE_KEY"))},
      VITE_GOOGLE_MAPS_API_KEY: ${JSON.stringify(getEnv("VITE_GOOGLE_MAPS_API_KEY"))},
      VITE_GOOGLE_CLIENT_ID: ${JSON.stringify(getEnv("VITE_GOOGLE_CLIENT_ID"))},
      VITE_RAZORPAY_KEY_ID: ${JSON.stringify(getEnv("VITE_RAZORPAY_KEY_ID"))}
    };
    Object.defineProperty(window, 'PanoViewer', { get: function() { return window.Marzipano; }, configurable: true });
  `
    : "";

  return (
    <html lang="en">
      <head>
        <HeadContent />
        {/* Google Analytics — async so it never blocks rendering */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-LQ2MM2T7DK" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-LQ2MM2T7DK');
            `,
          }}
        />
        {/* Microsoft Clarity is injected after hydration via RootComponent useEffect — see below */}
        <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: envScript }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth";
import { useEffect } from "react";

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  // Inject Microsoft Clarity after hydration — non-blocking, does not affect LCP/FID
  useEffect(() => {
    if (typeof window === "undefined") return;
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://www.clarity.ms/tag/xpxuhvf616";
    document.head.appendChild(s);
    (window as any).clarity =
      (window as any).clarity ||
      function (...args: unknown[]) {
        ((window as any).clarity.q = (window as any).clarity.q || []).push(args);
      };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <AuthProvider>
          <Outlet />
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
}
