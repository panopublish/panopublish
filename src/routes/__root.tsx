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
      { title: "PanoPublish — Google Street View Publishing for Indian Businesses" },
      {
        name: "description",
        content:
          "Publish 360° virtual tours to Google Maps & Street View in minutes. SaaS built for photographers, agencies, hotels, and real estate in India. Start free!",
      },
      { name: "author", content: "PanoPublish" },
      { name: "application-name", content: "PanoPublish" },
      { name: "theme-color", content: "#0F172A" },
      { name: "apple-mobile-web-app-title", content: "PanoPublish" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "robots", content: "index, follow" },
      {
        property: "og:title",
        content: "PanoPublish — Google Street View Publishing for Indian Businesses",
      },
      {
        property: "og:description",
        content:
          "Publish 360° virtual tours to Google Maps & Street View in minutes. SaaS built for photographers, agencies, hotels, and real estate in India. Start free!",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "PanoPublish" },
      { property: "og:url", content: "https://panopublish.com" },
      { property: "og:image", content: "https://panopublish.com/og-image.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@PanoPublish" },
      {
        name: "twitter:title",
        content: "PanoPublish — Google Street View Publishing for Indian Businesses",
      },
      {
        name: "twitter:description",
        content:
          "Publish 360° virtual tours to Google Maps & Street View in minutes. SaaS built for photographers, agencies, hotels, and real estate in India. Start free!",
      },
      { name: "twitter:image", content: "https://panopublish.com/og-image.png" },
      { name: "google-site-verification", content: "google8601514a32a20709" },
    ],
    links: [
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "shortcut icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      {
        rel: "stylesheet",
        href: "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css",
      },
      // Performance hints
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "preconnect", href: "https://cdn.jsdelivr.net" },
      { rel: "dns-prefetch", href: "https://fonts.googleapis.com" },
      { rel: "dns-prefetch", href: "https://fonts.gstatic.com" },
      { rel: "dns-prefetch", href: "https://cdn.jsdelivr.net" },
    ],
    scripts: [
      { src: "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js", defer: true },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  const isServer = import.meta.env.SSR;
  const envScript = isServer
    ? `
    window.ENV = {
      VITE_SUPABASE_URL: ${JSON.stringify(globalThis.process?.env?.VITE_SUPABASE_URL || globalThis.process?.env?.SUPABASE_URL)},
      VITE_SUPABASE_PUBLISHABLE_KEY: ${JSON.stringify(globalThis.process?.env?.VITE_SUPABASE_PUBLISHABLE_KEY || globalThis.process?.env?.SUPABASE_PUBLISHABLE_KEY)},
      VITE_GOOGLE_MAPS_API_KEY: ${JSON.stringify(globalThis.process?.env?.VITE_GOOGLE_MAPS_API_KEY)},
      VITE_GOOGLE_CLIENT_ID: ${JSON.stringify(globalThis.process?.env?.VITE_GOOGLE_CLIENT_ID)},
      VITE_RAZORPAY_KEY_ID: ${JSON.stringify(globalThis.process?.env?.VITE_RAZORPAY_KEY_ID)}
    };
  `
    : "";

  return (
    <html lang="en">
      <head>
        <HeadContent />
        {/* Google tag (gtag.js) */}
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
        {/* Microsoft Clarity */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(c,l,a,r,i,t,y){
                  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "xpxuhvf616");
            `,
          }}
        />
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

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

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
